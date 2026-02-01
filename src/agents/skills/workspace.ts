import {
  formatSkillsForPrompt,
  loadSkillsFromDir,
  type Skill,
} from "@mariozechner/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { SkillsSecurityConfig } from "../../config/types.skills.js";
import type {
  ParsedSkillFrontmatter,
  PermissionRiskLevel,
  SkillEligibilityContext,
  SkillCommandSpec,
  SkillEntry,
  SkillEntryWithPermissions,
  SkillSnapshot,
  SecurityFilterResult,
} from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { CONFIG_DIR, resolveUserPath } from "../../utils.js";
import { resolveBundledSkillsDir } from "./bundled-dir.js";
import { shouldIncludeSkill } from "./config.js";
import {
  parseFrontmatter,
  parsePermissionManifest,
  resolveOpenClawMetadata,
  resolveSkillInvocationPolicy,
} from "./frontmatter.js";
import { validatePermissionManifest } from "./permissions.js";
import { resolvePluginSkillDirs } from "./plugin-skills.js";
import { serializeByKey } from "./serialize.js";

const fsp = fs.promises;
const skillsLogger = createSubsystemLogger("skills");
const skillCommandDebugOnce = new Set<string>();

function debugSkillCommandOnce(
  messageKey: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  if (skillCommandDebugOnce.has(messageKey)) {
    return;
  }
  skillCommandDebugOnce.add(messageKey);
  skillsLogger.debug(message, meta);
}

/**
 * Load approved skill identifiers from a file.
 * Each line in the file is treated as an approved skill name or hash.
 * Lines starting with # are comments, empty lines are ignored.
 */
function loadApprovedSkills(filePath: string | undefined): Set<string> {
  const approved = new Set<string>();
  if (!filePath) {
    return approved;
  }

  try {
    const resolvedPath = resolveUserPath(filePath);
    if (!fs.existsSync(resolvedPath)) {
      skillsLogger.debug(`Approved skills file not found: ${resolvedPath}`);
      return approved;
    }

    const content = fs.readFileSync(resolvedPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      approved.add(trimmed);
    }

    if (approved.size > 0) {
      skillsLogger.debug(`Loaded ${approved.size} approved skill(s) from ${resolvedPath}`);
    }
  } catch (err) {
    skillsLogger.warn(`Failed to load approved skills file: ${filePath}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return approved;
}

/**
 * Check if a skill is in the approved list.
 */
function isSkillApproved(skillName: string, approved: Set<string>): boolean {
  return approved.has(skillName);
}

function filterSkillEntries(
  entries: SkillEntry[],
  config?: OpenClawConfig,
  skillFilter?: string[],
  eligibility?: SkillEligibilityContext,
): SkillEntry[] {
  let filtered = entries.filter((entry) => shouldIncludeSkill({ entry, config, eligibility }));
  // If skillFilter is provided, only include skills in the filter list.
  if (skillFilter !== undefined) {
    const normalized = skillFilter.map((entry) => String(entry).trim()).filter(Boolean);
    const label = normalized.length > 0 ? normalized.join(", ") : "(none)";
    console.log(`[skills] Applying skill filter: ${label}`);
    filtered =
      normalized.length > 0
        ? filtered.filter((entry) => normalized.includes(entry.skill.name))
        : [];
    console.log(`[skills] After filter: ${filtered.map((entry) => entry.skill.name).join(", ")}`);
  }
  return filtered;
}

// Track whether we've shown the deprecation notice this session
let shownDeprecationNotice = false;

/**
 * Risk level ordering for comparison.
 */
const RISK_LEVEL_ORDER: PermissionRiskLevel[] = ["minimal", "low", "moderate", "high", "critical"];

/**
 * Parse permissions and validate for a skill entry.
 * Returns an extended entry with permission information.
 */
function enrichWithPermissions(entry: SkillEntry): SkillEntryWithPermissions {
  const permissions = parsePermissionManifest(entry.frontmatter);
  const permissionValidation = validatePermissionManifest(permissions, entry.skill.name);

  return {
    ...entry,
    permissions,
    permissionValidation,
  };
}

/**
 * Apply security policy filtering to skill entries.
 * This filters out skills that don't meet the security requirements.
 *
 * IMPORTANT: This is an advisory system. Skills declare their intended permissions,
 * but this cannot enforce actual runtime behavior. The goal is transparency and
 * informed consent, not mechanical sandboxing.
 *
 * Policy modes:
 * - "allow": Allow all skills, only log warnings for high-risk skills
 * - "warn": Allow all skills but log warnings for missing manifests and high-risk skills
 * - "prompt": Block skills without manifests or above risk threshold until user approves
 * - "deny": Block skills without manifests or above risk threshold
 *
 * @returns SecurityFilterResult with allowed, denied, and needsPrompt skills
 */
function filterBySecurityPolicy(
  entries: SkillEntryWithPermissions[],
  securityConfig?: SkillsSecurityConfig,
): SecurityFilterResult {
  const requireManifest = securityConfig?.requireManifest ?? "warn";
  const maxAutoLoadRisk = securityConfig?.maxAutoLoadRisk ?? "moderate";
  const maxRiskIndex = RISK_LEVEL_ORDER.indexOf(maxAutoLoadRisk);
  const logViolations = securityConfig?.logViolations !== false; // default true

  // Load approved skills file
  const approvedSkills = loadApprovedSkills(securityConfig?.approvedSkillsFile);

  const result: SecurityFilterResult = {
    allowed: [],
    denied: [],
    needsPrompt: [],
  };

  // Track for summary logging
  const noManifestSkills: string[] = [];
  const highRiskSkills: Array<{ name: string; level: PermissionRiskLevel }> = [];

  for (const entry of entries) {
    const skillName = entry.skill.name;
    const validation = entry.permissionValidation;
    const riskLevel = validation?.risk_level ?? "high"; // Skills without validation are high risk
    const skillRiskIndex = RISK_LEVEL_ORDER.indexOf(riskLevel);
    const exceedsRiskThreshold = skillRiskIndex > maxRiskIndex;

    // Check if skill is pre-approved (bypasses all checks)
    if (isSkillApproved(skillName, approvedSkills)) {
      skillsLogger.debug(`Skill "${skillName}" is pre-approved, bypassing security checks`);
      result.allowed.push(entry);
      continue;
    }

    // Track skills without manifests
    if (!entry.permissions) {
      noManifestSkills.push(skillName);
    }

    // Track high-risk skills
    if (exceedsRiskThreshold) {
      highRiskSkills.push({ name: skillName, level: riskLevel });
    }

    // Apply policy based on mode
    switch (requireManifest) {
      case "deny": {
        // Deny skills without manifests
        if (!entry.permissions) {
          result.denied.push({
            name: skillName,
            reason: "no_manifest_denied",
            details: "Skill has no permission manifest (policy: deny)",
          });
          if (logViolations) {
            skillsLogger.info(`Denied skill "${skillName}": no permission manifest (policy: deny)`);
          }
          continue;
        }
        // Deny skills above risk threshold
        if (exceedsRiskThreshold) {
          result.denied.push({
            name: skillName,
            reason: "risk_exceeds_max",
            riskLevel,
            details: `Skill has ${riskLevel} risk (max: ${maxAutoLoadRisk}, policy: deny)`,
          });
          if (logViolations) {
            skillsLogger.info(
              `Denied skill "${skillName}": risk level ${riskLevel} exceeds ${maxAutoLoadRisk} (policy: deny)`,
            );
          }
          continue;
        }
        // Allow skills that pass checks
        result.allowed.push(entry);
        break;
      }

      case "prompt": {
        // Require confirmation for skills without manifests
        if (!entry.permissions) {
          result.needsPrompt.push({
            name: skillName,
            reason: "no_manifest_needs_prompt",
            riskLevel,
            details: "Skill has no permission manifest and requires confirmation",
          });
          continue;
        }
        // Require confirmation for skills above risk threshold
        if (exceedsRiskThreshold) {
          result.needsPrompt.push({
            name: skillName,
            reason: "risk_exceeds_max",
            riskLevel,
            details: `Skill has ${riskLevel} risk (max auto-load: ${maxAutoLoadRisk})`,
          });
          continue;
        }
        // Allow skills that pass checks
        result.allowed.push(entry);
        break;
      }

      case "allow":
      case "warn":
      default: {
        // Allow all skills, just log warnings
        result.allowed.push(entry);
        break;
      }
    }
  }

  // Log summary for skills without manifests (warn mode only)
  if (noManifestSkills.length > 0 && requireManifest === "warn" && logViolations) {
    skillsLogger.warn(
      `${noManifestSkills.length} skill(s) have no permission manifest: ${noManifestSkills.join(", ")}`,
      { skills: noManifestSkills },
    );

    // Show deprecation notice once per session
    if (!shownDeprecationNotice) {
      shownDeprecationNotice = true;
      skillsLogger.info(
        "Note: A future version of OpenClaw will require explicit approval for skills without " +
          "permission manifests. Run `openclaw skills audit` to review your skills.",
      );
    }
  }

  // Log summary for high-risk skills (warn mode)
  if (highRiskSkills.length > 0 && requireManifest === "warn" && logViolations) {
    for (const { name, level } of highRiskSkills) {
      skillsLogger.warn(
        `Skill "${name}" has ${level} risk level (above ${maxAutoLoadRisk} threshold)`,
        { skillName: name, riskLevel: level, maxAutoLoadRisk },
      );
    }
  }

  return result;
}

const SKILL_COMMAND_MAX_LENGTH = 32;
const SKILL_COMMAND_FALLBACK = "skill";
// Discord command descriptions must be ≤100 characters
const SKILL_COMMAND_DESCRIPTION_MAX_LENGTH = 100;

function sanitizeSkillCommandName(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const trimmed = normalized.slice(0, SKILL_COMMAND_MAX_LENGTH);
  return trimmed || SKILL_COMMAND_FALLBACK;
}

function resolveUniqueSkillCommandName(base: string, used: Set<string>): string {
  const normalizedBase = base.toLowerCase();
  if (!used.has(normalizedBase)) {
    return base;
  }
  for (let index = 2; index < 1000; index += 1) {
    const suffix = `_${index}`;
    const maxBaseLength = Math.max(1, SKILL_COMMAND_MAX_LENGTH - suffix.length);
    const trimmedBase = base.slice(0, maxBaseLength);
    const candidate = `${trimmedBase}${suffix}`;
    const candidateKey = candidate.toLowerCase();
    if (!used.has(candidateKey)) {
      return candidate;
    }
  }
  const fallback = `${base.slice(0, Math.max(1, SKILL_COMMAND_MAX_LENGTH - 2))}_x`;
  return fallback;
}

function loadSkillEntries(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
  },
): SkillEntry[] {
  const loadSkills = (params: { dir: string; source: string }): Skill[] => {
    const loaded = loadSkillsFromDir(params);
    if (Array.isArray(loaded)) {
      return loaded;
    }
    if (
      loaded &&
      typeof loaded === "object" &&
      "skills" in loaded &&
      Array.isArray((loaded as { skills?: unknown }).skills)
    ) {
      return (loaded as { skills: Skill[] }).skills;
    }
    return [];
  };

  const managedSkillsDir = opts?.managedSkillsDir ?? path.join(CONFIG_DIR, "skills");
  const workspaceSkillsDir = path.join(workspaceDir, "skills");
  const bundledSkillsDir = opts?.bundledSkillsDir ?? resolveBundledSkillsDir();
  const extraDirsRaw = opts?.config?.skills?.load?.extraDirs ?? [];
  const extraDirs = extraDirsRaw
    .map((d) => (typeof d === "string" ? d.trim() : ""))
    .filter(Boolean);
  const pluginSkillDirs = resolvePluginSkillDirs({
    workspaceDir,
    config: opts?.config,
  });
  const mergedExtraDirs = [...extraDirs, ...pluginSkillDirs];

  const bundledSkills = bundledSkillsDir
    ? loadSkills({
        dir: bundledSkillsDir,
        source: "openclaw-bundled",
      })
    : [];
  const extraSkills = mergedExtraDirs.flatMap((dir) => {
    const resolved = resolveUserPath(dir);
    return loadSkills({
      dir: resolved,
      source: "openclaw-extra",
    });
  });
  const managedSkills = loadSkills({
    dir: managedSkillsDir,
    source: "openclaw-managed",
  });
  const workspaceSkills = loadSkills({
    dir: workspaceSkillsDir,
    source: "openclaw-workspace",
  });

  const merged = new Map<string, Skill>();
  // Precedence: extra < bundled < managed < workspace
  for (const skill of extraSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of bundledSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of managedSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of workspaceSkills) {
    merged.set(skill.name, skill);
  }

  const skillEntries: SkillEntry[] = Array.from(merged.values()).map((skill) => {
    let frontmatter: ParsedSkillFrontmatter = {};
    try {
      const raw = fs.readFileSync(skill.filePath, "utf-8");
      frontmatter = parseFrontmatter(raw);
    } catch {
      // ignore malformed skills
    }
    return {
      skill,
      frontmatter,
      metadata: resolveOpenClawMetadata(frontmatter),
      invocation: resolveSkillInvocationPolicy(frontmatter),
    };
  });
  return skillEntries;
}

/**
 * Load skill entries with permission validation and security policy filtering.
 *
 * This is the preferred entry point for loading skills as it:
 * 1. Loads all skill entries from configured directories
 * 2. Parses and validates permission manifests
 * 3. Applies security policy filtering based on config
 *
 * Note: Permission manifests are advisory declarations. This system provides
 * transparency about what skills claim to need, but cannot enforce runtime behavior.
 *
 * For CLI prompting (to handle skills that need approval), use loadSkillsWithSecurityResult instead.
 */
function loadSkillEntriesWithSecurity(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
  },
): SkillEntryWithPermissions[] {
  // Load base entries
  const baseEntries = loadSkillEntries(workspaceDir, opts);

  // Enrich with permission information
  const enrichedEntries = baseEntries.map(enrichWithPermissions);

  // Apply security policy filtering
  const securityConfig = opts?.config?.skills?.security;
  const filterResult = filterBySecurityPolicy(enrichedEntries, securityConfig);

  // Return only allowed skills (needsPrompt skills are filtered out in non-interactive contexts)
  return filterResult.allowed;
}

/**
 * Load skills with full security filter result for CLI prompting.
 * This allows the CLI to prompt users for skills that need confirmation.
 */
export function loadSkillsWithSecurityResult(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
  },
): SecurityFilterResult {
  const baseEntries = loadSkillEntries(workspaceDir, opts);
  const enrichedEntries = baseEntries.map(enrichWithPermissions);
  const securityConfig = opts?.config?.skills?.security;
  return filterBySecurityPolicy(enrichedEntries, securityConfig);
}

/**
 * Add skills to the approved skills file.
 * Creates the file if it doesn't exist.
 */
export function approveSkills(
  skillNames: string[],
  approvedSkillsFile: string,
): { added: string[]; alreadyApproved: string[] } {
  const resolvedPath = resolveUserPath(approvedSkillsFile);
  const existing = loadApprovedSkills(approvedSkillsFile);

  const added: string[] = [];
  const alreadyApproved: string[] = [];

  for (const name of skillNames) {
    if (existing.has(name)) {
      alreadyApproved.push(name);
    } else {
      added.push(name);
      existing.add(name);
    }
  }

  if (added.length > 0) {
    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write all approved skills (including newly added)
    const lines = [
      "# Approved skills - these bypass security risk checks",
      "# Add skill names (one per line) to approve them",
      "",
      ...Array.from(existing).sort(),
      "",
    ];
    fs.writeFileSync(resolvedPath, lines.join("\n"), "utf-8");
    skillsLogger.info(`Added ${added.length} skill(s) to approved list: ${added.join(", ")}`);
  }

  return { added, alreadyApproved };
}

export function buildWorkspaceSkillSnapshot(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
    entries?: SkillEntry[];
    /** If provided, only include skills with these names */
    skillFilter?: string[];
    eligibility?: SkillEligibilityContext;
    snapshotVersion?: number;
  },
): SkillSnapshot {
  const skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts);
  const eligible = filterSkillEntries(
    skillEntries,
    opts?.config,
    opts?.skillFilter,
    opts?.eligibility,
  );
  const promptEntries = eligible.filter(
    (entry) => entry.invocation?.disableModelInvocation !== true,
  );
  const resolvedSkills = promptEntries.map((entry) => entry.skill);
  const remoteNote = opts?.eligibility?.remote?.note?.trim();
  const prompt = [remoteNote, formatSkillsForPrompt(resolvedSkills)].filter(Boolean).join("\n");
  return {
    prompt,
    skills: eligible.map((entry) => ({
      name: entry.skill.name,
      primaryEnv: entry.metadata?.primaryEnv,
    })),
    resolvedSkills,
    version: opts?.snapshotVersion,
  };
}

export function buildWorkspaceSkillsPrompt(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
    entries?: SkillEntry[];
    /** If provided, only include skills with these names */
    skillFilter?: string[];
    eligibility?: SkillEligibilityContext;
  },
): string {
  const skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts);
  const eligible = filterSkillEntries(
    skillEntries,
    opts?.config,
    opts?.skillFilter,
    opts?.eligibility,
  );
  const promptEntries = eligible.filter(
    (entry) => entry.invocation?.disableModelInvocation !== true,
  );
  const remoteNote = opts?.eligibility?.remote?.note?.trim();
  return [remoteNote, formatSkillsForPrompt(promptEntries.map((entry) => entry.skill))]
    .filter(Boolean)
    .join("\n");
}

export function resolveSkillsPromptForRun(params: {
  skillsSnapshot?: SkillSnapshot;
  entries?: SkillEntry[];
  config?: OpenClawConfig;
  workspaceDir: string;
}): string {
  const snapshotPrompt = params.skillsSnapshot?.prompt?.trim();
  if (snapshotPrompt) {
    return snapshotPrompt;
  }
  if (params.entries && params.entries.length > 0) {
    const prompt = buildWorkspaceSkillsPrompt(params.workspaceDir, {
      entries: params.entries,
      config: params.config,
    });
    return prompt.trim() ? prompt : "";
  }
  return "";
}

export function loadWorkspaceSkillEntries(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
    /** Skip security policy filtering (returns raw entries). Default: false */
    skipSecurityFilter?: boolean;
  },
): SkillEntryWithPermissions[] {
  if (opts?.skipSecurityFilter) {
    // Return entries with permissions but without security filtering
    const baseEntries = loadSkillEntries(workspaceDir, opts);
    return baseEntries.map(enrichWithPermissions);
  }
  return loadSkillEntriesWithSecurity(workspaceDir, opts);
}

export async function syncSkillsToWorkspace(params: {
  sourceWorkspaceDir: string;
  targetWorkspaceDir: string;
  config?: OpenClawConfig;
  managedSkillsDir?: string;
  bundledSkillsDir?: string;
}) {
  const sourceDir = resolveUserPath(params.sourceWorkspaceDir);
  const targetDir = resolveUserPath(params.targetWorkspaceDir);
  if (sourceDir === targetDir) {
    return;
  }

  await serializeByKey(`syncSkills:${targetDir}`, async () => {
    const targetSkillsDir = path.join(targetDir, "skills");

    const entries = loadSkillEntries(sourceDir, {
      config: params.config,
      managedSkillsDir: params.managedSkillsDir,
      bundledSkillsDir: params.bundledSkillsDir,
    });

    await fsp.rm(targetSkillsDir, { recursive: true, force: true });
    await fsp.mkdir(targetSkillsDir, { recursive: true });

    for (const entry of entries) {
      const dest = path.join(targetSkillsDir, entry.skill.name);
      try {
        await fsp.cp(entry.skill.baseDir, dest, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.warn(`[skills] Failed to copy ${entry.skill.name} to sandbox: ${message}`);
      }
    }
  });
}

export function filterWorkspaceSkillEntries(
  entries: SkillEntry[] | SkillEntryWithPermissions[],
  config?: OpenClawConfig,
): SkillEntryWithPermissions[] {
  // Ensure entries have permission info
  const enriched = entries.map((entry) => {
    if ("permissionValidation" in entry) {
      return entry as SkillEntryWithPermissions;
    }
    return enrichWithPermissions(entry);
  });

  // Apply existing filters
  const filtered = filterSkillEntries(enriched, config);

  // Apply security policy filtering
  const securityConfig = config?.skills?.security;
  const filterResult = filterBySecurityPolicy(
    filtered.map((e) =>
      "permissionValidation" in e ? (e as SkillEntryWithPermissions) : enrichWithPermissions(e),
    ),
    securityConfig,
  );

  // Return only allowed skills (needsPrompt skills are filtered out in non-interactive contexts)
  return filterResult.allowed;
}

export function buildWorkspaceSkillCommandSpecs(
  workspaceDir: string,
  opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
    entries?: SkillEntry[];
    skillFilter?: string[];
    eligibility?: SkillEligibilityContext;
    reservedNames?: Set<string>;
  },
): SkillCommandSpec[] {
  const skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts);
  const eligible = filterSkillEntries(
    skillEntries,
    opts?.config,
    opts?.skillFilter,
    opts?.eligibility,
  );
  const userInvocable = eligible.filter((entry) => entry.invocation?.userInvocable !== false);
  const used = new Set<string>();
  for (const reserved of opts?.reservedNames ?? []) {
    used.add(reserved.toLowerCase());
  }

  const specs: SkillCommandSpec[] = [];
  for (const entry of userInvocable) {
    const rawName = entry.skill.name;
    const base = sanitizeSkillCommandName(rawName);
    if (base !== rawName) {
      debugSkillCommandOnce(
        `sanitize:${rawName}:${base}`,
        `Sanitized skill command name "${rawName}" to "/${base}".`,
        { rawName, sanitized: `/${base}` },
      );
    }
    const unique = resolveUniqueSkillCommandName(base, used);
    if (unique !== base) {
      debugSkillCommandOnce(
        `dedupe:${rawName}:${unique}`,
        `De-duplicated skill command name for "${rawName}" to "/${unique}".`,
        { rawName, deduped: `/${unique}` },
      );
    }
    used.add(unique.toLowerCase());
    const rawDescription = entry.skill.description?.trim() || rawName;
    const description =
      rawDescription.length > SKILL_COMMAND_DESCRIPTION_MAX_LENGTH
        ? rawDescription.slice(0, SKILL_COMMAND_DESCRIPTION_MAX_LENGTH - 1) + "…"
        : rawDescription;
    const dispatch = (() => {
      const kindRaw = (
        entry.frontmatter?.["command-dispatch"] ??
        entry.frontmatter?.["command_dispatch"] ??
        ""
      )
        .trim()
        .toLowerCase();
      if (!kindRaw) {
        return undefined;
      }
      if (kindRaw !== "tool") {
        return undefined;
      }

      const toolName = (
        entry.frontmatter?.["command-tool"] ??
        entry.frontmatter?.["command_tool"] ??
        ""
      ).trim();
      if (!toolName) {
        debugSkillCommandOnce(
          `dispatch:missingTool:${rawName}`,
          `Skill command "/${unique}" requested tool dispatch but did not provide command-tool. Ignoring dispatch.`,
          { skillName: rawName, command: unique },
        );
        return undefined;
      }

      const argModeRaw = (
        entry.frontmatter?.["command-arg-mode"] ??
        entry.frontmatter?.["command_arg_mode"] ??
        ""
      )
        .trim()
        .toLowerCase();
      const argMode = !argModeRaw || argModeRaw === "raw" ? "raw" : null;
      if (!argMode) {
        debugSkillCommandOnce(
          `dispatch:badArgMode:${rawName}:${argModeRaw}`,
          `Skill command "/${unique}" requested tool dispatch but has unknown command-arg-mode. Falling back to raw.`,
          { skillName: rawName, command: unique, argMode: argModeRaw },
        );
      }

      return { kind: "tool", toolName, argMode: "raw" } as const;
    })();

    specs.push({
      name: unique,
      skillName: rawName,
      description,
      ...(dispatch ? { dispatch } : {}),
    });
  }
  return specs;
}

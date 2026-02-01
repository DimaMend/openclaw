import type { Command } from "commander";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadWorkspaceSkillEntries } from "../agents/skills.js";
import { loadConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";
import { runSecurityAudit } from "../security/audit.js";
import { fixSecurityFootguns } from "../security/fix.js";
import {
  scanSkillsForSecurity,
  generateAttestation,
} from "../security/index.js";
import { formatDocsLink } from "../terminal/links.js";
import { isRich, theme } from "../terminal/theme.js";
import { shortenHomeInString, shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

type SecurityAuditOptions = {
  json?: boolean;
  deep?: boolean;
  fix?: boolean;
};

function formatSummary(summary: { critical: number; warn: number; info: number }): string {
  const rich = isRich();
  const c = summary.critical;
  const w = summary.warn;
  const i = summary.info;
  const parts: string[] = [];
  parts.push(rich ? theme.error(`${c} critical`) : `${c} critical`);
  parts.push(rich ? theme.warn(`${w} warn`) : `${w} warn`);
  parts.push(rich ? theme.muted(`${i} info`) : `${i} info`);
  return parts.join(" · ");
}

export function registerSecurityCli(program: Command) {
  const security = program
    .command("security")
    .description("Security tools (audit)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/security", "docs.openclaw.ai/cli/security")}\n`,
    );

  security
    .command("audit")
    .description("Audit config + local state for common security foot-guns")
    .option("--deep", "Attempt live Gateway probe (best-effort)", false)
    .option("--fix", "Apply safe fixes (tighten defaults + chmod state/config)", false)
    .option("--json", "Print JSON", false)
    .action(async (opts: SecurityAuditOptions) => {
      const fixResult = opts.fix ? await fixSecurityFootguns().catch((_err) => null) : null;

      const cfg = loadConfig();
      const report = await runSecurityAudit({
        config: cfg,
        deep: Boolean(opts.deep),
        includeFilesystem: true,
        includeChannelSecurity: true,
      });

      if (opts.json) {
        defaultRuntime.log(
          JSON.stringify(fixResult ? { fix: fixResult, report } : report, null, 2),
        );
        return;
      }

      const rich = isRich();
      const heading = (text: string) => (rich ? theme.heading(text) : text);
      const muted = (text: string) => (rich ? theme.muted(text) : text);

      const lines: string[] = [];
      lines.push(heading("OpenClaw security audit"));
      lines.push(muted(`Summary: ${formatSummary(report.summary)}`));
      lines.push(muted(`Run deeper: ${formatCliCommand("openclaw security audit --deep")}`));

      if (opts.fix) {
        lines.push(muted(`Fix: ${formatCliCommand("openclaw security audit --fix")}`));
        if (!fixResult) {
          lines.push(muted("Fixes: failed to apply (unexpected error)"));
        } else if (
          fixResult.errors.length === 0 &&
          fixResult.changes.length === 0 &&
          fixResult.actions.every((a) => !a.ok)
        ) {
          lines.push(muted("Fixes: no changes applied"));
        } else {
          lines.push("");
          lines.push(heading("FIX"));
          for (const change of fixResult.changes) {
            lines.push(muted(`  ${shortenHomeInString(change)}`));
          }
          for (const action of fixResult.actions) {
            if (action.kind === "chmod") {
              const mode = action.mode.toString(8).padStart(3, "0");
              if (action.ok) {
                lines.push(muted(`  chmod ${mode} ${shortenHomePath(action.path)}`));
              } else if (action.skipped) {
                lines.push(
                  muted(`  skip chmod ${mode} ${shortenHomePath(action.path)} (${action.skipped})`),
                );
              } else if (action.error) {
                lines.push(
                  muted(`  chmod ${mode} ${shortenHomePath(action.path)} failed: ${action.error}`),
                );
              }
              continue;
            }
            const command = shortenHomeInString(action.command);
            if (action.ok) {
              lines.push(muted(`  ${command}`));
            } else if (action.skipped) {
              lines.push(muted(`  skip ${command} (${action.skipped})`));
            } else if (action.error) {
              lines.push(muted(`  ${command} failed: ${action.error}`));
            }
          }
          if (fixResult.errors.length > 0) {
            for (const err of fixResult.errors) {
              lines.push(muted(`  error: ${shortenHomeInString(err)}`));
            }
          }
        }
      }

      const bySeverity = (sev: "critical" | "warn" | "info") =>
        report.findings.filter((f) => f.severity === sev);

      const render = (sev: "critical" | "warn" | "info") => {
        const list = bySeverity(sev);
        if (list.length === 0) {
          return;
        }
        const label =
          sev === "critical"
            ? rich
              ? theme.error("CRITICAL")
              : "CRITICAL"
            : sev === "warn"
              ? rich
                ? theme.warn("WARN")
                : "WARN"
              : rich
                ? theme.muted("INFO")
                : "INFO";
        lines.push("");
        lines.push(heading(label));
        for (const f of list) {
          lines.push(`${theme.muted(f.checkId)} ${f.title}`);
          lines.push(`  ${f.detail}`);
          if (f.remediation?.trim()) {
            lines.push(`  ${muted(`Fix: ${f.remediation.trim()}`)}`);
          }
        }
      };

      render("critical");
      render("warn");
      render("info");

      defaultRuntime.log(lines.join("\n"));
    });

  security
    .command("scan")
    .description("Scan loaded skills for security vulnerabilities")
    .option("--json", "Print JSON output", false)
    .option("--details", "Include full findings details", false)
    .option("--attest", "Generate signed attestation", false)
    .action(async (opts: { json?: boolean; details?: boolean; attest?: boolean }) => {
      const cfg = loadConfig();
      const agentId = resolveDefaultAgentId(cfg);
      const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
      const entries = loadWorkspaceSkillEntries(workspaceDir, { config: cfg });

      if (entries.length === 0) {
        if (opts.json) {
          defaultRuntime.log(JSON.stringify({ skills: [], message: "No skills loaded" }, null, 2));
        } else {
          defaultRuntime.log(theme.muted("No skills loaded"));
        }
        return;
      }

      defaultRuntime.log(theme.muted(`Scanning ${entries.length} skill(s)...`));

      const report = await scanSkillsForSecurity(entries);

      if (opts.attest) {
        const attestation = generateAttestation(report, {
          agentId,
          secretKey: process.env.OPENCLAW_ATTESTATION_SECRET,
        });
        defaultRuntime.log(JSON.stringify(attestation, null, 2));
        return;
      }

      if (opts.json) {
        const output = opts.details
          ? report
          : {
              skills: report.skills.map((s) => ({
                name: s.name,
                riskScore: s.scanResult.riskScore,
                riskLevel: s.scanResult.riskLevel,
                findingsCount: s.scanResult.findings.length,
              })),
              overallRiskScore: report.overallRiskScore,
              overallRiskLevel: report.overallRiskLevel,
            };
        defaultRuntime.log(JSON.stringify(output, null, 2));
        return;
      }

      // Pretty print
      const rich = isRich();
      const lines: string[] = [];
      lines.push(theme.heading("Skill Security Scan"));
      lines.push("");

      for (const skill of report.skills) {
        const result = skill.scanResult;
        const riskColor =
          result.riskLevel === "CRITICAL" || result.riskLevel === "HIGH"
            ? theme.error
            : result.riskLevel === "MEDIUM"
              ? theme.warn
              : theme.success;

        lines.push(
          `${theme.command(skill.name)} ${riskColor(`[${result.riskLevel}]`)} Score: ${result.riskScore}/100`,
        );

        if (opts.details && result.findings.length > 0) {
          for (const finding of result.findings) {
            const sevColor =
              finding.severity === "CRITICAL"
                ? theme.error
                : finding.severity === "HIGH"
                  ? theme.error
                  : finding.severity === "MEDIUM"
                    ? theme.warn
                    : theme.muted;
            lines.push(`  ${sevColor(`[${finding.severity}]`)} ${finding.title}`);
            lines.push(`    ${theme.muted(finding.file)}:${finding.line}`);
          }
        } else if (result.findings.length > 0) {
          lines.push(
            `  ${theme.muted(`${result.summary.critical} critical, ${result.summary.high} high, ${result.summary.medium} medium`)}`,
          );
        }
      }

      lines.push("");
      const overallColor =
        report.overallRiskLevel === "CRITICAL" || report.overallRiskLevel === "HIGH"
          ? theme.error
          : report.overallRiskLevel === "MEDIUM"
            ? theme.warn
            : theme.success;
      lines.push(
        `${theme.heading("Overall:")} ${overallColor(`[${report.overallRiskLevel}]`)} Score: ${report.overallRiskScore}/100`,
      );

      if (report.overallRiskLevel !== "SAFE") {
        lines.push("");
        lines.push(theme.muted("Run with --details to see all findings"));
        lines.push(theme.muted("Run with --attest to generate signed attestation"));
      }

      defaultRuntime.log(lines.join("\n"));
    });
}

/**
 * Skills configuration type definitions
 */

// ─── Skill install option ──────────────────────────────────────

export type SkillInstallOption = {
  id: string;
  kind: "brew" | "node" | "go" | "uv" | "download";
  label: string;
  bins: string[];
};

// ─── Skill status entry ────────────────────────────────────────

export type SkillStatusEntry = {
  name: string;
  description: string;
  source: string;
  filePath: string;
  baseDir: string;
  skillKey: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  missing: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  configChecks: Array<{
    path: string;
    value: unknown;
    satisfied: boolean;
  }>;
  install: SkillInstallOption[];
};

// ─── Skill status report ───────────────────────────────────────

export type SkillStatusReport = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: SkillStatusEntry[];
};

// ─── Single skill config ───────────────────────────────────────

export type SkillEntryConfig = {
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
  config?: Record<string, unknown>;
};

// ─── Skills load config ────────────────────────────────────────

export type SkillsLoadConfig = {
  extraDirs?: string[];
  watch?: boolean;
  watchDebounceMs?: number;
};

// ─── Skills install config ─────────────────────────────────────

export type SkillsInstallConfig = {
  preferBrew?: boolean;
  nodeManager?: "npm" | "pnpm" | "yarn" | "bun";
};

// ─── Full skills config ────────────────────────────────────────

export type SkillsConfig = {
  allowBundled?: string[];
  load?: SkillsLoadConfig;
  install?: SkillsInstallConfig;
  entries?: Record<string, SkillEntryConfig>;
};

// ─── Skill edit state ──────────────────────────────────────────

export type SkillEditState = {
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
  config?: Record<string, unknown>;
  inAllowlist?: boolean;
};

// ─── Skill message ─────────────────────────────────────────────────

export type SkillMessage = {
  kind: "success" | "error";
  message: string;
};

// ─── Filter types ──────────────────────────────────────────────────

export type SkillSourceFilter = "all" | "bundled" | "managed" | "workspace";
export type SkillStatusFilter = "all" | "eligible" | "blocked" | "disabled";

// ─── Skill group ───────────────────────────────────────────────────

export type SkillGroup = {
  id: string;
  label: string;
  skills: SkillStatusEntry[];
};

// ─── Skill file source ─────────────────────────────────────────

/**
 * Editable skill sources (only managed and workspace are editable)
 */
export type EditableSkillSource = "managed" | "workspace";

// ─── Skill file info ───────────────────────────────────────────

/**
 * Skill file information (from skills.files.list RPC)
 */
export type SkillFileInfo = {
  name: string;              // Skill name
  path: string;              // Full path to SKILL.md
  source: EditableSkillSource; // Source
  exists: boolean;           // Whether file exists
  size: number;              // File size in bytes
  modifiedAt: number | null; // Last modified timestamp
};

/**
 * Result of listing skill files
 */
export type SkillFilesListResult = {
  managedDir: string;        // Managed skills directory
  workspaceDir: string;      // Workspace skills directory
  skills: SkillFileInfo[];   // Skill list
};

// ─── Editor view mode ────────────────────────────────────────

/**
 * Editor view mode
 */
export type SkillEditorMode = "edit" | "preview" | "split";

// ─── Editor state ────────────────────────────────────────────────

/**
 * Skill editor state
 */
export type SkillEditorState = {
  open: boolean;                    // Whether editor is open
  skillKey: string | null;          // Current editing skill key
  skillName: string | null;         // Current editing skill name
  source: EditableSkillSource | null; // Skill source
  content: string;                  // Editor content
  original: string;                 // Original content (for dirty check)
  mode: SkillEditorMode;            // Edit mode
  saving: boolean;                  // Saving
  loading: boolean;                 // Loading
  error: string | null;             // Error message
};

/**
 * Create skill modal state
 */
export type SkillCreateState = {
  open: boolean;                    // Whether modal is open
  name: string;                     // New skill name
  source: EditableSkillSource;      // Create location
  template: string;                 // Template content
  creating: boolean;                // Creating
  error: string | null;             // Error message
  nameError: string | null;         // Name validation error
};

/**
 * Delete skill confirmation state
 */
export type SkillDeleteState = {
  open: boolean;                    // Whether confirmation is open
  skillKey: string | null;          // Skill key to delete
  skillName: string | null;         // Skill name to delete
  source: EditableSkillSource | null; // Skill source
  deleting: boolean;                // Deleting
  error: string | null;             // Error message
};

// ─── Component props ───────────────────────────────────────────────

export type SkillsContentProps = {
  // Loading state
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Data
  report: SkillStatusReport | null;
  config: SkillsConfig | null;
  hasChanges: boolean;

  // UI state
  filter: string;
  sourceFilter: SkillSourceFilter;
  statusFilter: SkillStatusFilter;
  expandedGroups: Set<string>;
  selectedSkill: string | null;
  busySkill: string | null;
  messages: Record<string, SkillMessage>;

  // Allowlist
  allowlistMode: "all" | "whitelist";
  allowlistDraft: Set<string>;

  // Edit state
  edits: Record<string, SkillEditState>;

  // Callbacks
  onRefresh: () => void;
  onSave: () => void;
  onFilterChange: (filter: string) => void;
  onSourceFilterChange: (source: SkillSourceFilter) => void;
  onStatusFilterChange: (status: SkillStatusFilter) => void;
  onGroupToggle: (group: string) => void;
  onSkillSelect: (skillKey: string | null) => void;
  onSkillToggle: (skillKey: string, enabled: boolean) => void;
  onSkillApiKeyChange: (skillKey: string, apiKey: string) => void;
  onSkillApiKeySave: (skillKey: string) => void;
  onAllowlistModeChange: (mode: "all" | "whitelist") => void;
  onAllowlistToggle: (skillKey: string, inList: boolean) => void;
  onInstall: (skillKey: string, name: string, installId: string) => void;
  onGlobalSettingChange: (field: string, value: unknown) => void;
  // Phase 3: Env and config editing
  onSkillEnvChange: (skillKey: string, envKey: string, value: string) => void;
  onSkillEnvRemove: (skillKey: string, envKey: string) => void;
  onSkillConfigChange: (skillKey: string, config: Record<string, unknown>) => void;
  onExtraDirsChange: (dirs: string[]) => void;

  // Phase 5-6: Editor related
  editorState: SkillEditorState;
  createState: SkillCreateState;
  deleteState: SkillDeleteState;

  // Editor callbacks
  onEditorOpen: (skillKey: string, skillName: string, source: EditableSkillSource) => void;
  onEditorClose: () => void;
  onEditorContentChange: (content: string) => void;
  onEditorModeChange: (mode: SkillEditorMode) => void;
  onEditorSave: () => void;

  // Create skill callbacks
  onCreateOpen: (source?: EditableSkillSource) => void;
  onCreateClose: () => void;
  onCreateNameChange: (name: string) => void;
  onCreateSourceChange: (source: EditableSkillSource) => void;
  onCreateConfirm: () => void;

  // Delete skill callbacks
  onDeleteOpen: (skillKey: string, skillName: string, source: EditableSkillSource) => void;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
};

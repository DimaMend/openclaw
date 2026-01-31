/**
 * Permissions Management Content Component
 * Command execution and access control management
 */
import { html, nothing } from "lit";
import { t } from "../i18n";
import type {
  ToolProfileId,
  ToolPolicyConfig,
  ToolsConfig,
  AgentWithTools,
  PermissionsTabId,
  ExecApprovalsTarget,
  ExecApprovalsTargetNode,
} from "../controllers/model-config";

// Type definitions
export type ExecSecurity = "deny" | "allowlist" | "full";
export type ExecAsk = "off" | "on-miss" | "always";

export type ExecApprovalsDefaults = {
  security?: string;
  ask?: string;
  askFallback?: string;
  autoAllowSkills?: boolean;
};

export type ExecApprovalsAllowlistEntry = {
  id?: string;
  pattern: string;
  lastUsedAt?: number;
  lastUsedCommand?: string;
  lastResolvedPath?: string;
};

export type ExecApprovalsAgent = ExecApprovalsDefaults & {
  allowlist?: ExecApprovalsAllowlistEntry[];
};

export type ExecApprovalsFile = {
  version?: number;
  socket?: { path?: string };
  defaults?: ExecApprovalsDefaults;
  agents?: Record<string, ExecApprovalsAgent>;
};

export type ExecApprovalsSnapshot = {
  path: string;
  exists: boolean;
  hash: string;
  file: ExecApprovalsFile;
};

export type AgentOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
};

export type PermissionsContentProps = {
  // Loading states
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  connected: boolean;

  // Tab state
  activeTab: PermissionsTabId;
  onTabChange: (tab: PermissionsTabId) => void;

  // Exec Approvals target selection
  execTarget: ExecApprovalsTarget;
  execTargetNodeId: string | null;
  execTargetNodes: ExecApprovalsTargetNode[];
  onExecTargetChange: (target: ExecApprovalsTarget, nodeId: string | null) => void;

  // Exec Approvals data
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  selectedAgent: string | null;
  agents: AgentOption[];

  // Callback functions
  onLoad: () => void;
  onSave: () => void;
  onSelectAgent: (agentId: string | null) => void;
  onAddAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onAddAllowlistEntry: (agentId: string) => void;
  onRemoveAllowlistEntry: (agentId: string, index: number) => void;

  // Tools permissions data
  toolsConfig: ToolsConfig | null;
  agentToolsConfigs: AgentWithTools[];
  toolsAgents: AgentOption[];
  toolsSelectedAgent: string | null;
  toolsExpanded: boolean;

  // Tools permissions callbacks
  onToolsSelectAgent: (agentId: string | null) => void;
  onToolsToggleExpanded: () => void;
  onToolsUpdateGlobal: (field: keyof ToolPolicyConfig, value: unknown) => void;
  onToolsUpdateAgent: (agentId: string, field: keyof ToolPolicyConfig, value: unknown) => void;
  onToolsAddGlobalDeny: (entry: string) => void;
  onToolsRemoveGlobalDeny: (entry: string) => void;
  onToolsAddAgentDeny: (agentId: string, entry: string) => void;
  onToolsRemoveAgentDeny: (agentId: string, entry: string) => void;
  onToolsToggleDeny: (tool: string, denied: boolean) => void;
};

// Constants
const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";

function getSecurityOptions(): Array<{ value: ExecSecurity; label: string; description: string }> {
  return [
    { value: "deny", label: t('permissions.security.deny'), description: t('permissions.security.denyDesc') },
    { value: "allowlist", label: t('permissions.security.allowlist'), description: t('permissions.security.allowlistDesc') },
    { value: "full", label: t('permissions.security.full'), description: t('permissions.security.fullDesc') },
  ];
}

function getAskOptions(): Array<{ value: ExecAsk; label: string; description: string }> {
  return [
    { value: "off", label: t('permissions.ask.off'), description: t('permissions.ask.offDesc') },
    { value: "on-miss", label: t('permissions.ask.onMiss'), description: t('permissions.ask.onMissDesc') },
    { value: "always", label: t('permissions.ask.always'), description: t('permissions.ask.alwaysDesc') },
  ];
}

// Tool descriptions using i18n
function getToolDescription(toolId: string): string {
  return t(`permissions.tools.${toolId}.desc`);
}

// Tool group definitions using i18n
function getToolGroups(): Record<string, { label: string; desc: string; tools: string[] }> {
  return {
    "group:fs": { label: t('permissions.toolGroups.fs'), desc: t('permissions.toolGroups.fsDesc'), tools: ["read", "write", "edit", "apply_patch"] },
    "group:runtime": { label: t('permissions.toolGroups.runtime'), desc: t('permissions.toolGroups.runtimeDesc'), tools: ["exec", "process"] },
    "group:web": { label: t('permissions.toolGroups.web'), desc: t('permissions.toolGroups.webDesc'), tools: ["web_search", "web_fetch"] },
    "group:ui": { label: t('permissions.toolGroups.ui'), desc: t('permissions.toolGroups.uiDesc'), tools: ["browser", "canvas"] },
    "group:sessions": { label: t('permissions.toolGroups.sessions'), desc: t('permissions.toolGroups.sessionsDesc'), tools: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"] },
    "group:memory": { label: t('permissions.toolGroups.memory'), desc: t('permissions.toolGroups.memoryDesc'), tools: ["memory_search", "memory_get"] },
    "group:automation": { label: t('permissions.toolGroups.automation'), desc: t('permissions.toolGroups.automationDesc'), tools: ["cron", "gateway"] },
    "group:messaging": { label: t('permissions.toolGroups.messaging'), desc: t('permissions.toolGroups.messagingDesc'), tools: ["message"] },
    "group:nodes": { label: t('permissions.toolGroups.nodes'), desc: t('permissions.toolGroups.nodesDesc'), tools: ["nodes"] },
  };
}

function getStandaloneTools(): Array<{ id: string; label: string }> {
  return [
    { id: "tts", label: t('permissions.standalone.tts') },
    { id: "image", label: t('permissions.standalone.image') },
    { id: "agents_list", label: t('permissions.standalone.agentsList') },
  ];
}

function getToolProfiles(): Array<{ value: ToolProfileId; label: string; description: string }> {
  return [
    { value: "minimal", label: t('permissions.profile.minimal'), description: t('permissions.profile.minimalDesc') },
    { value: "coding", label: t('permissions.profile.coding'), description: t('permissions.profile.codingDesc') },
    { value: "messaging", label: t('permissions.profile.messaging'), description: t('permissions.profile.messagingDesc') },
    { value: "full", label: t('permissions.profile.full'), description: t('permissions.profile.fullDesc') },
  ];
}

const TOOLS_DEFAULT_SCOPE = "__global__";

// Helper functions
function normalizeSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") return value;
  return "deny";
}

function normalizeAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") return value;
  return "on-miss";
}

function resolveDefaults(form: ExecApprovalsFile | null): {
  security: ExecSecurity;
  ask: ExecAsk;
  askFallback: ExecSecurity;
  autoAllowSkills: boolean;
} {
  const defaults = form?.defaults ?? {};
  return {
    security: normalizeSecurity(defaults.security),
    ask: normalizeAsk(defaults.ask),
    askFallback: normalizeSecurity(defaults.askFallback ?? "deny"),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? false),
  };
}

function formatAgo(ts: number | null | undefined): string {
  if (!ts) return t('time.never');
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return t('time.justNow');
  if (diff < 3600000) return t('time.minutesAgo', { count: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('time.hoursAgo', { count: Math.floor(diff / 3600000) });
  return t('time.daysAgo', { count: Math.floor(diff / 86400000) });
}

/**
 * Render permissions management content
 */
export function renderPermissionsContent(props: PermissionsContentProps) {
  return html`
    <div class="permissions-content">
      <!-- Top tab navigation -->
      <div class="permissions-tabs-header">
        <button
          class="permissions-main-tab ${props.activeTab === "exec" ? "permissions-main-tab--active" : ""}"
          @click=${() => props.onTabChange("exec")}
        >
          <span class="permissions-main-tab__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
          </span>
          <span class="permissions-main-tab__text">${t('permissions.exec')}</span>
        </button>
        <button
          class="permissions-main-tab ${props.activeTab === "tools" ? "permissions-main-tab--active" : ""}"
          @click=${() => props.onTabChange("tools")}
        >
          <span class="permissions-main-tab__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </span>
          <span class="permissions-main-tab__text">${t('permissions.tools')}</span>
        </button>
      </div>

      <!-- Content area -->
      ${props.activeTab === "exec"
        ? renderExecPermissionsContent(props)
        : renderToolsPermissionsSection(props)}
    </div>
  `;
}

/**
 * Render execution target selector
 */
function renderExecTargetSection(props: PermissionsContentProps) {
  const isGateway = props.execTarget === "gateway";
  const hasNodes = props.execTargetNodes.length > 0;

  return html`
    <div class="permissions-section permissions-target-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.target')}</h4>
          <p class="permissions-section__desc">
            ${t('permissions.targetDesc')}
          </p>
        </div>
      </div>

      <div class="permissions-target">
        <!-- Target type selection -->
        <div class="permissions-target__type">
          <label class="permissions-target__label">${t('permissions.targetType')}</label>
          <div class="permissions-target__options">
            <label class="permissions-radio">
              <input
                type="radio"
                name="exec-target"
                value="gateway"
                .checked=${isGateway}
                @change=${() => {
                  if (props.dirty) {
                    const confirmed = confirm(t('permissions.unsavedChanges'));
                    if (!confirmed) return;
                  }
                  props.onExecTargetChange("gateway", null);
                }}
              />
              <span class="permissions-radio__mark"></span>
              <span class="permissions-radio__text">${t('permissions.target.gateway')}</span>
            </label>
            <label class="permissions-radio">
              <input
                type="radio"
                name="exec-target"
                value="node"
                .checked=${!isGateway}
                ?disabled=${!hasNodes}
                @change=${() => {
                  if (props.dirty) {
                    const confirmed = confirm(t('permissions.unsavedChanges'));
                    if (!confirmed) return;
                  }
                  const firstNode = props.execTargetNodes[0]?.id ?? null;
                  props.onExecTargetChange("node", firstNode);
                }}
              />
              <span class="permissions-radio__mark"></span>
              <span class="permissions-radio__text">${t('permissions.target.node')}</span>
              ${!hasNodes ? html`<span class="permissions-radio__hint">${t('permissions.noNodesAvailable')}</span>` : nothing}
            </label>
          </div>
        </div>

        <!-- Node selection (only shown in remote node mode) -->
        ${!isGateway
          ? html`
              <div class="permissions-target__node">
                <label class="permissions-target__label">${t('permissions.selectNode')}</label>
                <select
                  class="permissions-select"
                  ?disabled=${props.saving || !hasNodes}
                  @change=${(event: Event) => {
                    const target = event.target as HTMLSelectElement;
                    const nodeId = target.value || null;
                    if (props.dirty) {
                      const confirmed = confirm(t('permissions.unsavedChanges'));
                      if (!confirmed) {
                        target.value = props.execTargetNodeId ?? "";
                        return;
                      }
                    }
                    props.onExecTargetChange("node", nodeId);
                  }}
                >
                  ${props.execTargetNodes.map(
                    (node) =>
                      html`<option value=${node.id} ?selected=${props.execTargetNodeId === node.id}>
                        ${node.label}
                      </option>`,
                  )}
                </select>
              </div>
            `
          : nothing}

        <!-- Target description -->
        <div class="permissions-target__info">
          ${isGateway
            ? html`
                <div class="permissions-info-box">
                  <span class="permissions-info-box__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </span>
                  <span class="permissions-info-box__text">
                    ${t('permissions.gatewayTargetInfo')}
                  </span>
                </div>
              `
            : html`
                <div class="permissions-info-box">
                  <span class="permissions-info-box__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </span>
                  <span class="permissions-info-box__text">
                    ${t('permissions.nodeTargetInfo')}
                  </span>
                </div>
              `}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render command execution permissions content
 */
function renderExecPermissionsContent(props: PermissionsContentProps) {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const ready = Boolean(form);
  const defaults = resolveDefaults(form);
  const selectedScope = props.selectedAgent ?? EXEC_APPROVALS_DEFAULT_SCOPE;
  const isDefaults = selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE;

  return html`
    <!-- Header description -->
    <div class="permissions-header">
      <h3 class="permissions-title">${t('permissions.exec')}</h3>
      <p class="permissions-desc">
        ${t('permissions.execDesc')}
      </p>
    </div>

    <!-- Target selector -->
    ${renderExecTargetSection(props)}

    ${!ready
      ? html`
          <div class="permissions-empty">
            ${props.loading
              ? html`<p>${t('permissions.loadingConfig')}</p>`
              : html`<p>${t('permissions.configLoading')}</p>`}
          </div>
        `
      : html`
          <!-- Agent selector -->
          ${renderAgentSelector(props, selectedScope)}

          <!-- Policy configuration -->
          ${renderPolicySection(props, form, defaults, selectedScope, isDefaults)}

          <!-- Allowlist (only shown for non-default agents) -->
          ${!isDefaults ? renderAllowlistSection(props, form, selectedScope) : nothing}
        `}
  `;
}

/**
 * Render Agent selector
 */
function renderAgentSelector(props: PermissionsContentProps, selectedScope: string) {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const hasWildcard = form?.agents?.["*"] != null;
  const isWildcardSelected = selectedScope === "*";

  return html`
    <div class="permissions-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.scope')}</h4>
          <p class="permissions-section__desc">${t('permissions.agentScopeDesc')}</p>
        </div>
        <div class="permissions-section__actions">
          ${!hasWildcard
            ? html`
                <button
                  class="mc-btn mc-btn--sm"
                  ?disabled=${props.saving}
                  @click=${() => props.onAddAgent("*")}
                  title="${t('permissions.addWildcardTooltip')}"
                >
                  + ${t('permissions.wildcardAgent')}
                </button>
              `
            : nothing}
          <button
            class="mc-btn mc-btn--sm"
            ?disabled=${props.saving}
            @click=${() => {
              const id = prompt(t('permissions.enterAgentId'));
              if (id?.trim()) {
                props.onAddAgent(id.trim());
              }
            }}
          >
            + ${t('permissions.newAgent')}
          </button>
        </div>
      </div>
      <div class="permissions-tabs">
        <button
          class="permissions-tab ${selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE ? "permissions-tab--active" : ""}"
          @click=${() => props.onSelectAgent(null)}
        >
          ${t('permissions.globalDefault')}
        </button>
        ${hasWildcard
          ? html`
              <button
                class="permissions-tab permissions-tab--wildcard ${isWildcardSelected ? "permissions-tab--active" : ""}"
                @click=${() => props.onSelectAgent("*")}
              >
                * ${t('permissions.wildcard')}
                <span class="permissions-tab__badge">${t('permissions.matchAll')}</span>
              </button>
            `
          : nothing}
        ${props.agents
          .filter((agent) => agent.id !== "*")
          .map((agent) => {
            const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
            const isActive = selectedScope === agent.id;
            const hasConfig = form?.agents?.[agent.id] != null;
            return html`
              <button
                class="permissions-tab ${isActive ? "permissions-tab--active" : ""}"
                @click=${() => props.onSelectAgent(agent.id)}
              >
                ${label}
                ${agent.isDefault ? html`<span class="permissions-tab__badge">${t('label.default')}</span>` : nothing}
                ${hasConfig && !agent.isDefault
                  ? html`<span class="permissions-tab__badge permissions-tab__badge--config">${t('permissions.configured')}</span>`
                  : nothing}
              </button>
            `;
          })}
      </div>
    </div>
  `;
}

/**
 * Render policy configuration
 */
function renderPolicySection(
  props: PermissionsContentProps,
  form: ExecApprovalsFile | null,
  defaults: ReturnType<typeof resolveDefaults>,
  selectedScope: string,
  isDefaults: boolean,
) {
  const agent = !isDefaults
    ? ((form?.agents ?? {})[selectedScope] as Record<string, unknown> | undefined) ?? {}
    : {};
  const basePath = isDefaults ? ["defaults"] : ["agents", selectedScope];

  const agentSecurity = typeof agent.security === "string" ? agent.security : undefined;
  const agentAsk = typeof agent.ask === "string" ? agent.ask : undefined;
  const agentAskFallback = typeof agent.askFallback === "string" ? agent.askFallback : undefined;

  const securityValue = isDefaults ? defaults.security : agentSecurity ?? "__default__";
  const askValue = isDefaults ? defaults.ask : agentAsk ?? "__default__";
  const askFallbackValue = isDefaults ? defaults.askFallback : agentAskFallback ?? "__default__";

  const autoOverride = typeof agent.autoAllowSkills === "boolean" ? agent.autoAllowSkills : undefined;
  const autoEffective = autoOverride ?? defaults.autoAllowSkills;
  const autoIsDefault = autoOverride == null;

  // Check if agent configuration can be deleted
  const hasAgentConfig = !isDefaults && form?.agents?.[selectedScope] != null;
  const isWildcard = selectedScope === "*";

  return html`
    <div class="permissions-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.securityPolicy')}</h4>
          <p class="permissions-section__desc">
            ${isDefaults
              ? t('permissions.globalPolicyDesc')
              : isWildcard
                ? t('permissions.wildcardPolicyDesc')
                : t('permissions.agentPolicyDesc', { agentId: selectedScope })}
          </p>
        </div>
        ${hasAgentConfig
          ? html`
              <button
                class="mc-btn mc-btn--sm mc-btn--danger"
                ?disabled=${props.saving}
                @click=${() => {
                  if (confirm(t('permissions.confirmDeleteConfig', { target: isWildcard ? t('permissions.wildcard') : selectedScope }))) {
                    props.onRemoveAgent(selectedScope);
                  }
                }}
              >
                ${t('permissions.deleteConfig')}
              </button>
            `
          : nothing}
      </div>

      <div class="permissions-policy-grid">
        <!-- Security Mode -->
        <div class="permissions-policy-item">
          <div class="permissions-policy-item__header">
            <span class="permissions-policy-item__title">${t('permissions.security')}</span>
            <span class="permissions-policy-item__desc">
              ${isDefaults ? t('permissions.defaultSecurityLevel') : t('permissions.defaultLabel', { value: defaults.security })}
            </span>
          </div>
          <select
            class="permissions-select"
            ?disabled=${props.saving}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              const value = target.value;
              if (!isDefaults && value === "__default__") {
                props.onRemove([...basePath, "security"]);
              } else {
                props.onPatch([...basePath, "security"], value);
              }
            }}
          >
            ${!isDefaults
              ? html`<option value="__default__" ?selected=${securityValue === "__default__"}>
                  ${t('permissions.useDefault', { value: defaults.security })}
                </option>`
              : nothing}
            ${getSecurityOptions().map(
              (option) =>
                html`<option value=${option.value} ?selected=${securityValue === option.value}>
                  ${option.label} - ${option.description}
                </option>`,
            )}
          </select>
        </div>

        <!-- User Confirmation -->
        <div class="permissions-policy-item">
          <div class="permissions-policy-item__header">
            <span class="permissions-policy-item__title">${t('permissions.ask')}</span>
            <span class="permissions-policy-item__desc">
              ${isDefaults ? t('permissions.whenToPrompt') : t('permissions.defaultLabel', { value: defaults.ask })}
            </span>
          </div>
          <select
            class="permissions-select"
            ?disabled=${props.saving}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              const value = target.value;
              if (!isDefaults && value === "__default__") {
                props.onRemove([...basePath, "ask"]);
              } else {
                props.onPatch([...basePath, "ask"], value);
              }
            }}
          >
            ${!isDefaults
              ? html`<option value="__default__" ?selected=${askValue === "__default__"}>
                  ${t('permissions.useDefault', { value: defaults.ask })}
                </option>`
              : nothing}
            ${getAskOptions().map(
              (option) =>
                html`<option value=${option.value} ?selected=${askValue === option.value}>
                  ${option.label} - ${option.description}
                </option>`,
            )}
          </select>
        </div>

        <!-- Confirmation Fallback -->
        <div class="permissions-policy-item">
          <div class="permissions-policy-item__header">
            <span class="permissions-policy-item__title">${t('permissions.askFallback')}</span>
            <span class="permissions-policy-item__desc">
              ${isDefaults ? t('permissions.fallbackAction') : t('permissions.defaultLabel', { value: defaults.askFallback })}
            </span>
          </div>
          <select
            class="permissions-select"
            ?disabled=${props.saving}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              const value = target.value;
              if (!isDefaults && value === "__default__") {
                props.onRemove([...basePath, "askFallback"]);
              } else {
                props.onPatch([...basePath, "askFallback"], value);
              }
            }}
          >
            ${!isDefaults
              ? html`<option value="__default__" ?selected=${askFallbackValue === "__default__"}>
                  ${t('permissions.useDefault', { value: defaults.askFallback })}
                </option>`
              : nothing}
            ${getSecurityOptions().map(
              (option) =>
                html`<option value=${option.value} ?selected=${askFallbackValue === option.value}>
                  ${option.label}
                </option>`,
            )}
          </select>
        </div>

        <!-- Auto-allow Skill CLI -->
        <div class="permissions-policy-item">
          <div class="permissions-policy-item__header">
            <span class="permissions-policy-item__title">${t('permissions.autoAllowSkills')}</span>
            <span class="permissions-policy-item__desc">
              ${isDefaults
                ? t('permissions.autoAllowSkillsDesc')
                : autoIsDefault
                  ? t('permissions.useDefault', { value: defaults.autoAllowSkills ? t('label.enabled') : t('permissions.ask.off')})
                  : t('permissions.overrideLabel', { value: autoEffective ? t('label.enabled') : t('permissions.ask.off')})}
            </span>
          </div>
          <div class="permissions-checkbox-row">
            <label class="permissions-checkbox">
              <input
                type="checkbox"
                ?disabled=${props.saving}
                .checked=${autoEffective}
                @change=${(event: Event) => {
                  const target = event.target as HTMLInputElement;
                  props.onPatch([...basePath, "autoAllowSkills"], target.checked);
                }}
              />
              <span>${t('action.enable')}</span>
            </label>
            ${!isDefaults && !autoIsDefault
              ? html`
                  <button
                    class="mc-btn mc-btn--sm"
                    ?disabled=${props.saving}
                    @click=${() => props.onRemove([...basePath, "autoAllowSkills"])}
                  >
                    ${t('permissions.useDefaultButton')}
                  </button>
                `
              : nothing}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render allowlist section
 */
function renderAllowlistSection(
  props: PermissionsContentProps,
  form: ExecApprovalsFile | null,
  selectedScope: string,
) {
  const agent = (form?.agents ?? {})[selectedScope] as ExecApprovalsAgent | undefined;
  const allowlist = Array.isArray(agent?.allowlist) ? agent.allowlist : [];

  return html`
    <div class="permissions-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.allowlist')}</h4>
          <p class="permissions-section__desc">
            ${t('permissions.allowlistDesc')}
          </p>
        </div>
        <button
          class="mc-btn mc-btn--sm"
          ?disabled=${props.saving}
          @click=${() => props.onAddAllowlistEntry(selectedScope)}
        >
          ${t('permissions.addRule')}
        </button>
      </div>

      <div class="permissions-allowlist">
        ${allowlist.length === 0
          ? html`
              <div class="permissions-allowlist__empty">
                <p>${t('permissions.noRules')}</p>
                <p class="muted">${t('permissions.noRulesHint')}</p>
              </div>
            `
          : allowlist.map((entry, index) =>
              renderAllowlistEntry(props, entry, selectedScope, index),
            )}
      </div>
    </div>
  `;
}

/**
 * Render allowlist entry
 */
function renderAllowlistEntry(
  props: PermissionsContentProps,
  entry: ExecApprovalsAllowlistEntry,
  selectedScope: string,
  index: number,
) {
  const lastUsed = formatAgo(entry.lastUsedAt);
  const pattern = entry.pattern?.trim() || "";

  return html`
    <div class="permissions-allowlist__item">
      <div class="permissions-allowlist__item-main">
        <div class="permissions-allowlist__item-pattern">
          <input
            type="text"
            class="permissions-input"
            placeholder="${t('permissions.patternPlaceholder')}"
            .value=${pattern}
            ?disabled=${props.saving}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              props.onPatch(
                ["agents", selectedScope, "allowlist", index, "pattern"],
                target.value,
              );
            }}
          />
        </div>
        <div class="permissions-allowlist__item-meta">
          <span class="muted">${t('permissions.lastUsed')}: ${lastUsed}</span>
          ${entry.lastUsedCommand
            ? html`<span class="mono muted" title=${entry.lastUsedCommand}>
                ${entry.lastUsedCommand.length > 50
                  ? entry.lastUsedCommand.slice(0, 50) + "..."
                  : entry.lastUsedCommand}
              </span>`
            : nothing}
        </div>
      </div>
      <div class="permissions-allowlist__item-actions">
        <button
          class="mc-btn mc-btn--sm mc-btn--danger"
          ?disabled=${props.saving}
          @click=${() => props.onRemoveAllowlistEntry(selectedScope, index)}
        >
          ${t('action.delete')}
        </button>
      </div>
    </div>
  `;
}

// ============================================
// Tool permissions management functions
// ============================================

/**
 * Render tools permissions management section
 */
function renderToolsPermissionsSection(props: PermissionsContentProps) {
  const selectedScope = props.toolsSelectedAgent ?? TOOLS_DEFAULT_SCOPE;
  const isGlobal = selectedScope === TOOLS_DEFAULT_SCOPE;

  // Get configuration for the current scope
  const globalConfig = props.toolsConfig ?? {};
  const agentConfig = !isGlobal
    ? props.agentToolsConfigs.find((a) => a.id === selectedScope)?.tools ?? {}
    : {};
  const currentConfig = isGlobal ? globalConfig : agentConfig;

  return html`
    <div class="permissions-header">
      <h3 class="permissions-title">${t('permissions.tools')}</h3>
      <p class="permissions-desc">
        ${t('permissions.toolsSectionDesc')}
      </p>
    </div>

    <!-- Tool scope selector -->
    ${renderToolsScopeSelector(props, selectedScope)}

    <!-- Profile selection -->
    ${renderToolsProfileSection(props, currentConfig, selectedScope, isGlobal, globalConfig)}

    <!-- Tool list (with toggles) -->
    ${renderToolsListSection(props, currentConfig, selectedScope, isGlobal)}
  `;
}

/**
 * Render tools scope selector
 */
function renderToolsScopeSelector(props: PermissionsContentProps, selectedScope: string) {
  return html`
    <div class="permissions-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.scope')}</h4>
          <p class="permissions-section__desc">${t('permissions.agentScopeDesc')}</p>
        </div>
      </div>
      <div class="permissions-tabs">
        <button
          class="permissions-tab ${selectedScope === TOOLS_DEFAULT_SCOPE ? "permissions-tab--active" : ""}"
          @click=${() => props.onToolsSelectAgent(null)}
        >
          ${t('permissions.globalDefault')}
        </button>
        ${props.toolsAgents.map((agent) => {
          const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
          const isActive = selectedScope === agent.id;
          return html`
            <button
              class="permissions-tab ${isActive ? "permissions-tab--active" : ""}"
              @click=${() => props.onToolsSelectAgent(agent.id)}
            >
              ${label}
              ${agent.isDefault ? html`<span class="permissions-tab__badge">${t('label.default')}</span>` : nothing}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

/**
 * Render profile selection
 */
function renderToolsProfileSection(
  props: PermissionsContentProps,
  currentConfig: ToolPolicyConfig,
  selectedScope: string,
  isGlobal: boolean,
  globalConfig: ToolPolicyConfig,
) {
  const profileValue = currentConfig.profile ?? (isGlobal ? undefined : "__default__");
  const globalProfile = globalConfig.profile;

  return html`
    <div class="permissions-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.profile.title')}</h4>
          <p class="permissions-section__desc">
            ${isGlobal
              ? t('permissions.profile.globalDesc')
              : globalProfile
                ? t('permissions.profile.globalProfileLabel', { profile: globalProfile })
                : t('permissions.profile.noGlobalProfile')}
          </p>
        </div>
      </div>
      <div class="permissions-policy-grid">
        <div class="permissions-policy-item">
          <div class="permissions-policy-item__header">
            <span class="permissions-policy-item__title">${t('permissions.profile.toolProfile')}</span>
            <span class="permissions-policy-item__desc">
              ${t('permissions.profile.toolProfileDesc')}
            </span>
          </div>
          <select
            class="permissions-select"
            ?disabled=${props.saving}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              const value = target.value;
              if (isGlobal) {
                props.onToolsUpdateGlobal("profile", value || undefined);
              } else if (value === "__default__") {
                props.onToolsUpdateAgent(selectedScope, "profile", undefined);
              } else {
                props.onToolsUpdateAgent(selectedScope, "profile", value || undefined);
              }
            }}
          >
            ${!isGlobal
              ? html`<option value="__default__" ?selected=${profileValue === "__default__"}>
                  ${t('permissions.profile.useGlobal', { profile: globalProfile ? ` (${globalProfile})` : "" })}
                </option>`
              : html`<option value="" ?selected=${!profileValue}>
                  ${t('permissions.profile.notSet')}
                </option>`}
            ${getToolProfiles().map(
              (profile) =>
                html`<option value=${profile.value} ?selected=${profileValue === profile.value}>
                  ${profile.label} - ${profile.description}
                </option>`,
            )}
          </select>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render tools list (with toggles)
 */
function renderToolsListSection(
  props: PermissionsContentProps,
  currentConfig: ToolPolicyConfig,
  selectedScope: string,
  isGlobal: boolean,
) {
  const denyList = currentConfig.deny ?? [];
  const TOOL_GROUPS = getToolGroups();
  const STANDALONE_TOOLS = getStandaloneTools();
  const totalTools = Object.values(TOOL_GROUPS).reduce(
    (sum, group) => sum + group.tools.length,
    0,
  ) + STANDALONE_TOOLS.length;

  // Check if a tool is denied
  const isToolDenied = (toolId: string): boolean => {
    // Directly denied
    if (denyList.includes(toolId)) return true;
    // Denied via group
    for (const [groupId, group] of Object.entries(TOOL_GROUPS)) {
      if (group.tools.includes(toolId) && denyList.includes(groupId)) {
        return true;
      }
    }
    return false;
  };

  // Check if a group is denied
  const isGroupDenied = (groupId: string): boolean => {
    return denyList.includes(groupId);
  };

  // Toggle tool denial status
  const handleToolToggle = (toolId: string, currentlyDenied: boolean) => {
    if (currentlyDenied) {
      // Enable tool (remove from deny list)
      if (isGlobal) {
        props.onToolsRemoveGlobalDeny(toolId);
      } else {
        props.onToolsRemoveAgentDeny(selectedScope, toolId);
      }
    } else {
      // Disable tool (add to deny list)
      if (isGlobal) {
        props.onToolsAddGlobalDeny(toolId);
      } else {
        props.onToolsAddAgentDeny(selectedScope, toolId);
      }
    }
  };

  // Toggle group denial status
  const handleGroupToggle = (groupId: string, currentlyDenied: boolean) => {
    if (currentlyDenied) {
      if (isGlobal) {
        props.onToolsRemoveGlobalDeny(groupId);
      } else {
        props.onToolsRemoveAgentDeny(selectedScope, groupId);
      }
    } else {
      if (isGlobal) {
        props.onToolsAddGlobalDeny(groupId);
      } else {
        props.onToolsAddAgentDeny(selectedScope, groupId);
      }
    }
  };

  return html`
    <div class="permissions-section">
      <div class="permissions-section__header">
        <div>
          <h4 class="permissions-section__title">${t('permissions.toolList.title')}</h4>
          <p class="permissions-section__desc">
            ${t('permissions.toolList.desc', { count: totalTools })}
          </p>
        </div>
        <button
          class="mc-btn mc-btn--sm"
          @click=${props.onToolsToggleExpanded}
        >
          ${props.toolsExpanded ? t('action.collapse') : t('action.expand')}
        </button>
      </div>

      ${props.toolsExpanded
        ? html`
            <div class="tools-list">
              ${Object.entries(TOOL_GROUPS).map(([groupId, group]) => {
                const groupDenied = isGroupDenied(groupId);
                return html`
                  <div class="tools-group ${groupDenied ? "tools-group--denied" : ""}">
                    <div class="tools-group__header">
                      <div class="tools-group__info">
                        <span class="tools-group__name">${group.label}</span>
                        <span class="tools-group__desc">${group.desc}</span>
                      </div>
                      <div class="tools-group__toggle">
                        <span class="tools-group__count">${t('permissions.toolCount', { count: group.tools.length })}</span>
                        <label class="mc-toggle">
                          <input
                            type="checkbox"
                            .checked=${!groupDenied}
                            ?disabled=${props.saving}
                            @change=${() => handleGroupToggle(groupId, groupDenied)}
                          />
                          <span class="mc-toggle__track"></span>
                        </label>
                      </div>
                    </div>
                    <div class="tools-group__items">
                      ${group.tools.map((toolId) => {
                        const denied = isToolDenied(toolId);
                        const desc = getToolDescription(toolId);
                        return html`
                          <div class="tools-item ${denied ? "tools-item--denied" : ""}">
                            <div class="tools-item__info">
                              <span class="tools-item__name">${toolId}</span>
                              <span class="tools-item__desc">${desc}</span>
                            </div>
                            <label class="mc-toggle mc-toggle--sm">
                              <input
                                type="checkbox"
                                .checked=${!denied}
                                ?disabled=${props.saving || groupDenied}
                                @change=${() => handleToolToggle(toolId, denied)}
                              />
                              <span class="mc-toggle__track"></span>
                            </label>
                          </div>
                        `;
                      })}
                    </div>
                  </div>
                `;
              })}

              <!-- Standalone tools -->
              <div class="tools-group">
                <div class="tools-group__header">
                  <div class="tools-group__info">
                    <span class="tools-group__name">${t('permissions.standaloneTools')}</span>
                    <span class="tools-group__desc">${t('permissions.standaloneToolsDesc')}</span>
                  </div>
                  <div class="tools-group__toggle">
                    <span class="tools-group__count">${t('permissions.toolCount', { count: STANDALONE_TOOLS.length })}</span>
                  </div>
                </div>
                <div class="tools-group__items">
                  ${STANDALONE_TOOLS.map((tool) => {
                    const denied = isToolDenied(tool.id);
                    const desc = getToolDescription(tool.id);
                    return html`
                      <div class="tools-item ${denied ? "tools-item--denied" : ""}">
                        <div class="tools-item__info">
                          <span class="tools-item__name">${tool.id}</span>
                          <span class="tools-item__label">${tool.label}</span>
                          <span class="tools-item__desc">${desc}</span>
                        </div>
                        <label class="mc-toggle mc-toggle--sm">
                          <input
                            type="checkbox"
                            .checked=${!denied}
                            ?disabled=${props.saving}
                            @change=${() => handleToolToggle(tool.id, denied)}
                          />
                          <span class="mc-toggle__track"></span>
                        </label>
                      </div>
                    `;
                  })}
                </div>
              </div>
            </div>
          `
        : nothing}
    </div>
  `;
}

import { html, nothing } from "lit";
import type { GatewaySessionRow, SessionsListResult } from "../types";
import { formatAgo } from "../format";
import { pathForTab } from "../navigation";
import { formatSessionTokens } from "../presenter";
import { t } from "../i18n";

export type SessionsProps = {
  loading: boolean;
  result: SessionsListResult | null;
  error: string | null;
  activeMinutes: string;
  limit: string;
  includeGlobal: boolean;
  includeUnknown: boolean;
  basePath: string;
  onFiltersChange: (next: {
    activeMinutes: string;
    limit: string;
    includeGlobal: boolean;
    includeUnknown: boolean;
  }) => void;
  onRefresh: () => void;
  onPatch: (
    key: string,
    patch: {
      label?: string | null;
      thinkingLevel?: string | null;
      verboseLevel?: string | null;
      reasoningLevel?: string | null;
    },
  ) => void;
  onDelete: (key: string) => void;
};

const THINK_LEVELS = ["", "off", "minimal", "low", "medium", "high"] as const;
const BINARY_THINK_LEVELS = ["", "off", "on"] as const;
const VERBOSE_LEVELS = [
  { value: "", label: t().ui.views.sessions.inherit },
  { value: "off", label: t().ui.views.sessions.offExplicit },
  { value: "on", label: t().ui.views.sessions.on },
] as const;
const REASONING_LEVELS = ["", "off", "on", "stream"] as const;

function normalizeProviderId(provider?: string | null): string {
  if (!provider) {
    return "";
  }
  const normalized = provider.trim().toLowerCase();
  if (normalized === "z.ai" || normalized === "z-ai") {
    return "zai";
  }
  return normalized;
}

function isBinaryThinkingProvider(provider?: string | null): boolean {
  return normalizeProviderId(provider) === "zai";
}

function resolveThinkLevelOptions(provider?: string | null): readonly string[] {
  return isBinaryThinkingProvider(provider) ? BINARY_THINK_LEVELS : THINK_LEVELS;
}

function resolveThinkLevelDisplay(value: string, isBinary: boolean): string {
  if (!isBinary) {
    return value;
  }
  if (!value || value === "off") {
    return value;
  }
  return "on";
}

function resolveThinkLevelPatchValue(value: string, isBinary: boolean): string | null {
  if (!value) {
    return null;
  }
  if (!isBinary) {
    return value;
  }
  if (value === "on") {
    return "low";
  }
  return value;
}

export function renderSessions(props: SessionsProps) {
  const rows = props.result?.sessions ?? [];
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t().ui.views.sessions.sessions}</div>
          <div class="card-sub">${t().ui.views.sessions.sessionsSub}</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? t().ui.views.sessions.loading : t().ui.views.sessions.refresh}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field">
          <span>${t().ui.views.sessions.activeMinutes}</span>
          <input
            .value=${props.activeMinutes}
            @input=${(e: Event) =>
      props.onFiltersChange({
        activeMinutes: (e.target as HTMLInputElement).value,
        limit: props.limit,
        includeGlobal: props.includeGlobal,
        includeUnknown: props.includeUnknown,
      })}
          />
        </label>
        <label class="field">
          <span>${t().ui.views.sessions.limit}</span>
          <input
            .value=${props.limit}
            @input=${(e: Event) =>
      props.onFiltersChange({
        activeMinutes: props.activeMinutes,
        limit: (e.target as HTMLInputElement).value,
        includeGlobal: props.includeGlobal,
        includeUnknown: props.includeUnknown,
      })}
          />
        </label>
        <label class="field checkbox">
          <span>${t().ui.views.sessions.includeGlobal}</span>
          <input
            type="checkbox"
            .checked=${props.includeGlobal}
            @change=${(e: Event) =>
      props.onFiltersChange({
        activeMinutes: props.activeMinutes,
        limit: props.limit,
        includeGlobal: (e.target as HTMLInputElement).checked,
        includeUnknown: props.includeUnknown,
      })}
          />
        </label>
        <label class="field checkbox">
          <span>${t().ui.views.sessions.includeUnknown}</span>
          <input
            type="checkbox"
            .checked=${props.includeUnknown}
            @change=${(e: Event) =>
      props.onFiltersChange({
        activeMinutes: props.activeMinutes,
        limit: props.limit,
        includeGlobal: props.includeGlobal,
        includeUnknown: (e.target as HTMLInputElement).checked,
      })}
          />
        </label>
      </div>

      ${props.error
      ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
      : nothing
    }

      <div class="muted" style="margin-top: 12px;">
        ${props.result ? t().ui.views.sessions.storePath(props.result.path) : ""}
      </div>

      <div class="table" style="margin-top: 16px;">
        <div class="table-head">
          <div>${t().ui.views.sessions.table.key}</div>
          <div>${t().ui.views.sessions.table.label}</div>
          <div>${t().ui.views.sessions.table.kind}</div>
          <div>${t().ui.views.sessions.table.updated}</div>
          <div>${t().ui.views.sessions.table.tokens}</div>
          <div>${t().ui.views.sessions.table.thinking}</div>
          <div>${t().ui.views.sessions.table.verbose}</div>
          <div>${t().ui.views.sessions.table.reasoning}</div>
          <div>${t().ui.views.sessions.table.actions}</div>
        </div>
        ${rows.length === 0
      ? html`
                <div class="muted">${t().ui.views.sessions.noSessions}</div>
              `
      : rows.map((row) =>
        renderRow(row, props.basePath, props.onPatch, props.onDelete, props.loading),
      )
    }
      </div>
    </section>
  `;
}

function renderRow(
  row: GatewaySessionRow,
  basePath: string,
  onPatch: SessionsProps["onPatch"],
  onDelete: SessionsProps["onDelete"],
  disabled: boolean,
) {
  const updated = row.updatedAt ? formatAgo(row.updatedAt) : t().ui.views.channels.na;
  const rawThinking = row.thinkingLevel ?? "";
  const isBinaryThinking = isBinaryThinkingProvider(row.modelProvider);
  const thinking = resolveThinkLevelDisplay(rawThinking, isBinaryThinking);
  const thinkLevels = resolveThinkLevelOptions(row.modelProvider);
  const verbose = row.verboseLevel ?? "";
  const reasoning = row.reasoningLevel ?? "";
  const displayName = row.displayName ?? row.key;
  const canLink = row.kind !== "global";
  const chatUrl = canLink
    ? `${pathForTab("chat", basePath)}?session=${encodeURIComponent(row.key)}`
    : null;

  return html`
    <div class="table-row">
      <div class="mono">${canLink ? html`<a href=${chatUrl} class="session-link">${displayName}</a>` : displayName
    }</div>
      <div>
        <input
          .value=${row.label ?? ""}
          ?disabled=${disabled}
          placeholder="${t().ui.views.sessions.optionalPlaceholder}"
          @change=${(e: Event) => {
      const value = (e.target as HTMLInputElement).value.trim();
      onPatch(row.key, { label: value || null });
    }}
        />
      </div>
      <div>${row.kind}</div>
      <div>${updated}</div>
      <div>${formatSessionTokens(row)}</div>
      <div>
        <select
          .value=${thinking}
          ?disabled=${disabled}
          @change=${(e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      onPatch(row.key, {
        thinkingLevel: resolveThinkLevelPatchValue(value, isBinaryThinking),
      });
    }}
        >
          ${thinkLevels.map((level) => html`<option value=${level}>${level || t().ui.views.sessions.inherit}</option>`)}
        </select>
      </div>
      <div>
        <select
          .value=${verbose}
          ?disabled=${disabled}
          @change=${(e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      onPatch(row.key, { verboseLevel: value || null });
    }}
        >
          ${VERBOSE_LEVELS.map(
      (level) => html`<option value=${level.value}>${level.label}</option>`,
    )}
        </select>
      </div>
      <div>
        <select
          .value=${reasoning}
          ?disabled=${disabled}
          @change=${(e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      onPatch(row.key, { reasoningLevel: value || null });
    }}
        >
          ${REASONING_LEVELS.map(
      (level) => html`<option value=${level}>${level || t().ui.views.sessions.inherit}</option>`,
    )}
        </select>
      </div>
      <div>
        <button class="btn danger" ?disabled=${disabled} @click=${() => onDelete(row.key)}>
          ${t().ui.views.sessions.delete}
        </button>
      </div>
    </div>
  `;
}

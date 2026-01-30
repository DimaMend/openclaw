import { html } from "lit";
import { t } from "../i18n";

import type { GatewayHelloOk } from "../gateway";
import { formatAgo, formatDurationMs } from "../format";
import { formatNextRun } from "../presenter";
import type { UiSettings } from "../storage";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | { uptimeMs?: number; policy?: { tickIntervalMs?: number } }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs
    ? `${snapshot.policy.tickIntervalMs}ms`
    : "n/a";
  const authHint = (() => {
    if (props.connected || !props.lastError) return null;
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) return null;
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px;">
          ${t("overview.authRequired")}
          <div style="margin-top: 6px;">
            <span class="mono">openclaw dashboard --no-open</span> → tokenized URL<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> → set token
          </div>
          <div style="margin-top: 6px;">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              title="Control UI auth docs (opens in new tab)"
              >Docs: Control UI auth</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px;">
        ${t("overview.authFailed")}
        <div style="margin-top: 6px;">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            title="Control UI auth docs (opens in new tab)"
            >Docs: Control UI auth</a
          >
        </div>
      </div>
    `;
  })();
  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) return null;
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext !== false) return null;
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px;">
        ${t("overview.insecureContext")}
        <div style="margin-top: 6px;">
          如果必须保留 HTTP，请设置
          <span class="mono">gateway.controlUi.allowInsecureAuth: true</span> (仅限令牌)。
        </div>
        <div style="margin-top: 6px;">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            title="Tailscale Serve docs (opens in new tab)"
            >Docs: Tailscale Serve</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            title="Insecure HTTP docs (opens in new tab)"
            >Docs: Insecure HTTP</a
          >
        </div>
      </div>
    `;
  })();

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">${t("overview.gatewayAccess")}</div>
        <div class="card-sub">${t("overview.gatewayAccessSubtitle")}</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>${t("overview.websocketUrl")}</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSettingsChange({ ...props.settings, gatewayUrl: v });
    }}
              placeholder="ws://100.x.y.z:18789"
            />
          </label>
          <label class="field">
            <span>${t("overview.gatewayToken")}</span>
            <input
              .value=${props.settings.token}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSettingsChange({ ...props.settings, token: v });
    }}
              placeholder="OPENCLAW_GATEWAY_TOKEN"
            />
          </label>
          <label class="field">
            <span>${t("overview.passwordLabel")}</span>
            <input
              type="password"
              .value=${props.password}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onPasswordChange(v);
    }}
              placeholder="system or shared password"
            />
          </label>
          <label class="field">
            <span>${t("overview.sessionKeyLabel")}</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
      const v = (e.target as HTMLInputElement).value;
      props.onSessionKeyChange(v);
    }}
            />
          </label>
        </div>
        <div class="row" style="margin-top: 14px;">
          <button class="btn" @click=${() => props.onConnect()}>${t("overview.connect")}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${t("common.refresh")}</button>
          <span class="muted">${t("overview.connectHint")}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${t("overview.snapshotTitle")}</div>
        <div class="card-sub">${t("overview.snapshotSubtitle")}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">${t("nodes.statusLabel")}</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? t("overview.statusOk") : t("overview.statusErr")}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.uptime")}</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.tickInterval")}</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.lastChannelsRefresh")}</div>
            <div class="stat-value">
              ${props.lastChannelsRefresh
      ? formatAgo(props.lastChannelsRefresh)
      : "n/a"}
            </div>
          </div>
        </div>
        ${props.lastError
      ? html`<div class="callout danger" style="margin-top: 14px;">
              <div>${props.lastError}</div>
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
      : html`<div class="callout" style="margin-top: 14px;">
              ${t("overview.channelsHint")}
            </div>`}
      </div>
    </section>

    <section class="grid grid-cols-3" style="margin-top: 18px;">
      <div class="card stat-card">
        <div class="stat-label">${t("overview.instances")}</div>
        <div class="stat-value">${props.presenceCount}</div>
        <div class="muted">${t("overview.instancesHint")}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">${t("overview.sessions")}</div>
        <div class="stat-value">${props.sessionsCount ?? "n/a"}</div>
        <div class="muted">${t("overview.sessionsHint")}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">${t("overview.cron")}</div>
        <div class="stat-value">
          ${props.cronEnabled == null
      ? "n/a"
      : props.cronEnabled
        ? "已启用"
        : "已禁用"}
        </div>
        <div class="muted">${t("overview.nextWake", { run: formatNextRun(props.cronNext) })}</div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${t("overview.notesTitle")}</div>
      <div class="card-sub">${t("overview.notesSubtitle")}</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div>
          <div class="note-title">${t("overview.tailscaleTitle")}</div>
          <div class="muted">
            ${t("overview.tailscaleHint")}
          </div>
        </div>
        <div>
          <div class="note-title">${t("overview.hygieneTitle")}</div>
          <div class="muted">${t("overview.hygieneHint")}</div>
        </div>
        <div>
          <div class="note-title">${t("overview.cronRemindersTitle")}</div>
          <div class="muted">${t("overview.cronRemindersHint")}</div>
        </div>
      </div>
    </section>
  `;
}

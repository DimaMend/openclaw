import { html } from "lit";
import type { GatewayHelloOk } from "../gateway";
import type { UiSettings } from "../storage";
import { formatAgo, formatDurationMs } from "../format";
import { formatNextRun } from "../presenter";
import { t } from "../i18n";

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
  const tick = snapshot?.policy?.tickIntervalMs ? `${snapshot.policy.tickIntervalMs}ms` : "n/a";
  const authHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px">
          ${t().ui.views.overview.authHint.accessRequired}
          <div style="margin-top: 6px">
            <span class="mono">${t().ui.views.overview.authHint.cmdToken}</span> → tokenized URL<br />
            <span class="mono">${t().ui.views.overview.authHint.cmdGenerate}</span> → ${t().ui.views.overview.authHint.generateToken}
          </div>
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              title="${t().ui.views.overview.authHint.docsAuthTooltip}"
              >${t().ui.views.overview.authHint.docsAuth}</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t().ui.views.overview.authHint.authFailed}
        <span class="mono">${t().ui.views.overview.authHint.cmdToken}</span>, ${t().ui.views.overview.authHint.updateToken}
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            title="${t().ui.views.overview.authHint.docsAuthTooltip}"
            >${t().ui.views.overview.authHint.docsAuth}</a
          >
        </div>
      </div>
    `;
  })();
  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t().ui.views.overview.insecureHint.httpBlocked}
        <span class="mono">http://127.0.0.1:18789</span> ${t().ui.views.overview.insecureHint.onHost}
        <div style="margin-top: 6px">
          ${t().ui.views.overview.insecureHint.stayOnHttp}
          <span class="mono">${t().ui.views.overview.insecureHint.allowInsecure}</span> ${t().ui.views.overview.insecureHint.tokenOnly}
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            title="${t().ui.views.overview.insecureHint.docsTailscaleTooltip}"
            >${t().ui.views.overview.insecureHint.docsTailscale}</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            title="${t().ui.views.overview.insecureHint.docsInsecureTooltip}"
            >${t().ui.views.overview.insecureHint.docsInsecure}</a
          >
        </div>
      </div>
    `;
  })();

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">${t().ui.views.overview.gatewayAccess}</div>
        <div class="card-sub">${t().ui.views.overview.gatewayAccessSub}</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>${t().ui.views.overview.wsUrl}</span>
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
            <span>${t().ui.views.overview.gatewayToken}</span>
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
            <span>${t().ui.views.overview.passwordNotStored}</span>
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
            <span>${t().ui.views.overview.defaultSessionKey}</span>
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
          <button class="btn" @click=${() => props.onConnect()}>${t().ui.views.overview.connect}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${t().ui.views.overview.refresh}</button>
          <span class="muted">${t().ui.views.overview.clickConnectToApply}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${t().ui.views.overview.snapshot}</div>
        <div class="card-sub">${t().ui.views.overview.snapshotSub}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">${t().ui.views.overview.status}</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? t().ui.views.overview.connected : t().ui.views.overview.disconnected}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${t().ui.views.overview.uptime}</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t().ui.views.overview.tickInterval}</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t().ui.views.overview.lastChannelsRefresh}</div>
            <div class="stat-value">
              ${props.lastChannelsRefresh ? formatAgo(props.lastChannelsRefresh) : "n/a"}
            </div>
          </div>
        </div>
        ${props.lastError
      ? html`<div class="callout danger" style="margin-top: 14px;">
              <div>${props.lastError}</div>
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
      : html`
                <div class="callout" style="margin-top: 14px">
                  ${t().ui.views.overview.useChannelsHint}
                </div>
              `
    }
      </div>
    </section>

    <section class="grid grid-cols-3" style="margin-top: 18px;">
      <div class="card stat-card">
        <div class="stat-label">${t().ui.views.overview.instances}</div>
        <div class="stat-value">${props.presenceCount}</div>
        <div class="muted">${t().ui.views.overview.instancesSub}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">${t().ui.views.overview.sessions}</div>
        <div class="stat-value">${props.sessionsCount ?? "n/a"}</div>
        <div class="muted">${t().ui.views.overview.sessionsSub}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">${t().ui.views.overview.cron}</div>
        <div class="stat-value">
          ${props.cronEnabled == null ? "n/a" : props.cronEnabled ? t().ui.views.overview.cronEnabled : t().ui.views.overview.cronDisabled}
        </div>
        <div class="muted">${t().ui.views.overview.cronNextWake(formatNextRun(props.cronNext))}</div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${t().ui.views.overview.notes}</div>
      <div class="card-sub">${t().ui.views.overview.notesSub}</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div>
          <div class="note-title">${t().ui.views.overview.tailscaleServe}</div>
          <div class="muted">
            ${t().ui.views.overview.tailscaleServeSub}
          </div>
        </div>
        <div>
          <div class="note-title">${t().ui.views.overview.sessionHygiene}</div>
          <div class="muted">${t().ui.views.overview.sessionHygieneSub}</div>
        </div>
        <div>
          <div class="note-title">${t().ui.views.overview.cronReminders}</div>
          <div class="muted">${t().ui.views.overview.cronRemindersSub}</div>
        </div>
      </div>
    </section>
  `;
}

import { html, nothing } from "lit";
import { t } from "../i18n";

import { formatAgo } from "../format";
import type { SignalStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";

export function renderSignalCard(params: {
  props: ChannelsProps;
  signal?: SignalStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, signal, accountCountLabel } = params;

  return html`
    <div class="card">
      <div class="card-title">Signal</div>
      <div class="card-sub">${t("channels.signal.subtitle")}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${t("channels.configured")}</span>
          <span>${signal?.configured ? t("channels.yes") : t("channels.no")}</span>
        </div>
        <div>
          <span class="label">${t("channels.running")}</span>
          <span>${signal?.running ? t("channels.yes") : t("channels.no")}</span>
        </div>
        <div>
          <span class="label">${t("channels.signal.baseUrl")}</span>
          <span>${signal?.baseUrl ?? t("common.na")}</span>
        </div>
        <div>
          <span class="label">${t("channels.lastStart")}</span>
          <span>${signal?.lastStartAt ? formatAgo(signal.lastStartAt) : t("common.na")}</span>
        </div>
        <div>
          <span class="label">${t("channels.lastProbe")}</span>
          <span>${signal?.lastProbeAt ? formatAgo(signal.lastProbeAt) : t("common.na")}</span>
        </div>
      </div>

      ${signal?.lastError
      ? html`<div class="callout danger" style="margin-top: 12px;">
            ${signal.lastError}
          </div>`
      : nothing}

      ${signal?.probe
      ? html`<div class="callout" style="margin-top: 12px;">
            ${t("channels.probe")} ${signal.probe.ok ? t("channels.probeOk") : t("channels.probeFailed")} ·
            ${signal.probe.status ?? ""} ${signal.probe.error ?? ""}
          </div>`
      : nothing}

      ${renderChannelConfigSection({ channelId: "signal", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          ${t("channels.probe")}
        </button>
      </div>
    </div>
  `;
}

import { html, nothing } from "lit";
import { t } from "../i18n";

import { formatAgo } from "../format";
import type { SlackStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";

export function renderSlackCard(params: {
  props: ChannelsProps;
  slack?: SlackStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, slack, accountCountLabel } = params;

  return html`
    <div class="card">
      <div class="card-title">Slack</div>
      <div class="card-sub">${t("channels.slack.subtitle")}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${t("channels.configured")}</span>
          <span>${slack?.configured ? t("channels.yes") : t("channels.no")}</span>
        </div>
        <div>
          <span class="label">${t("channels.running")}</span>
          <span>${slack?.running ? t("channels.yes") : t("channels.no")}</span>
        </div>
        <div>
          <span class="label">${t("channels.lastStart")}</span>
          <span>${slack?.lastStartAt ? formatAgo(slack.lastStartAt) : t("common.na")}</span>
        </div>
        <div>
          <span class="label">${t("channels.lastProbe")}</span>
          <span>${slack?.lastProbeAt ? formatAgo(slack.lastProbeAt) : t("common.na")}</span>
        </div>
      </div>

      ${slack?.lastError
      ? html`<div class="callout danger" style="margin-top: 12px;">
            ${slack.lastError}
          </div>`
      : nothing}

      ${slack?.probe
      ? html`<div class="callout" style="margin-top: 12px;">
            ${t("channels.probe")} ${slack.probe.ok ? t("channels.probeOk") : t("channels.probeFailed")} ·
            ${slack.probe.status ?? ""} ${slack.probe.error ?? ""}
          </div>`
      : nothing}

      ${renderChannelConfigSection({ channelId: "slack", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          ${t("channels.probe")}
        </button>
      </div>
    </div>
  `;
}

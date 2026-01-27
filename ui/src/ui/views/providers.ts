import { html, nothing, type TemplateResult } from "lit";
import type { ProviderProfile, ProvidersListResult } from "../controllers/providers";
import { formatProviderExpiry, isProviderExpiringSoon } from "../controllers/providers";

export type ProviderSwitcherProps = {
  connected: boolean;
  loading: boolean;
  switching: boolean;
  error: string | null;
  providersList: ProvidersListResult | null;
  activeProvider: ProviderProfile | null;
  onSwitch: (profileId: string) => void;
  onRefresh: () => void;
};

function renderProviderOption(profile: ProviderProfile): TemplateResult {
  const expiry = formatProviderExpiry(profile.expiresAt);
  const expiringSoon = isProviderExpiringSoon(profile.expiresAt);
  const typeIcon = profile.type === "oauth" ? "🔐" : profile.type === "api_key" ? "🔑" : "🎫";

  return html`
    <option value="${profile.id}" ?selected=${profile.isActive}>
      ${typeIcon} ${profile.label}${expiry ? ` (${expiry})` : ""}${expiringSoon ? " ⚠️" : ""}
    </option>
  `;
}

export function renderProviderSwitcher(props: ProviderSwitcherProps): TemplateResult {
  if (!props.connected) {
    return html`
      <div class="provider-switcher muted">Not connected</div>
    `;
  }

  if (props.loading) {
    return html`
      <div class="provider-switcher">Loading providers...</div>
    `;
  }

  if (props.error) {
    return html`
      <div class="provider-switcher error">
        <span class="error-text">${props.error}</span>
        <button class="btn btn-sm" @click=${props.onRefresh}>Retry</button>
      </div>
    `;
  }

  if (!props.providersList || Object.keys(props.providersList.profiles).length === 0) {
    return html`
      <div class="provider-switcher muted">
        No providers configured
        <button class="btn btn-sm" @click=${props.onRefresh} title="Refresh providers">↻</button>
      </div>
    `;
  }

  const profiles = Object.values(props.providersList.profiles);
  const activeProfile = props.activeProvider;

  const handleChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    const profileId = select.value;
    if (profileId && profileId !== activeProfile?.id) {
      props.onSwitch(profileId);
    }
  };

  // Group profiles by provider
  const byProvider = profiles.reduce(
    (acc, profile) => {
      const provider = profile.provider;
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(profile);
      return acc;
    },
    {} as Record<string, ProviderProfile[]>,
  );

  const expiryWarning =
    activeProfile && isProviderExpiringSoon(activeProfile.expiresAt)
      ? html`
          <span class="expiry-warning" title="Token expiring soon">⚠️</span>
        `
      : nothing;

  return html`
    <div class="provider-switcher">
      <label class="provider-label">
        <span class="provider-label-text">Provider:</span>
        ${expiryWarning}
      </label>
      <select
        class="provider-select"
        @change=${handleChange}
        ?disabled=${props.switching}
        title="Switch AI provider"
      >
        ${Object.entries(byProvider).map(
          ([provider, providerProfiles]) => html`
            <optgroup label="${provider}">
              ${providerProfiles.map((p) => renderProviderOption(p))}
            </optgroup>
          `,
        )}
      </select>
      ${
        props.switching
          ? html`
              <span class="provider-switching">Switching...</span>
            `
          : nothing
      }
      <button
        class="btn btn-sm provider-refresh"
        @click=${props.onRefresh}
        title="Refresh provider list"
        ?disabled=${props.switching}
      >
        ↻
      </button>
    </div>
  `;
}

export function renderProviderSwitcherStyles(): TemplateResult {
  return html`
    <style>
      .provider-switcher {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--surface-1);
        border-radius: 6px;
        font-size: 13px;
      }
    
      .provider-label {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--text-2);
      }
    
      .provider-label-text {
        font-weight: 500;
      }
    
      .provider-select {
        flex: 1;
        min-width: 200px;
        padding: 6px 10px;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface-2);
        color: var(--text-1);
        font-size: 13px;
        cursor: pointer;
      }
    
      .provider-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    
      .provider-select:focus {
        outline: none;
        border-color: var(--accent);
      }
    
      .provider-switching {
        color: var(--text-2);
        font-size: 12px;
      }
    
      .provider-refresh {
        padding: 4px 8px;
        min-width: auto;
      }
    
      .expiry-warning {
        animation: pulse 2s infinite;
      }
    
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    
      .provider-switcher.error {
        border: 1px solid var(--error);
      }
    
      .error-text {
        color: var(--error);
        flex: 1;
      }
    </style>
  `;
}

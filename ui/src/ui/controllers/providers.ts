import type { GatewayBrowserClient } from "../gateway";

export type ProviderProfile = {
  id: string;
  provider: string;
  type: "api_key" | "oauth" | "token";
  label: string;
  isActive: boolean;
  expiresAt?: number;
  email?: string;
};

export type ProvidersListResult = {
  profiles: Record<string, ProviderProfile>;
  lastGood?: Record<string, string>;
  order?: Record<string, string[]>;
};

export type ProviderActiveResult = {
  activeProfile: ProviderProfile | null;
  provider: string | null;
};

export type ProviderSwitchResult = {
  success: boolean;
  activeProfile: ProviderProfile;
};

export type ProvidersState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  providersLoading: boolean;
  providersError: string | null;
  providersList: ProvidersListResult | null;
  activeProvider: ProviderProfile | null;
  providerSwitching: boolean;
};

export async function loadProviders(state: ProvidersState): Promise<void> {
  if (!state.client || !state.connected) return;
  if (state.providersLoading) return;
  state.providersLoading = true;
  state.providersError = null;
  try {
    const res = (await state.client.request("providers.list", {})) as
      | ProvidersListResult
      | undefined;
    if (res) {
      state.providersList = res;
      // Find active provider
      const activeId = Object.keys(res.profiles).find((id) => res.profiles[id].isActive);
      state.activeProvider = activeId ? res.profiles[activeId] : null;
    }
  } catch (err) {
    state.providersError = String(err);
  } finally {
    state.providersLoading = false;
  }
}

export async function switchProvider(state: ProvidersState, profileId: string): Promise<boolean> {
  if (!state.client || !state.connected) return false;
  if (state.providerSwitching) return false;
  state.providerSwitching = true;
  state.providersError = null;
  try {
    const res = (await state.client.request("providers.switch", {
      profileId,
    })) as ProviderSwitchResult | undefined;
    if (res?.success) {
      state.activeProvider = res.activeProfile;
      // Reload providers list to update isActive flags
      await loadProviders(state);
      return true;
    }
    return false;
  } catch (err) {
    state.providersError = String(err);
    return false;
  } finally {
    state.providerSwitching = false;
  }
}

export function formatProviderExpiry(expiresAt?: number): string | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const diff = expiresAt - now;
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isProviderExpiringSoon(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  const now = Date.now();
  const diff = expiresAt - now;
  // Expiring within 4 hours
  return diff > 0 && diff < 4 * 60 * 60 * 1000;
}

import {
  ensureAuthProfileStore,
  type AuthProfileStore,
  type AuthProfileCredential,
} from "../../agents/auth-profiles.js";
import { markAuthProfileGood, setAuthProfileOrder } from "../../agents/auth-profiles/profiles.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export type ProviderProfile = {
  id: string;
  provider: string;
  type: "api_key" | "oauth" | "token";
  label: string;
  isActive: boolean;
  expiresAt?: number;
  email?: string;
};

export type ProvidersListResponse = {
  profiles: Record<string, ProviderProfile>;
  lastGood?: Record<string, string>;
  order?: Record<string, string[]>;
};

export type ProviderActiveResponse = {
  activeProfile: ProviderProfile | null;
  provider: string | null;
};

function resolveProfileLabel(id: string, cred: AuthProfileCredential): string {
  const parts = id.split(":");
  const suffix = parts.length > 1 ? parts.slice(1).join(":") : "default";
  const typeLabel = cred.type === "oauth" ? "OAuth" : cred.type === "api_key" ? "API Key" : "Token";
  return `${cred.provider} (${typeLabel}) - ${suffix}`;
}

function mapStoreToProfiles(
  store: AuthProfileStore,
  activeProfileId: string | null,
): Record<string, ProviderProfile> {
  const result: Record<string, ProviderProfile> = {};
  for (const [id, cred] of Object.entries(store.profiles)) {
    result[id] = {
      id,
      provider: cred.provider,
      type: cred.type,
      label: resolveProfileLabel(id, cred),
      isActive: id === activeProfileId,
      expiresAt: "expires" in cred ? cred.expires : undefined,
      email: "email" in cred ? cred.email : undefined,
    };
  }
  return result;
}

function resolveActiveProfileId(store: AuthProfileStore, provider = "anthropic"): string | null {
  if (store.lastGood?.[provider]) {
    return store.lastGood[provider];
  }
  if (store.order?.[provider]?.[0]) {
    return store.order[provider][0];
  }
  const profilesForProvider = Object.entries(store.profiles).filter(
    ([, cred]) => cred.provider === provider,
  );
  if (profilesForProvider.length > 0) {
    return profilesForProvider[0][0];
  }
  return null;
}

export const providersHandlers: GatewayRequestHandlers = {
  "providers.list": async ({ respond }) => {
    try {
      const store = ensureAuthProfileStore();
      const activeProfileId = resolveActiveProfileId(store);

      const response: ProvidersListResponse = {
        profiles: mapStoreToProfiles(store, activeProfileId),
        lastGood: store.lastGood,
        order: store.order,
      };

      respond(true, response, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "providers.active": async ({ params, respond }) => {
    try {
      const provider = typeof params.provider === "string" ? params.provider : "anthropic";
      const store = ensureAuthProfileStore();
      const activeProfileId = resolveActiveProfileId(store, provider);

      let activeProfile: ProviderProfile | null = null;
      if (activeProfileId && store.profiles[activeProfileId]) {
        const cred = store.profiles[activeProfileId];
        activeProfile = {
          id: activeProfileId,
          provider: cred.provider,
          type: cred.type,
          label: resolveProfileLabel(activeProfileId, cred),
          isActive: true,
          expiresAt: "expires" in cred ? cred.expires : undefined,
          email: "email" in cred ? cred.email : undefined,
        };
      }

      const response: ProviderActiveResponse = {
        activeProfile,
        provider,
      };

      respond(true, response, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "providers.switch": async ({ params, respond }) => {
    const profileId = params.profileId;
    if (typeof profileId !== "string" || !profileId.trim()) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "profileId parameter is required"),
      );
      return;
    }

    try {
      const store = ensureAuthProfileStore();

      if (!store.profiles[profileId]) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Profile not found: ${profileId}`),
        );
        return;
      }

      const cred = store.profiles[profileId];
      const provider = cred.provider;

      // Mark as last good for this provider
      await markAuthProfileGood({ store, provider, profileId });

      // Update order to prioritize this profile
      const currentOrder = store.order?.[provider] ?? [];
      const newOrder = [profileId, ...currentOrder.filter((id) => id !== profileId)];
      await setAuthProfileOrder({ provider, order: newOrder });

      const response = {
        success: true,
        activeProfile: {
          id: profileId,
          provider: cred.provider,
          type: cred.type,
          label: resolveProfileLabel(profileId, cred),
          isActive: true,
          expiresAt: "expires" in cred ? cred.expires : undefined,
          email: "email" in cred ? cred.email : undefined,
        },
      };

      respond(true, response, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  "providers.order": async ({ params, respond }) => {
    const provider = params.provider;
    const order = params.order;

    if (typeof provider !== "string" || !provider.trim()) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "provider parameter is required"),
      );
      return;
    }

    if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "order parameter must be an array of profile IDs"),
      );
      return;
    }

    try {
      await setAuthProfileOrder({ provider, order });

      respond(true, { success: true, provider, order }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};

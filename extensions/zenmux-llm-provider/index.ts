import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

const PROVIDER_ID = "zenmux";
const PROVIDER_LABEL = "Zenmux";
const DEFAULT_MODEL = "zenmux/chat-model";
const DEFAULT_BASE_URL = "https://zenmux.ai/api/v1";
const ZENMUX_MODELS_URL = "https://zenmux.ai/api/v1/models";
const DEFAULT_CONTEXT_WINDOW = 128000;
const DEFAULT_MAX_TOKENS = 8192;

interface PluginConfig {
  defaultBaseUrl?: string;
  defaultModel?: string;
}

interface ZenmuxModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  name?: string;
  description?: string;
  context_window?: number;
  max_tokens?: number;
  capabilities?: string[];
}

interface ZenmuxModelsResponse {
  object: string;
  data: ZenmuxModel[];
}

function normalizeBaseUrl(value: string | undefined, defaultUrl: string): string {
  const raw = value?.trim() || defaultUrl;
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

function buildModelDefinition(params: {
  id: string;
  name: string;
  input: Array<"text" | "image">;
  contextWindow?: number;
  maxTokens?: number;
}) {
  return {
    id: params.id,
    name: params.name,
    reasoning: false,
    input: params.input,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: params.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
    maxTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
}

/**
 * Fetch available models from Zenmux API
 */
async function fetchZenmuxModels(apiKey: string): Promise<ZenmuxModel[]> {
  try {
    const response = await fetch(ZENMUX_MODELS_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ZenmuxModelsResponse;
    return data.data || [];
  } catch (error) {
    console.warn("Failed to fetch Zenmux models from API:", error);
    return [];
  }
}

/**
 * Convert Zenmux API model to OpenClaw model definition
 */
function convertZenmuxModel(model: ZenmuxModel) {
  // Determine if model supports vision based on capabilities or ID
  const supportsVision = 
    model.capabilities?.includes("vision") || 
    model.id.toLowerCase().includes("vision") ||
    model.id.toLowerCase().includes("vl");

  return buildModelDefinition({
    id: model.id,
    name: model.name || model.id,
    input: supportsVision ? ["text", "image"] : ["text"],
    contextWindow: model.context_window || DEFAULT_CONTEXT_WINDOW,
    maxTokens: model.max_tokens || DEFAULT_MAX_TOKENS,
  });
}

/**
 * Get fallback models if API fetch fails
 */
function getFallbackModels() {
  return [
    buildModelDefinition({
      id: "chat-model",
      name: "Zenmux Chat Model",
      input: ["text"],
    }),
    buildModelDefinition({
      id: "vision-model",
      name: "Zenmux Vision Model",
      input: ["text", "image"],
    }),
    buildModelDefinition({
      id: "large-model",
      name: "Zenmux Large Model",
      input: ["text"],
      contextWindow: 200000,
      maxTokens: 16384,
    }),
  ];
}

const zenmuxPlugin = {
  id: "zenmux-llm-provider",
  name: "Zenmux LLM Provider",
  description: "LLM provider plugin for Zenmux API",
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    const pluginConfig = (api.pluginConfig ?? {}) as PluginConfig;
    const baseUrl = normalizeBaseUrl(
      pluginConfig.defaultBaseUrl,
      DEFAULT_BASE_URL,
    );
    const defaultModel = pluginConfig.defaultModel || DEFAULT_MODEL;

    api.logger.info(
      `zenmux-llm-provider: registering provider (baseUrl: ${baseUrl})`,
    );

    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_LABEL,
      docsPath: "/providers/zenmux",
      aliases: ["zmx"],
      envVars: ["ZENMUX_API_KEY"],

      // Define available models
      models: {
        baseUrl,
        apiKey: "", // Will be set during auth
        authMode: "api-key",
        api: "openai-completions", // or "anthropic-messages" depending on API compatibility
        models: [
          buildModelDefinition({
            id: "chat-model",
            name: "Zenmux Chat Model",
            input: ["text"],
          }),
          buildModelDefinition({
            id: "vision-model",
            name: "Zenmux Vision Model",
            input: ["text", "image"],
          }),
          buildModelDefinition({
            id: "large-model",
            name: "Zenmux Large Model",
            input: ["text"],
            contextWindow: 200000,
            maxTokens: 16384,
          }),
        ],
      },

      // Authentication methods
      auth: [
        {
          id: "api-key",
          label: "API Key",
          hint: "Use API key authentication",
          kind: "api_key",
          run: async (ctx) => {
            const progress = ctx.prompter.progress("Setting up Zenmux API key...");

            try {
              // Check if API key is in environment
              let apiKey = process.env.ZENMUX_API_KEY;

              if (!apiKey) {
                // Prompt user for API key
                apiKey = String(
                  await ctx.prompter.text({
                    message: "Enter your Zenmux API key:",
                    validate: (value) => {
                      if (!value || value.trim().length === 0) {
                        return "API key is required";
                      }
                      return;
                    },
                  }),
                );
              }

              const trimmedApiKey = apiKey.trim();

              // Fetch available models from API
              progress.update("Fetching available models...");
              const apiModels = await fetchZenmuxModels(trimmedApiKey);
              
              let models;
              if (apiModels.length > 0) {
                models = apiModels.map(convertZenmuxModel);
                progress.update(`Found ${models.length} models`);
              } else {
                models = getFallbackModels();
                progress.update("Using fallback models");
              }

              progress.stop("Zenmux API key configured");

              const profileId = `${PROVIDER_ID}:default`;

              return {
                profiles: [
                  {
                    profileId,
                    credential: {
                      type: "api-key",
                      provider: PROVIDER_ID,
                      key: trimmedApiKey,
                    },
                  },
                ],
                configPatch: {
                  models: {
                    providers: {
                      [PROVIDER_ID]: {
                        baseUrl,
                        apiKey: trimmedApiKey,
                        authMode: "api-key",
                        api: "openai-completions",
                        models,
                      },
                    },
                  },
                  agents: {
                    defaults: {
                      models: {
                        [defaultModel]: {},
                      },
                    },
                  },
                },
                defaultModel,
                notes: [
                  "Zenmux API key has been saved to your auth profiles",
                  `Found ${models.length} available models`,
                  `Default model: ${defaultModel}`,
                  `Base URL: ${baseUrl}`,
                  "Use 'openclaw config set agents.defaults.model.primary zenmux/<model-id>' to set as default",
                  "Run 'openclaw models list --provider zenmux' to see all available models",
                ],
              };
            } catch (err) {
              progress.stop("Failed to configure Zenmux API key");
              throw err;
            }
          },
        },
        {
          id: "env",
          label: "Environment Variable",
          hint: "Use ZENMUX_API_KEY from environment",
          kind: "api_key",
          run: async (ctx) => {
            const apiKey = process.env.ZENMUX_API_KEY;

            if (!apiKey) {
              throw new Error(
                "ZENMUX_API_KEY environment variable not found. Please set it or use the 'api-key' method.",
              );
            }

            // Fetch available models from API
            const apiModels = await fetchZenmuxModels(apiKey);
            
            let models;
            if (apiModels.length > 0) {
              models = apiModels.map(convertZenmuxModel);
              ctx.runtime.log(`Found ${models.length} Zenmux models`);
            } else {
              models = getFallbackModels();
              ctx.runtime.log("Using fallback models");
            }

            const profileId = `${PROVIDER_ID}:default`;

            return {
              profiles: [
                {
                  profileId,
                  credential: {
                    type: "api-key",
                    provider: PROVIDER_ID,
                    key: apiKey,
                  },
                },
              ],
              configPatch: {
                models: {
                  providers: {
                    [PROVIDER_ID]: {
                      baseUrl,
                      apiKey,
                      authMode: "api-key",
                      api: "openai-completions",
                      models,
                    },
                  },
                },
              },
              defaultModel,
              notes: [
                "Using ZENMUX_API_KEY from environment",
                `Found ${models.length} available models`,
              ],
            };
          },
        },
      ],

      // Format API key for requests
      formatApiKey: (cred) => {
        if (cred.type === "api-key") {
          return cred.key;
        }
        return "";
      },
    });

    api.logger.info("zenmux-llm-provider: provider registered successfully");
  },
};

export default zenmuxPlugin;

import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { loadConfig, saveConfig } from "../config/config.js";
import { resolveUserPath } from "../utils.js";

/**
 * OpenClaw configuration template
 * Fill in this template with your credentials and preferences
 */
export type OnboardingTemplate = {
  /** Your name or organization name */
  name: string;

  /** Primary task/purpose for this OpenClaw instance */
  task: string;

  /** GitHub integration */
  github: {
    /** GitHub personal access token (PAT) with repo access */
    token: string;

    /** GitHub repository for storing agent memory (format: owner/repo) */
    memoryRepo: string;

    /** GitHub policy: Rules for what the agent can do with GitHub */
    policy: {
      /** Allow creating/updating files */
      allowWrites: boolean;

      /** Allow creating pull requests */
      allowPullRequests: boolean;

      /** Allow merging pull requests */
      allowMerge: boolean;

      /** Repositories the agent is allowed to access (empty = all) */
      allowedRepos: string[];

      /** File patterns to never modify (e.g., ["*.key", "*.pem"]) */
      blockedPatterns: string[];
    };
  };

  /** Slack integration */
  slack: {
    /** Slack Bot User OAuth Token (starts with xoxb-) */
    botToken: string;

    /** Slack App-Level Token (starts with xapp-) */
    appToken: string;

    /** Slack policy: Rules for what the agent can do in Slack */
    policy: {
      /** Channels the agent is allowed to respond in (empty = all) */
      allowedChannels: string[];

      /** Users the agent is allowed to interact with (empty = all) */
      allowedUsers: string[];

      /** Allow the agent to send direct messages */
      allowDMs: boolean;

      /** Allow the agent to post in public channels */
      allowPublicChannels: boolean;

      /** Maximum message length (characters) */
      maxMessageLength: number;

      /** Commands the agent should ignore */
      ignoredCommands: string[];
    };
  };

  /** Agent configuration */
  agent: {
    /** Primary AI model to use */
    model: {
      provider: "anthropic" | "openai" | "google" | "custom";
      name: string;
    };

    /** Workspace directory for agent operations */
    workspace: string;

    /** Enable remote execution (E2B) */
    remoteExecution: {
      enabled: boolean;
      apiKey?: string;
    };
  };

  /** Gateway configuration */
  gateway: {
    /** Port for the gateway server */
    port: number;

    /** Bind address: "loopback" (local only) or "lan" (network accessible) */
    bind: "loopback" | "lan";

    /** Authentication mode */
    auth: {
      mode: "token" | "password" | "none";
      token?: string;
      password?: string;
    };
  };
};

/**
 * Generate a template JSON file for onboarding
 */
export async function generateTemplateCommand(
  opts: { output?: string },
  runtime: RuntimeEnv = defaultRuntime,
) {
  const template: OnboardingTemplate = {
    name: "My OpenClaw Agent",
    task: "Software development assistant with GitHub and Slack integration",
    github: {
      token: "ghp_YOUR_GITHUB_TOKEN_HERE",
      memoryRepo: "your-username/openclaw-memory",
      policy: {
        allowWrites: true,
        allowPullRequests: true,
        allowMerge: false,
        allowedRepos: [],
        blockedPatterns: ["*.key", "*.pem", ".env", "secrets/*"],
      },
    },
    slack: {
      botToken: "xoxb-YOUR-BOT-TOKEN-HERE",
      appToken: "xapp-YOUR-APP-TOKEN-HERE",
      policy: {
        allowedChannels: [],
        allowedUsers: [],
        allowDMs: true,
        allowPublicChannels: false,
        maxMessageLength: 4000,
        ignoredCommands: ["help", "ping"],
      },
    },
    agent: {
      model: {
        provider: "anthropic",
        name: "claude-sonnet-4-5",
      },
      workspace: "~/.openclaw/workspace",
      remoteExecution: {
        enabled: false,
        apiKey: "e2b_YOUR_API_KEY_HERE",
      },
    },
    gateway: {
      port: 18789,
      bind: "loopback",
      auth: {
        mode: "token",
        token: "your-secure-token-here",
      },
    },
  };

  const outputPath = opts.output
    ? resolve(opts.output)
    : resolve(process.cwd(), "openclaw-config-template.json");

  await writeFile(outputPath, JSON.stringify(template, null, 2), "utf-8");

  runtime.log(`✓ Configuration template generated: ${outputPath}`);
  runtime.log("");
  runtime.log("Next steps:");
  runtime.log("1. Fill in the template with your credentials");
  runtime.log("2. Review and adjust policies");
  runtime.log(`3. Import with: openclaw config import ${outputPath}`);
  runtime.log("");
  runtime.log("Security notes:");
  runtime.log("- Keep this file secure (contains tokens)");
  runtime.log("- Add to .gitignore if in a repository");
  runtime.log("- Use environment variables for production");
}

/**
 * Import a filled template and apply it to OpenClaw config
 */
export async function importTemplateCommand(
  opts: { file: string; dryRun?: boolean },
  runtime: RuntimeEnv = defaultRuntime,
) {
  const filePath = resolve(opts.file);

  runtime.log(`Reading template: ${filePath}`);

  let template: OnboardingTemplate;
  try {
    const content = await readFile(filePath, "utf-8");
    template = JSON.parse(content) as OnboardingTemplate;
  } catch (err) {
    runtime.error(`Failed to read template: ${err instanceof Error ? err.message : String(err)}`);
    runtime.exit(1);
    return;
  }

  // Validate required fields
  const errors: string[] = [];
  if (!template.name) errors.push("name is required");
  if (!template.github?.token || template.github.token.includes("YOUR_")) {
    errors.push("github.token must be a valid token");
  }
  if (!template.github?.memoryRepo || template.github.memoryRepo.includes("your-username")) {
    errors.push("github.memoryRepo must be a valid repo (format: owner/repo)");
  }
  if (!template.slack?.botToken || template.slack.botToken.includes("YOUR_")) {
    errors.push("slack.botToken must be a valid token");
  }
  if (!template.slack?.appToken || template.slack.appToken.includes("YOUR_")) {
    errors.push("slack.appToken must be a valid token");
  }

  if (errors.length > 0) {
    runtime.error("Template validation failed:");
    for (const error of errors) {
      runtime.error(`  - ${error}`);
    }
    runtime.exit(1);
    return;
  }

  runtime.log("✓ Template validated");

  if (opts.dryRun) {
    runtime.log("");
    runtime.log("Dry run - configuration that would be applied:");
    runtime.log(JSON.stringify(templateToConfig(template), null, 2));
    return;
  }

  // Load existing config
  const config = await loadConfig();

  // Apply template to config
  const updatedConfig = {
    ...config,
    // Agent defaults
    agents: {
      ...config.agents,
      defaults: {
        ...config.agents?.defaults,
        model: {
          primary: `${template.agent.model.provider}/${template.agent.model.name}`,
          ...config.agents?.defaults?.model,
        },
        workspace: resolveUserPath(template.agent.workspace),
      },
    },

    // Gateway config
    gateway: {
      ...config.gateway,
      port: template.gateway.port,
      bind: template.gateway.bind,
      controlUi: {
        ...config.gateway?.controlUi,
        auth:
          template.gateway.auth.mode === "token"
            ? { token: template.gateway.auth.token }
            : template.gateway.auth.mode === "password"
              ? { password: template.gateway.auth.password }
              : undefined,
      },
    },

    // GitHub integration
    github: {
      ...config.github,
      token: template.github.token,
      memory: {
        repo: template.github.memoryRepo,
      },
      policy: template.github.policy,
    },

    // Slack integration
    slack: {
      ...config.slack,
      botToken: template.slack.botToken,
      appToken: template.slack.appToken,
      policy: template.slack.policy,
    },

    // Plugins
    plugins: {
      ...config.plugins,
      "e2b-executor": template.agent.remoteExecution.enabled
        ? {
            enabled: true,
            apiKey: template.agent.remoteExecution.apiKey,
          }
        : config.plugins?.["e2b-executor"],
    },

    // Metadata
    _meta: {
      ...config._meta,
      name: template.name,
      task: template.task,
      configuredAt: new Date().toISOString(),
    },
  };

  await saveConfig(updatedConfig);

  runtime.log("");
  runtime.log("✓ Configuration imported successfully!");
  runtime.log("");
  runtime.log("Summary:");
  runtime.log(`  Name: ${template.name}`);
  runtime.log(`  Task: ${template.task}`);
  runtime.log(`  GitHub repo: ${template.github.memoryRepo}`);
  runtime.log(
    `  Slack channels: ${template.slack.policy.allowedChannels.length > 0 ? template.slack.policy.allowedChannels.join(", ") : "all"}`,
  );
  runtime.log(`  Model: ${template.agent.model.provider}/${template.agent.model.name}`);
  runtime.log(`  Gateway: ${template.gateway.bind}:${template.gateway.port}`);
  runtime.log("");
  runtime.log("Next steps:");
  runtime.log("1. Start the gateway: openclaw gateway run");
  runtime.log("2. Configure channels: openclaw channels add slack");
  runtime.log("3. Test connection: openclaw status");
}

/**
 * Helper to convert template to partial config
 */
function templateToConfig(template: OnboardingTemplate) {
  return {
    agents: {
      defaults: {
        model: {
          primary: `${template.agent.model.provider}/${template.agent.model.name}`,
        },
        workspace: template.agent.workspace,
      },
    },
    gateway: {
      port: template.gateway.port,
      bind: template.gateway.bind,
      auth: template.gateway.auth,
    },
    github: {
      token: template.github.token,
      memory: { repo: template.github.memoryRepo },
      policy: template.github.policy,
    },
    slack: {
      botToken: template.slack.botToken,
      appToken: template.slack.appToken,
      policy: template.slack.policy,
    },
    plugins: {
      "e2b-executor": template.agent.remoteExecution.enabled
        ? {
            enabled: true,
            apiKey: template.agent.remoteExecution.apiKey,
          }
        : undefined,
    },
  };
}

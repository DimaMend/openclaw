import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import {
  applyAuthChoice,
  resolvePreferredProviderForAuthChoice,
  warnIfModelConfigLooksOff,
} from "../commands/auth-choice.js";
import { promptAuthChoiceGrouped } from "../commands/auth-choice-prompt.js";
import { applyPrimaryModel, promptDefaultModel } from "../commands/model-picker.js";
import { setupChannels } from "../commands/onboard-channels.js";
import {
  applyWizardMetadata,
  DEFAULT_WORKSPACE,
  ensureWorkspaceAndSessions,
  handleReset,
  printWizardHeader,
  probeGatewayReachable,
  summarizeExistingConfig,
} from "../commands/onboard-helpers.js";
import { promptRemoteGatewayConfig } from "../commands/onboard-remote.js";
import { setupSkills } from "../commands/onboard-skills.js";
import { setupInternalHooks } from "../commands/onboard-hooks.js";
import type {
  GatewayAuthChoice,
  OnboardMode,
  OnboardOptions,
  ResetScope,
} from "../commands/onboard-types.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OpenClawConfig } from "../config/config.js";
import {
  DEFAULT_GATEWAY_PORT,
  readConfigFileSnapshot,
  resolveGatewayPort,
  writeConfigFile,
} from "../config/config.js";
import { logConfigUpdated } from "../config/logging.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { resolveUserPath } from "../utils.js";
import { t } from "./i18n.js";
import { finalizeOnboardingWizard } from "./onboarding.finalize.js";
import { configureGatewayForOnboarding } from "./onboarding.gateway-config.js";
import type { QuickstartGatewayDefaults, WizardFlow } from "./onboarding.types.js";
import { WizardCancelledError, type WizardPrompter } from "./prompts.js";

async function requireRiskAcknowledgement(params: {
  opts: OnboardOptions;
  prompter: WizardPrompter;
}) {
  if (params.opts.acceptRisk === true) return;

  await params.prompter.note(
    t("onboarding.security.note"),
    t("onboarding.security.title"),
  );

  const ok = await params.prompter.confirm({
    message: t("onboarding.security.confirm"),
    initialValue: false,
  });
  if (!ok) {
    throw new WizardCancelledError("risk not accepted");
  }
}

export async function runOnboardingWizard(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
  prompter: WizardPrompter,
) {
  printWizardHeader(runtime);
  await prompter.intro(t("onboarding.intro"));
  await requireRiskAcknowledgement({ opts, prompter });

  const snapshot = await readConfigFileSnapshot();
  let baseConfig: OpenClawConfig = snapshot.valid ? snapshot.config : {};

  if (snapshot.exists && !snapshot.valid) {
    await prompter.note(summarizeExistingConfig(baseConfig), t("onboarding.config.invalid"));
    if (snapshot.issues.length > 0) {
      await prompter.note(
        [
          ...snapshot.issues.map((iss) => `- ${iss.path}: ${iss.message}`),
          "",
          "Docs: https://docs.openclaw.ai/gateway/configuration",
        ].join("\n"),
        t("onboarding.config.issues"),
      );
    }
    await prompter.outro(
      t("onboarding.config.repair"),
    );
    runtime.exit(1);
    return;
  }

  const quickstartHint = t("onboarding.flow.quickstartHint");
  const manualHint = t("onboarding.flow.manualHint");
  const explicitFlowRaw = opts.flow?.trim();
  const normalizedExplicitFlow = explicitFlowRaw === "manual" ? "advanced" : explicitFlowRaw;
  if (
    normalizedExplicitFlow &&
    normalizedExplicitFlow !== "quickstart" &&
    normalizedExplicitFlow !== "advanced"
  ) {
    runtime.error(t("onboarding.flow.invalidFlow"));
    runtime.exit(1);
    return;
  }
  const explicitFlow: WizardFlow | undefined =
    normalizedExplicitFlow === "quickstart" || normalizedExplicitFlow === "advanced"
      ? normalizedExplicitFlow
      : undefined;
  let flow: WizardFlow =
    explicitFlow ??
    ((await prompter.select({
      message: t("onboarding.flow.modeSelect"),
      options: [
        { value: "quickstart", label: t("onboarding.flow.quickstart"), hint: quickstartHint },
        { value: "advanced", label: t("onboarding.flow.manual"), hint: manualHint },
      ],
      initialValue: "quickstart",
    })) as "quickstart" | "advanced");

  if (opts.mode === "remote" && flow === "quickstart") {
    await prompter.note(
      t("onboarding.flow.remoteSwitch"),
      t("onboarding.flow.quickstart"),
    );
    flow = "advanced";
  }

  if (snapshot.exists) {
    await prompter.note(summarizeExistingConfig(baseConfig), t("onboarding.existingConfig.title"));

    const action = (await prompter.select({
      message: t("onboarding.existingConfig.action"),
      options: [
        { value: "keep", label: t("onboarding.existingConfig.keep") },
        { value: "modify", label: t("onboarding.existingConfig.modify") },
        { value: "reset", label: t("onboarding.existingConfig.reset") },
      ],
    })) as "keep" | "modify" | "reset";

    if (action === "reset") {
      const workspaceDefault = baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE;
      const resetScope = (await prompter.select({
        message: t("onboarding.existingConfig.resetScope"),
        options: [
          { value: "config", label: t("onboarding.existingConfig.scopeConfig") },
          {
            value: "config+creds+sessions",
            label: t("onboarding.existingConfig.scopeConfigCreds"),
          },
          {
            value: "full",
            label: t("onboarding.existingConfig.scopeFull"),
          },
        ],
      })) as ResetScope;
      await handleReset(resetScope, resolveUserPath(workspaceDefault), runtime);
      baseConfig = {};
    }
  }

  const quickstartGateway: QuickstartGatewayDefaults = (() => {
    const hasExisting =
      typeof baseConfig.gateway?.port === "number" ||
      baseConfig.gateway?.bind !== undefined ||
      baseConfig.gateway?.auth?.mode !== undefined ||
      baseConfig.gateway?.auth?.token !== undefined ||
      baseConfig.gateway?.auth?.password !== undefined ||
      baseConfig.gateway?.customBindHost !== undefined ||
      baseConfig.gateway?.tailscale?.mode !== undefined;

    const bindRaw = baseConfig.gateway?.bind;
    const bind =
      bindRaw === "loopback" ||
        bindRaw === "lan" ||
        bindRaw === "auto" ||
        bindRaw === "custom" ||
        bindRaw === "tailnet"
        ? bindRaw
        : "loopback";

    let authMode: GatewayAuthChoice = "token";
    if (
      baseConfig.gateway?.auth?.mode === "token" ||
      baseConfig.gateway?.auth?.mode === "password"
    ) {
      authMode = baseConfig.gateway.auth.mode;
    } else if (baseConfig.gateway?.auth?.token) {
      authMode = "token";
    } else if (baseConfig.gateway?.auth?.password) {
      authMode = "password";
    }

    const tailscaleRaw = baseConfig.gateway?.tailscale?.mode;
    const tailscaleMode =
      tailscaleRaw === "off" || tailscaleRaw === "serve" || tailscaleRaw === "funnel"
        ? tailscaleRaw
        : "off";

    return {
      hasExisting,
      port: resolveGatewayPort(baseConfig),
      bind,
      authMode,
      tailscaleMode,
      token: baseConfig.gateway?.auth?.token,
      password: baseConfig.gateway?.auth?.password,
      customBindHost: baseConfig.gateway?.customBindHost,
      tailscaleResetOnExit: baseConfig.gateway?.tailscale?.resetOnExit ?? false,
    };
  })();

  if (flow === "quickstart") {
    const formatBind = (value: "loopback" | "lan" | "auto" | "custom" | "tailnet") => {
      if (value === "loopback") return t("onboarding.gateway.bindLoopback");
      if (value === "lan") return t("onboarding.gateway.bindLan");
      if (value === "custom") return t("onboarding.gateway.bindCustom");
      if (value === "tailnet") return t("onboarding.gateway.bindTailnet");
      return t("onboarding.gateway.bindAuto");
    };
    const formatAuth = (value: GatewayAuthChoice) => {
      if (value === "token") return t("onboarding.gateway.authToken");
      return t("onboarding.gateway.authPassword");
    };
    const formatTailscale = (value: "off" | "serve" | "funnel") => {
      if (value === "off") return t("onboarding.gateway.tsOff");
      if (value === "serve") return t("onboarding.gateway.tsServe");
      return t("onboarding.gateway.tsFunnel");
    };
    const quickstartLines = quickstartGateway.hasExisting
      ? [
        t("onboarding.gateway.keepSettings"),
        `${t("onboarding.gateway.port")}: ${quickstartGateway.port}`,
        `${t("onboarding.gateway.bind")}: ${formatBind(quickstartGateway.bind)}`,
        ...(quickstartGateway.bind === "custom" && quickstartGateway.customBindHost
          ? [`${t("onboarding.gateway.bindCustom")}: ${quickstartGateway.customBindHost}`]
          : []),
        `${t("onboarding.gateway.auth")}: ${formatAuth(quickstartGateway.authMode)}`,
        `${t("onboarding.gateway.tailscale")}: ${formatTailscale(quickstartGateway.tailscaleMode)}`,
        t("onboarding.gateway.chatChannels"),
      ]
      : [
        `${t("onboarding.gateway.port")}: ${DEFAULT_GATEWAY_PORT}`,
        `${t("onboarding.gateway.bind")}: ${t("onboarding.gateway.bindLoopback")}`,
        `${t("onboarding.gateway.auth")}: ${t("onboarding.gateway.authToken")}`,
        `${t("onboarding.gateway.tailscale")}: ${t("onboarding.gateway.tsOff")}`,
        t("onboarding.gateway.chatChannels"),
      ];
    await prompter.note(quickstartLines.join("\n"), t("onboarding.flow.quickstart"));
  }

  const localPort = resolveGatewayPort(baseConfig);
  const localUrl = `ws://127.0.0.1:${localPort}`;
  const localProbe = await probeGatewayReachable({
    url: localUrl,
    token: baseConfig.gateway?.auth?.token ?? process.env.OPENCLAW_GATEWAY_TOKEN,
    password: baseConfig.gateway?.auth?.password ?? process.env.OPENCLAW_GATEWAY_PASSWORD,
  });
  const remoteUrl = baseConfig.gateway?.remote?.url?.trim() ?? "";
  const remoteProbe = remoteUrl
    ? await probeGatewayReachable({
      url: remoteUrl,
      token: baseConfig.gateway?.remote?.token,
    })
    : null;

  const mode =
    opts.mode ??
    (flow === "quickstart"
      ? "local"
      : ((await prompter.select({
        message: t("onboarding.setup.question"),
        options: [
          {
            value: "local",
            label: t("onboarding.setup.local"),
            hint: localProbe.ok
              ? `${t("onboarding.setup.localOk")} (${localUrl})`
              : `${t("onboarding.setup.localFail")} (${localUrl})`,
          },
          {
            value: "remote",
            label: t("onboarding.setup.remote"),
            hint: !remoteUrl
              ? t("onboarding.setup.remoteNoUrl")
              : remoteProbe?.ok
                ? `${t("onboarding.setup.remoteOk")} (${remoteUrl})`
                : `${t("onboarding.setup.remoteFail")} (${remoteUrl})`,
          },
        ],
      })) as OnboardMode));

  if (mode === "remote") {
    let nextConfig = await promptRemoteGatewayConfig(baseConfig, prompter);
    nextConfig = applyWizardMetadata(nextConfig, { command: "onboard", mode });
    await writeConfigFile(nextConfig);
    logConfigUpdated(runtime);
    await prompter.outro(t("onboarding.setup.remoteDone"));
    return;
  }

  const workspaceInput =
    opts.workspace ??
    (flow === "quickstart"
      ? (baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE)
      : await prompter.text({
        message: t("onboarding.setup.workspaceDir"),
        initialValue: baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE,
      }));

  const workspaceDir = resolveUserPath(workspaceInput.trim() || DEFAULT_WORKSPACE);

  let nextConfig: OpenClawConfig = {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };

  const authStore = ensureAuthProfileStore(undefined, {
    allowKeychainPrompt: false,
  });
  const authChoiceFromPrompt = opts.authChoice === undefined;
  const authChoice =
    opts.authChoice ??
    (await promptAuthChoiceGrouped({
      prompter,
      store: authStore,
      includeSkip: true,
    }));

  const authResult = await applyAuthChoice({
    authChoice,
    config: nextConfig,
    prompter,
    runtime,
    setDefaultModel: true,
    opts: {
      tokenProvider: opts.tokenProvider,
      token: opts.authChoice === "apiKey" && opts.token ? opts.token : undefined,
    },
  });
  nextConfig = authResult.config;

  if (authChoiceFromPrompt) {
    const modelSelection = await promptDefaultModel({
      config: nextConfig,
      prompter,
      allowKeep: true,
      ignoreAllowlist: true,
      preferredProvider: resolvePreferredProviderForAuthChoice(authChoice),
    });
    if (modelSelection.model) {
      nextConfig = applyPrimaryModel(nextConfig, modelSelection.model);
    }
  }

  await warnIfModelConfigLooksOff(nextConfig, prompter);

  const gateway = await configureGatewayForOnboarding({
    flow,
    baseConfig,
    nextConfig,
    localPort,
    quickstartGateway,
    prompter,
    runtime,
  });
  nextConfig = gateway.nextConfig;
  const settings = gateway.settings;

  if (opts.skipChannels ?? opts.skipProviders) {
    await prompter.note(t("onboarding.setup.skippingChannels"), t("onboarding.gateway.chatChannels"));
  } else {
    const quickstartAllowFromChannels =
      flow === "quickstart"
        ? listChannelPlugins()
          .filter((plugin) => plugin.meta.quickstartAllowFrom)
          .map((plugin) => plugin.id)
        : [];
    nextConfig = await setupChannels(nextConfig, runtime, prompter, {
      allowSignalInstall: true,
      forceAllowFromChannels: quickstartAllowFromChannels,
      skipDmPolicyPrompt: flow === "quickstart",
      skipConfirm: flow === "quickstart",
      quickstartDefaults: flow === "quickstart",
    });
  }

  await writeConfigFile(nextConfig);
  logConfigUpdated(runtime);
  await ensureWorkspaceAndSessions(workspaceDir, runtime, {
    skipBootstrap: Boolean(nextConfig.agents?.defaults?.skipBootstrap),
  });

  if (opts.skipSkills) {
    await prompter.note(t("onboarding.setup.skippingSkills"), t("onboarding.setup.skills"));
  } else {
    nextConfig = await setupSkills(nextConfig, workspaceDir, runtime, prompter);
  }

  // Setup hooks (session memory on /new)
  nextConfig = await setupInternalHooks(nextConfig, runtime, prompter);

  nextConfig = applyWizardMetadata(nextConfig, { command: "onboard", mode });
  await writeConfigFile(nextConfig);

  await finalizeOnboardingWizard({
    flow,
    opts,
    baseConfig,
    nextConfig,
    workspaceDir,
    settings,
    prompter,
    runtime,
  });
}

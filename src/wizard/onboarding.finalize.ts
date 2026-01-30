import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_BOOTSTRAP_FILENAME } from "../agents/workspace.js";
import {
  DEFAULT_GATEWAY_DAEMON_RUNTIME,
  GATEWAY_DAEMON_RUNTIME_OPTIONS,
  type GatewayDaemonRuntime,
} from "../commands/daemon-runtime.js";
import { healthCommand } from "../commands/health.js";
import { formatHealthCheckFailure } from "../commands/health-format.js";
import {
  detectBrowserOpenSupport,
  formatControlUiSshHint,
  openUrl,
  openUrlInBackground,
  probeGatewayReachable,
  waitForGatewayReachable,
  resolveControlUiLinks,
} from "../commands/onboard-helpers.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OnboardOptions } from "../commands/onboard-types.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveGatewayService } from "../daemon/service.js";
import { isSystemdUserServiceAvailable } from "../daemon/systemd.js";
import { ensureControlUiAssetsBuilt } from "../infra/control-ui-assets.js";
import type { RuntimeEnv } from "../runtime.js";
import { runTui } from "../tui/tui.js";
import { resolveUserPath } from "../utils.js";
import {
  buildGatewayInstallPlan,
  gatewayInstallErrorHint,
} from "../commands/daemon-install-helpers.js";
import type { GatewayWizardSettings, WizardFlow } from "./onboarding.types.js";
import type { WizardPrompter } from "./prompts.js";
import { t } from "./i18n.js";

export type FinalizeOnboardingOptions = {
  flow: WizardFlow;
  opts: OnboardOptions;
  baseConfig: OpenClawConfig;
  nextConfig: OpenClawConfig;
  workspaceDir: string;
  settings: GatewayWizardSettings;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
};

export async function finalizeOnboardingWizard(options: FinalizeOnboardingOptions) {
  const { flow, opts, baseConfig, nextConfig, settings, prompter, runtime } = options;

  const withWizardProgress = async <T>(
    label: string,
    options: { doneMessage?: string },
    work: (progress: { update: (message: string) => void }) => Promise<T>,
  ): Promise<T> => {
    const progress = prompter.progress(label);
    try {
      return await work(progress);
    } finally {
      progress.stop(options.doneMessage);
    }
  };

  const systemdAvailable =
    process.platform === "linux" ? await isSystemdUserServiceAvailable() : true;
  if (process.platform === "linux" && !systemdAvailable) {
    await prompter.note(
      t("onboarding.finalize.systemdNote"),
      "Systemd",
    );
  }

  if (process.platform === "linux" && systemdAvailable) {
    const { ensureSystemdUserLingerInteractive } = await import("../commands/systemd-linger.js");
    await ensureSystemdUserLingerInteractive({
      runtime,
      prompter: {
        confirm: prompter.confirm,
        note: prompter.note,
      },
      reason: t("onboarding.finalize.systemdLinger"),
      requireConfirm: false,
    });
  }

  const explicitInstallDaemon =
    typeof opts.installDaemon === "boolean" ? opts.installDaemon : undefined;
  let installDaemon: boolean;
  if (explicitInstallDaemon !== undefined) {
    installDaemon = explicitInstallDaemon;
  } else if (process.platform === "linux" && !systemdAvailable) {
    installDaemon = false;
  } else if (flow === "quickstart") {
    installDaemon = true;
  } else {
    installDaemon = await prompter.confirm({
      message: t("onboarding.finalize.installService"),
      initialValue: true,
    });
  }

  if (process.platform === "linux" && !systemdAvailable && installDaemon) {
    await prompter.note(
      t("onboarding.finalize.serviceNoSystemd"),
      t("onboarding.finalize.serviceInstalled"),
    );
    installDaemon = false;
  }

  if (installDaemon) {
    const daemonRuntime =
      flow === "quickstart"
        ? (DEFAULT_GATEWAY_DAEMON_RUNTIME as GatewayDaemonRuntime)
        : ((await prompter.select({
          message: t("onboarding.finalize.serviceRuntime"),
          options: GATEWAY_DAEMON_RUNTIME_OPTIONS,
          initialValue: opts.daemonRuntime ?? DEFAULT_GATEWAY_DAEMON_RUNTIME,
        })) as GatewayDaemonRuntime);
    if (flow === "quickstart") {
      await prompter.note(
        t("onboarding.finalize.serviceRuntimeQuickstart"),
        t("onboarding.finalize.serviceRuntime"),
      );
    }
    const service = resolveGatewayService();
    const loaded = await service.isLoaded({ env: process.env });
    if (loaded) {
      const action = (await prompter.select({
        message: t("onboarding.finalize.serviceInstalled"),
        options: [
          { value: "restart", label: "重启 (Restart)" },
          { value: "reinstall", label: "重新安装 (Reinstall)" },
          { value: "skip", label: "跳过 (Skip)" },
        ],
      })) as "restart" | "reinstall" | "skip";
      if (action === "restart") {
        await withWizardProgress(
          t("onboarding.finalize.serviceInstalled"),
          { doneMessage: t("onboarding.finalize.restarted") },
          async (progress) => {
            progress.update(t("onboarding.finalize.restarting"));
            await service.restart({
              env: process.env,
              stdout: process.stdout,
            });
          },
        );
      } else if (action === "reinstall") {
        await withWizardProgress(
          t("onboarding.finalize.serviceInstalled"),
          { doneMessage: t("onboarding.finalize.uninstalled") },
          async (progress) => {
            progress.update(t("onboarding.finalize.uninstalling"));
            await service.uninstall({ env: process.env, stdout: process.stdout });
          },
        );
      }
    }

    if (!loaded || (loaded && (await service.isLoaded({ env: process.env })) === false)) {
      const progress = prompter.progress(t("onboarding.finalize.serviceInstalled"));
      let installError: string | null = null;
      try {
        progress.update(t("onboarding.finalize.preparing"));
        const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
          env: process.env,
          port: settings.port,
          token: settings.gatewayToken,
          runtime: daemonRuntime,
          warn: (message, title) => prompter.note(message, title),
          config: nextConfig,
        });

        progress.update(t("onboarding.finalize.installing"));
        await service.install({
          env: process.env,
          stdout: process.stdout,
          programArguments,
          workingDirectory,
          environment,
        });
      } catch (err) {
        installError = err instanceof Error ? err.message : String(err);
      } finally {
        progress.stop(
          installError ? t("onboarding.finalize.installFail") : t("onboarding.finalize.installSuccess"),
        );
      }
      if (installError) {
        await prompter.note(`${t("onboarding.finalize.installFail")}: ${installError}`, "Gateway");
        await prompter.note(gatewayInstallErrorHint(), "Gateway");
      }
    }
  }

  if (!opts.skipHealth) {
    const probeLinks = resolveControlUiLinks({
      bind: nextConfig.gateway?.bind ?? "loopback",
      port: settings.port,
      customBindHost: nextConfig.gateway?.customBindHost,
      basePath: undefined,
    });
    // Daemon install/restart can briefly flap the WS; wait a bit so health check doesn't false-fail.
    await waitForGatewayReachable({
      url: probeLinks.wsUrl,
      token: settings.gatewayToken,
      deadlineMs: 15_000,
    });
    try {
      await healthCommand({ json: false, timeoutMs: 10_000 }, runtime);
    } catch (err) {
      runtime.error(formatHealthCheckFailure(err));
      await prompter.note(
        [
          t("onboarding.finalize.healthDocsPrefix"),
          "https://docs.openclaw.ai/gateway/health",
          "https://docs.openclaw.ai/gateway/troubleshooting",
        ].join("\n"),
        t("onboarding.finalize.healthHelp"),
      );
    }
  }

  const controlUiEnabled =
    nextConfig.gateway?.controlUi?.enabled ?? baseConfig.gateway?.controlUi?.enabled ?? true;
  if (!opts.skipUi && controlUiEnabled) {
    const controlUiAssets = await ensureControlUiAssetsBuilt(runtime);
    if (!controlUiAssets.ok && controlUiAssets.message) {
      runtime.error(controlUiAssets.message);
    }
  }

  await prompter.note(
    t("onboarding.finalize.optionalAppsList"),
    t("onboarding.finalize.optionalApps"),
  );

  const controlUiBasePath =
    nextConfig.gateway?.controlUi?.basePath ?? baseConfig.gateway?.controlUi?.basePath;
  const links = resolveControlUiLinks({
    bind: settings.bind,
    port: settings.port,
    customBindHost: settings.customBindHost,
    basePath: controlUiBasePath,
  });
  const tokenParam =
    settings.authMode === "token" && settings.gatewayToken
      ? `?token=${encodeURIComponent(settings.gatewayToken)}`
      : "";
  const authedUrl = `${links.httpUrl}${tokenParam}`;
  const gatewayProbe = await probeGatewayReachable({
    url: links.wsUrl,
    token: settings.authMode === "token" ? settings.gatewayToken : undefined,
    password: settings.authMode === "password" ? nextConfig.gateway?.auth?.password : "",
  });
  const gatewayStatusLine = gatewayProbe.ok
    ? t("onboarding.setup.localOk")
    : `${t("onboarding.setup.localFail")}${gatewayProbe.detail ? ` (${gatewayProbe.detail})` : ""}`;
  const bootstrapPath = path.join(
    resolveUserPath(options.workspaceDir),
    DEFAULT_BOOTSTRAP_FILENAME,
  );
  const hasBootstrap = await fs
    .access(bootstrapPath)
    .then(() => true)
    .catch(() => false);

  await prompter.note(
    [
      `Web UI: ${links.httpUrl}`,
      tokenParam ? `Web UI (${t("onboarding.gatewayConfig.authToken")}): ${authedUrl}` : undefined,
      `Gateway WS: ${links.wsUrl}`,
      gatewayStatusLine,
      "Docs: https://docs.openclaw.ai/web/control-ui",
    ]
      .filter(Boolean)
      .join("\n"),
    t("onboarding.finalize.controlUi"),
  );

  let controlUiOpened = false;
  let controlUiOpenHint: string | undefined;
  let seededInBackground = false;
  let hatchChoice: "tui" | "web" | "later" | null = null;

  if (!opts.skipUi && gatewayProbe.ok) {
    if (hasBootstrap) {
      await prompter.note(
        t("onboarding.finalize.hatchTuiNote"),
        t("onboarding.finalize.hatchTui"),
      );
    }

    await prompter.note(
      t("onboarding.finalize.tokenNote"),
      t("onboarding.gatewayConfig.authToken"),
    );

    hatchChoice = (await prompter.select({
      message: t("onboarding.finalize.hatchQuestion"),
      options: [
        { value: "tui", label: t("onboarding.finalize.hatchTui") },
        { value: "web", label: t("onboarding.finalize.hatchWeb") },
        { value: "later", label: t("onboarding.finalize.hatchLater") },
      ],
      initialValue: "tui",
    })) as "tui" | "web" | "later";

    if (hatchChoice === "tui") {
      await runTui({
        url: links.wsUrl,
        token: settings.authMode === "token" ? settings.gatewayToken : undefined,
        password: settings.authMode === "password" ? nextConfig.gateway?.auth?.password : "",
        // Safety: onboarding TUI should not auto-deliver to lastProvider/lastTo.
        deliver: false,
        message: hasBootstrap ? "Wake up, my friend!" : undefined,
      });
      if (settings.authMode === "token" && settings.gatewayToken) {
        seededInBackground = await openUrlInBackground(authedUrl);
      }
      if (seededInBackground) {
        await prompter.note(
          `${t("onboarding.finalize.webUiSeeded")} ${formatCliCommand(
            "openclaw dashboard --no-open",
          )}`,
          "Web UI",
        );
      }
    } else if (hatchChoice === "web") {
      const browserSupport = await detectBrowserOpenSupport();
      if (browserSupport.ok) {
        controlUiOpened = await openUrl(authedUrl);
        if (!controlUiOpened) {
          controlUiOpenHint = formatControlUiSshHint({
            port: settings.port,
            basePath: controlUiBasePath,
            token: settings.gatewayToken,
          });
        }
      } else {
        controlUiOpenHint = formatControlUiSshHint({
          port: settings.port,
          basePath: controlUiBasePath,
          token: settings.gatewayToken,
        });
      }
      await prompter.note(
        [
          `${t("onboarding.finalize.dashboardReady")} (${t("onboarding.gatewayConfig.authToken")}): ${authedUrl}`,
          controlUiOpened
            ? t("onboarding.finalize.dashboardOpened")
            : t("onboarding.finalize.dashboardCopy"),
          controlUiOpenHint,
        ]
          .filter(Boolean)
          .join("\n"),
        t("onboarding.finalize.dashboardReady"),
      );
    } else {
      await prompter.note(
        `${t("onboarding.finalize.hatchLater")}: ${formatCliCommand("openclaw dashboard --no-open")}`,
        t("onboarding.finalize.hatchLater"),
      );
    }
  } else if (opts.skipUi) {
    await prompter.note("Skipping Control UI/TUI prompts.", t("onboarding.finalize.controlUi"));
  }

  await prompter.note(
    [
      t("onboarding.finalize.backupNote"),
      "Docs: https://docs.openclaw.ai/concepts/agent-workspace",
    ].join("\n"),
    t("onboarding.finalize.backupNote"),
  );

  await prompter.note(
    "Running agents on your computer is risky — harden your setup: https://docs.openclaw.ai/security",
    t("onboarding.security.title"),
  );

  const shouldOpenControlUi =
    !opts.skipUi &&
    settings.authMode === "token" &&
    Boolean(settings.gatewayToken) &&
    hatchChoice === null;
  if (shouldOpenControlUi) {
    const browserSupport = await detectBrowserOpenSupport();
    if (browserSupport.ok) {
      controlUiOpened = await openUrl(authedUrl);
      if (!controlUiOpened) {
        controlUiOpenHint = formatControlUiSshHint({
          port: settings.port,
          basePath: controlUiBasePath,
          token: settings.gatewayToken,
        });
      }
    } else {
      controlUiOpenHint = formatControlUiSshHint({
        port: settings.port,
        basePath: controlUiBasePath,
        token: settings.gatewayToken,
      });
    }

    await prompter.note(
      [
        `${t("onboarding.finalize.dashboardReady")} (${t("onboarding.gatewayConfig.authToken")}): ${authedUrl}`,
        controlUiOpened
          ? t("onboarding.finalize.dashboardOpened")
          : t("onboarding.finalize.dashboardCopy"),
        controlUiOpenHint,
      ]
        .filter(Boolean)
        .join("\n"),
      t("onboarding.finalize.dashboardReady"),
    );
  }

  const webSearchKey = (nextConfig.tools?.web?.search?.apiKey ?? "").trim();
  const webSearchEnv = (process.env.BRAVE_API_KEY ?? "").trim();
  const hasWebSearchKey = Boolean(webSearchKey || webSearchEnv);
  await prompter.note(
    hasWebSearchKey
      ? [
        t("onboarding.finalize.webSearchEnabled"),
        "",
        webSearchKey
          ? t("onboarding.finalize.webSearchKeyConfig")
          : t("onboarding.finalize.webSearchKeyEnv"),
        "Docs: https://docs.openclaw.ai/tools/web",
      ].join("\n")
      : [
        t("onboarding.finalize.webSearchDisabled"),
        "",
        `设置命令: ${formatCliCommand("openclaw configure --section web")}`,
        "Docs: https://docs.openclaw.ai/tools/web",
      ].join("\n"),
    t("onboarding.finalize.webSearchOptional"),
  );

  await prompter.note(
    'Showcase: https://openclaw.ai/showcase',
    t("onboarding.finalize.whatNow"),
  );

  await prompter.outro(
    controlUiOpened
      ? t("onboarding.finalize.onboardingCompleteOpened")
      : seededInBackground
        ? t("onboarding.finalize.onboardingCompleteSeeded")
        : t("onboarding.finalize.onboardingComplete"),
  );
}

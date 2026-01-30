import { randomToken } from "../commands/onboard-helpers.js";
import type { GatewayAuthChoice } from "../commands/onboard-types.js";
import type { OpenClawConfig } from "../config/config.js";
import { findTailscaleBinary } from "../infra/tailscale.js";
import type { RuntimeEnv } from "../runtime.js";
import type {
  GatewayWizardSettings,
  QuickstartGatewayDefaults,
  WizardFlow,
} from "./onboarding.types.js";
import type { WizardPrompter } from "./prompts.js";
import { t } from "./i18n.js";

type ConfigureGatewayOptions = {
  flow: WizardFlow;
  baseConfig: OpenClawConfig;
  nextConfig: OpenClawConfig;
  localPort: number;
  quickstartGateway: QuickstartGatewayDefaults;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
};

type ConfigureGatewayResult = {
  nextConfig: OpenClawConfig;
  settings: GatewayWizardSettings;
};

export async function configureGatewayForOnboarding(
  opts: ConfigureGatewayOptions,
): Promise<ConfigureGatewayResult> {
  const { flow, localPort, quickstartGateway, prompter } = opts;
  let { nextConfig } = opts;

  const port =
    flow === "quickstart"
      ? quickstartGateway.port
      : Number.parseInt(
        String(
          await prompter.text({
            message: t("onboarding.gatewayConfig.port"),
            initialValue: String(localPort),
            validate: (value) => (Number.isFinite(Number(value)) ? undefined : t("onboarding.gatewayConfig.invalidPort")),
          }),
        ),
        10,
      );

  let bind = (
    flow === "quickstart"
      ? quickstartGateway.bind
      : ((await prompter.select({
        message: t("onboarding.gatewayConfig.bind"),
        options: [
          { value: "loopback", label: t("onboarding.gateway.bindLoopback") },
          { value: "lan", label: t("onboarding.gateway.bindLan") },
          { value: "tailnet", label: t("onboarding.gateway.bindTailnet") },
          { value: "auto", label: t("onboarding.gateway.bindAuto") },
          { value: "custom", label: t("onboarding.gateway.bindCustom") },
        ],
      })) as "loopback" | "lan" | "auto" | "custom" | "tailnet")
  ) as "loopback" | "lan" | "auto" | "custom" | "tailnet";

  let customBindHost = quickstartGateway.customBindHost;
  if (bind === "custom") {
    const needsPrompt = flow !== "quickstart" || !customBindHost;
    if (needsPrompt) {
      const input = await prompter.text({
        message: t("onboarding.gatewayConfig.customIp"),
        placeholder: "192.168.1.100",
        initialValue: customBindHost ?? "",
        validate: (value) => {
          if (!value) return t("onboarding.gatewayConfig.customIpRequired");
          const trimmed = value.trim();
          const parts = trimmed.split(".");
          if (parts.length !== 4) return t("onboarding.gatewayConfig.invalidIp");
          if (
            parts.every((part) => {
              const n = parseInt(part, 10);
              return !Number.isNaN(n) && n >= 0 && n <= 255 && part === String(n);
            })
          )
            return undefined;
          return t("onboarding.gatewayConfig.invalidIpOctet");
        },
      });
      customBindHost = typeof input === "string" ? input.trim() : undefined;
    }
  }

  let authMode = (
    flow === "quickstart"
      ? quickstartGateway.authMode
      : ((await prompter.select({
        message: t("onboarding.gatewayConfig.auth"),
        options: [
          {
            value: "token",
            label: t("onboarding.gatewayConfig.authToken"),
            hint: t("onboarding.gatewayConfig.authTokenHint"),
          },
          { value: "password", label: t("onboarding.gatewayConfig.authPassword") },
        ],
        initialValue: "token",
      })) as GatewayAuthChoice)
  ) as GatewayAuthChoice;

  const tailscaleMode = (
    flow === "quickstart"
      ? quickstartGateway.tailscaleMode
      : ((await prompter.select({
        message: t("onboarding.gatewayConfig.tsExposure"),
        options: [
          { value: "off", label: t("onboarding.gatewayConfig.tsOff"), hint: t("onboarding.gatewayConfig.tsOffHint") },
          {
            value: "serve",
            label: t("onboarding.gatewayConfig.tsServe"),
            hint: t("onboarding.gatewayConfig.tsServeHint"),
          },
          {
            value: "funnel",
            label: t("onboarding.gatewayConfig.tsFunnel"),
            hint: t("onboarding.gatewayConfig.tsFunnelHint"),
          },
        ],
      })) as "off" | "serve" | "funnel")
  ) as "off" | "serve" | "funnel";

  // Detect Tailscale binary before proceeding with serve/funnel setup.
  if (tailscaleMode !== "off") {
    const tailscaleBin = await findTailscaleBinary();
    if (!tailscaleBin) {
      await prompter.note(
        t("onboarding.gatewayConfig.tsNotFound"),
        t("onboarding.gatewayConfig.tsWarningTitle"),
      );
    }
  }

  let tailscaleResetOnExit = flow === "quickstart" ? quickstartGateway.tailscaleResetOnExit : false;
  if (tailscaleMode !== "off" && flow !== "quickstart") {
    await prompter.note(
      [t("onboarding.finalize.healthDocsPrefix"), "https://docs.openclaw.ai/gateway/tailscale", "https://docs.openclaw.ai/web"].join(
        "\n",
      ),
      t("onboarding.gateway.tailscale"),
    );
    tailscaleResetOnExit = Boolean(
      await prompter.confirm({
        message: t("onboarding.gatewayConfig.tsResetConfirm"),
        initialValue: false,
      }),
    );
  }

  // Safety + constraints:
  // - Tailscale wants bind=loopback so we never expose a non-loopback server + tailscale serve/funnel at once.
  // - Funnel requires password auth.
  if (tailscaleMode !== "off" && bind !== "loopback") {
    await prompter.note(t("onboarding.gatewayConfig.tsAdjustBind"), t("onboarding.gateway.tailscale"));
    bind = "loopback";
    customBindHost = undefined;
  }

  if (tailscaleMode === "funnel" && authMode !== "password") {
    await prompter.note(t("onboarding.gatewayConfig.tsFunnelAuth"), t("onboarding.gateway.tailscale"));
    authMode = "password";
  }

  let gatewayToken: string | undefined;
  if (authMode === "token") {
    if (flow === "quickstart") {
      gatewayToken = quickstartGateway.token ?? randomToken();
    } else {
      const tokenInput = await prompter.text({
        message: t("onboarding.gatewayConfig.tokenPlaceholder"),
        placeholder: t("onboarding.gatewayConfig.tokenHint"),
        initialValue: quickstartGateway.token ?? "",
      });
      gatewayToken = String(tokenInput).trim() || randomToken();
    }
  }

  if (authMode === "password") {
    const password =
      flow === "quickstart" && quickstartGateway.password
        ? quickstartGateway.password
        : await prompter.text({
          message: t("onboarding.gatewayConfig.passwordLabel"),
          validate: (value) => (value?.trim() ? undefined : t("onboarding.gatewayConfig.passwordRequired")),
        });
    nextConfig = {
      ...nextConfig,
      gateway: {
        ...nextConfig.gateway,
        auth: {
          ...nextConfig.gateway?.auth,
          mode: "password",
          password: String(password).trim(),
        },
      },
    };
  } else if (authMode === "token") {
    nextConfig = {
      ...nextConfig,
      gateway: {
        ...nextConfig.gateway,
        auth: {
          ...nextConfig.gateway?.auth,
          mode: "token",
          token: gatewayToken,
        },
      },
    };
  }

  nextConfig = {
    ...nextConfig,
    gateway: {
      ...nextConfig.gateway,
      port,
      bind,
      ...(bind === "custom" && customBindHost ? { customBindHost } : {}),
      tailscale: {
        ...nextConfig.gateway?.tailscale,
        mode: tailscaleMode,
        resetOnExit: tailscaleResetOnExit,
      },
    },
  };

  return {
    nextConfig,
    settings: {
      port,
      bind,
      customBindHost: bind === "custom" ? customBindHost : undefined,
      authMode,
      gatewayToken,
      tailscaleMode,
      tailscaleResetOnExit,
    },
  };
}

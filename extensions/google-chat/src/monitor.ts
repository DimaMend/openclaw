import { PubSub } from "@google-cloud/pubsub";
import type { ClawdbotConfig } from "clawdbot/plugin-sdk";
import type { ResolvedGoogleChatAccount } from "./accounts.js";
import type { GoogleChatEvent } from "./types.js";
import { getGoogleChatRuntime } from "./runtime.js";
import { monitorGoogleChatWebhook } from "./webhook.js";

export type MonitorOptions = {
  account: ResolvedGoogleChatAccount;
  config: ClawdbotConfig;
  runtime: any;
  abortSignal: AbortSignal;
};

export async function monitorGoogleChatProvider(
  options: MonitorOptions,
): Promise<void> {
  const { account, runtime, config, abortSignal } = options;

  // Check if webhook mode is enabled
  const webhookMode = account.webhookMode || false;

  if (webhookMode) {
    // Use webhook mode
    return monitorGoogleChatWebhookMode(options);
  } else {
    // Use Pub/Sub mode (original implementation)
    return monitorGoogleChatPubSubMode(options);
  }
}

async function monitorGoogleChatWebhookMode(
  options: MonitorOptions,
): Promise<void> {
  const { account, runtime, config, abortSignal } = options;

  const handleEvent = async (event: GoogleChatEvent) => {
    // Process Google Chat events
    // TODO: Route to agent via runtime
    runtime.log?.(`[${account.accountId}] Received webhook event: ${event.type}`);
  };

  const { stop } = await monitorGoogleChatWebhook({
    accountId: account.accountId,
    config,
    webhookPort: account.webhookPort,
    webhookHost: account.webhookHost,
    webhookPath: account.webhookPath,
    webhookPublicUrl: account.webhookPublicUrl,
    onMessage: handleEvent,
    runtime,
    abortSignal,
  });

  // Keep alive until aborted
  await new Promise<void>((resolve) => {
    abortSignal.addEventListener("abort", () => {
      stop();
      resolve();
    });
  });
}

async function monitorGoogleChatPubSubMode(
  options: MonitorOptions,
): Promise<void> {
  const { account, runtime, abortSignal } = options;

  if (!account.credentialsPath || !account.subscriptionName) {
    throw new Error("Google Chat account not properly configured");
  }

  const pubsub = new PubSub({
    projectId: account.projectId,
    keyFilename: account.credentialsPath,
  });

  const subscription = pubsub.subscription(account.subscriptionName);

  const messageHandler = async (message: any) => {
    try {
      const event: GoogleChatEvent = JSON.parse(message.data.toString());

      // Process Google Chat events
      // TODO: Route to agent via runtime

      runtime.log?.(`[${account.accountId}] Received event: ${event.type}`);

      message.ack();
    } catch (error) {
      runtime.log?.(`[${account.accountId}] Error processing message: ${String(error)}`);
      message.nack();
    }
  };

  subscription.on("message", messageHandler);

  // Handle abort signal
  abortSignal.addEventListener("abort", () => {
    subscription.removeListener("message", messageHandler);
    subscription.close();
  });

  runtime.log?.(`[${account.accountId}] Google Chat monitor started`);

  // Keep alive until aborted
  await new Promise<void>((resolve) => {
    abortSignal.addEventListener("abort", () => resolve());
  });
}

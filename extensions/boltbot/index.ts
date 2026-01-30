import type { MoltbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";
import { createActionLogger } from "./src/action-logger.js";
import { createReceiptStore } from "./src/receipt-store.js";
import { registerBoltbotApi } from "./src/api.js";
import { registerDashboardRoutes } from "./src/dashboard-serve.js";

export default {
  id: "boltbot",
  name: "Boltbot — Audit Dashboard",
  description: "Tool-call audit trail and verification dashboard for Moltbot",
  configSchema: emptyPluginConfigSchema(),

  register(api: MoltbotPluginApi) {
    const store = createReceiptStore(process.env.BOLTBOT_RECEIPT_BACKEND);
    const logger = createActionLogger(store);
    api.on("after_tool_call", logger);

    registerBoltbotApi(api, store);
    registerDashboardRoutes(api);
  },
};

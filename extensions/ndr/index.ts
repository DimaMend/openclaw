import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";

import { ndrPlugin } from "./src/channel.js";
import { setNdrRuntime } from "./src/runtime.js";

const plugin = {
  id: "ndr",
  name: "NDR",
  description: "Forward-secure E2E encryption via nostr-double-ratchet",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setNdrRuntime(api.runtime);
    api.registerChannel({ plugin: ndrPlugin });
  },
};

export default plugin;

import type { OpenClawPluginApi } from "../../src/plugins/types.js";

import { createExecuteRemoteTool } from "./src/execute-remote-tool.js";
import { createSyncWorkspaceTool } from "./src/sync-workspace-tool.js";

export default function register(api: OpenClawPluginApi) {
  // Register remote execution tool for agents
  api.registerTool(createExecuteRemoteTool(api), { optional: true });

  // Register workspace sync tool
  api.registerTool(createSyncWorkspaceTool(api), { optional: true });
}

import { Sandbox } from "@e2b/code-interpreter";
import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

type PluginConfig = {
  apiKey?: string;
  enabled?: boolean;
  timeoutMs?: number;
  template?: string;
};

/**
 * Execute commands remotely in E2B sandbox
 * Designed to avoid local disk usage for heavy operations like npm install
 */
export function createExecuteRemoteTool(api: OpenClawPluginApi) {
  return {
    name: "execute_remote",
    description:
      "Execute shell commands remotely in an E2B sandbox. Use this for disk-intensive operations like 'npm install', 'pip install', running tests, or building projects. The sandbox has Node.js, Python, and common dev tools pre-installed. Results are streamed back.",
    parameters: Type.Object({
      command: Type.String({ description: "Shell command to execute in the sandbox" }),
      workingDirectory: Type.Optional(
        Type.String({ description: "Working directory for command execution (default: /home/user)" }),
      ),
      env: Type.Optional(
        Type.Record(Type.String(), Type.String(), {
          description: "Environment variables for the command",
        }),
      ),
      uploadFiles: Type.Optional(
        Type.Array(
          Type.Object({
            path: Type.String({ description: "Remote path in sandbox" }),
            content: Type.String({ description: "File content (text or base64)" }),
          }),
          { description: "Files to upload before execution" },
        ),
      ),
      downloadPaths: Type.Optional(
        Type.Array(Type.String(), {
          description: "Paths to download after execution (e.g., dist/, build/)",
        }),
      ),
      timeoutMs: Type.Optional(
        Type.Number({ description: "Override timeout for this execution" }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const config = (api.pluginConfig ?? {}) as PluginConfig;

      if (!config.enabled) {
        throw new Error(
          "E2B executor is not enabled. Set enabled: true in plugin config and provide apiKey.",
        );
      }

      if (!config.apiKey) {
        throw new Error("E2B API key not configured. Add apiKey to plugin config.");
      }

      const command = typeof params.command === "string" ? params.command : "";
      if (!command.trim()) {
        throw new Error("command is required");
      }

      const workingDirectory =
        typeof params.workingDirectory === "string" ? params.workingDirectory : "/home/user";
      const env = (params.env as Record<string, string>) ?? {};
      const uploadFiles = (params.uploadFiles as Array<{ path: string; content: string }>) ?? [];
      const downloadPaths = (params.downloadPaths as string[]) ?? [];
      const timeoutMs =
        typeof params.timeoutMs === "number" ? params.timeoutMs : config.timeoutMs ?? 300000;

      let sandbox: Sandbox | null = null;
      const output: string[] = [];

      try {
        // Create sandbox
        output.push("🚀 Creating E2B sandbox...");
        sandbox = await Sandbox.create({
          apiKey: config.apiKey,
          template: config.template ?? "base",
          timeoutMs,
        });
        output.push(`✓ Sandbox created: ${sandbox.sandboxId}`);

        // Upload files if provided
        if (uploadFiles.length > 0) {
          output.push(`\n📤 Uploading ${uploadFiles.length} file(s)...`);
          for (const file of uploadFiles) {
            await sandbox.files.write(file.path, file.content);
            output.push(`  ✓ ${file.path}`);
          }
        }

        // Execute command
        output.push(`\n💻 Executing: ${command}`);
        output.push(`📁 Working directory: ${workingDirectory}`);
        output.push("");

        const proc = await sandbox.process.start({
          cmd: command,
          cwd: workingDirectory,
          envs: env,
          onStdout: (data) => output.push(data.line),
          onStderr: (data) => output.push(`[stderr] ${data.line}`),
        });

        const exitCode = await proc.wait();
        output.push("");
        output.push(`Exit code: ${exitCode}`);

        // Download files if requested
        const downloads: Record<string, string> = {};
        if (downloadPaths.length > 0) {
          output.push(`\n📥 Downloading ${downloadPaths.length} path(s)...`);
          for (const remotePath of downloadPaths) {
            try {
              const content = await sandbox.files.read(remotePath);
              downloads[remotePath] = content;
              output.push(`  ✓ ${remotePath}`);
            } catch (err) {
              output.push(`  ✗ ${remotePath} (${err instanceof Error ? err.message : "error"})`);
            }
          }
        }

        // Clean up
        output.push("\n🧹 Cleaning up sandbox...");
        await sandbox.kill();
        output.push("✓ Done");

        return {
          content: [
            {
              type: "text",
              text: output.join("\n"),
            },
          ],
          details: {
            exitCode,
            sandboxId: sandbox.sandboxId,
            downloads,
          },
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        output.push(`\n❌ Error: ${errorMsg}`);

        if (sandbox) {
          try {
            await sandbox.kill();
          } catch {
            // ignore cleanup errors
          }
        }

        return {
          content: [
            {
              type: "text",
              text: output.join("\n"),
            },
          ],
          isError: true,
          details: { error: errorMsg },
        };
      }
    },
  };
}

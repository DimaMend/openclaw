import { Sandbox } from "@e2b/code-interpreter";
import { Type } from "@sinclair/typebox";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

type PluginConfig = {
  apiKey?: string;
  enabled?: boolean;
  timeoutMs?: number;
  template?: string;
};

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip node_modules, .git, and hidden files
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith(".")) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath, baseDir)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Sync workspace to/from E2B sandbox
 * Useful for uploading entire project directories for remote execution
 */
export function createSyncWorkspaceTool(api: OpenClawPluginApi) {
  return {
    name: "sync_workspace",
    description:
      "Sync an entire workspace directory to an E2B sandbox for remote execution. Use this when you need to work with a full project remotely (e.g., clone a repo and run tests without filling local disk). Returns a sandbox ID that can be reused.",
    parameters: Type.Object({
      localPath: Type.String({ description: "Local directory path to sync" }),
      remotePath: Type.Optional(
        Type.String({ description: "Remote path in sandbox (default: /home/user/workspace)" }),
      ),
      excludePatterns: Type.Optional(
        Type.Array(Type.String(), {
          description: "Glob patterns to exclude (e.g., ['node_modules', '*.log'])",
        }),
      ),
      sandboxId: Type.Optional(
        Type.String({
          description: "Existing sandbox ID to reuse (creates new if not provided)",
        }),
      ),
      createNew: Type.Optional(
        Type.Boolean({ description: "Force create new sandbox even if sandboxId provided" }),
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

      const localPath = typeof params.localPath === "string" ? params.localPath : "";
      if (!localPath.trim()) {
        throw new Error("localPath is required");
      }

      const remotePath =
        typeof params.remotePath === "string" ? params.remotePath : "/home/user/workspace";
      const sandboxId = typeof params.sandboxId === "string" ? params.sandboxId : undefined;
      const createNew = params.createNew === true;

      const output: string[] = [];
      let sandbox: Sandbox | null = null;

      try {
        // Create or connect to sandbox
        if (sandboxId && !createNew) {
          output.push(`🔗 Connecting to existing sandbox: ${sandboxId}`);
          sandbox = await Sandbox.connect(sandboxId, { apiKey: config.apiKey });
        } else {
          output.push("🚀 Creating new E2B sandbox...");
          sandbox = await Sandbox.create({
            apiKey: config.apiKey,
            template: config.template ?? "base",
            timeoutMs: config.timeoutMs ?? 300000,
          });
          output.push(`✓ Sandbox created: ${sandbox.sandboxId}`);
        }

        // Get all files in local directory
        output.push(`\n📂 Scanning ${localPath}...`);
        const files = await getAllFiles(localPath);
        output.push(`Found ${files.length} file(s) to sync`);

        // Upload files
        output.push("\n📤 Uploading files...");
        let uploaded = 0;
        for (const file of files) {
          const relativePath = relative(localPath, file);
          const remoteFilePath = join(remotePath, relativePath).replace(/\\/g, "/");

          try {
            const content = await readFile(file, "utf-8");
            await sandbox.files.write(remoteFilePath, content);
            uploaded++;

            if (uploaded % 10 === 0) {
              output.push(`  ✓ Uploaded ${uploaded}/${files.length} files...`);
            }
          } catch (err) {
            output.push(
              `  ✗ Failed to upload ${relativePath}: ${err instanceof Error ? err.message : "error"}`,
            );
          }
        }

        output.push(`\n✓ Sync complete: ${uploaded}/${files.length} files uploaded`);
        output.push(`📁 Remote path: ${remotePath}`);
        output.push(`🆔 Sandbox ID: ${sandbox.sandboxId}`);
        output.push(
          "\n💡 Tip: Use execute_remote with this sandboxId to run commands in this workspace",
        );

        return {
          content: [
            {
              type: "text",
              text: output.join("\n"),
            },
          ],
          details: {
            sandboxId: sandbox.sandboxId,
            filesUploaded: uploaded,
            totalFiles: files.length,
            remotePath,
          },
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        output.push(`\n❌ Error: ${errorMsg}`);

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

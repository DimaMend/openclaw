/**
 * Web Search CLI Executor
 */

import * as child_process from 'child_process';
import type { WebSearchResult } from './messages.js';
import type { ExecuteResult, ExecuteOptions } from '../deep-research/executor.js';
import { formatErrorMessage } from '../infra/errors.js';

export interface ExecuteWebSearchOptions extends Omit<ExecuteOptions, 'topic'> {
  cliPath?: string;
  timeoutMs?: number;
}

export interface ExecuteWebSearchResult extends Omit<ExecuteResult, 'resultJsonPath'> {
  result?: WebSearchResult;
}

/**
 * Execute web search via Gemini CLI
 */
export async function executeWebSearch(
  query: string,
  options: ExecuteWebSearchOptions = {}
): Promise<ExecuteWebSearchResult> {
  const {
    cliPath = "/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh",
    timeoutMs = 30000,
    dryRun = false,
  } = options;
  
  if (dryRun) {
    return {
      success: true,
      runId: `dry-run-${Date.now()}`,
      result: {
        response: "DRY RUN: Would search for: " + query,
        session_id: `dry-run-${Date.now()}`,
        stats: {
          models: {
            "gemini-1.5": {
              api: { totalRequests: 0, totalErrors: 0 },
              tokens: { input: 0, candidates: 0, total: 0 }
            }
          }
        }
      },
      stdout: "",
      stderr: ""
    };
  }
  
  try {
    // Escape the query for shell safety
    const escapedQuery = query.replace(/["\\$`!]/g, '\\$&');
    const cmd = `${cliPath} --request "${escapedQuery}"`;
    
    // Use exec directly with a Promise wrapper (avoids promisify issues with mocks)
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      child_process.exec(
        cmd,
        { timeout: timeoutMs, encoding: 'utf8', env: { ...process.env, PATH: process.env.PATH } },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
    });
    
    // Parse JSON output
    let result: WebSearchResult;
    try {
      result = JSON.parse(stdout.trim());
    } catch (parseError) {
      // Fallback: treat stdout as the response
      result = {
        response: stdout.trim(),
        session_id: `fallback-${Date.now()}`,
        stats: {
          models: { "unknown": { api: { totalRequests: 1, totalErrors: 0 }, tokens: { input: 0, candidates: 0, total: 0 } } }
        }
      };
    }
    
    return {
      success: true,
      runId: result.session_id,
      result,
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };
    
  } catch (error) {
    const errorMessage = formatExecutionError(error, cliPath);
    
    return {
      success: false,
      runId: `error-${Date.now()}`,
      error: errorMessage,
      stdout: "",
      stderr: String(error)
    };
  }
}

/**
 * Format execution errors for user display
 */
function formatExecutionError(error: unknown, cliPath: string): string {
  const errorStr = String(error);
  
  // Timeout
  if (errorStr.includes('timeout') || errorStr.includes('ETIMEOUT')) {
    return `Search timeout after 30 seconds. Query took too long to process.`;
  }
  
  // CLI not found
  if (errorStr.includes('ENOENT') || errorStr.includes('not found')) {
    return `CLI not found at ${cliPath}. Check webSearch.cliPath configuration.`;
  }
  
  // Permission denied
  if (errorStr.includes('EACCES') || errorStr.includes('Permission denied')) {
    return `CLI at ${cliPath} is not executable. Check file permissions.`;
  }
  
  // API errors (captured in stderr)
  if (errorStr.includes('API') || errorStr.includes('api')) {
    return `Gemini API error: ${errorStr}. Check API key and network connection.`;
  }
  
  // Generic error
  return `Search failed: ${formatErrorMessage(error)}`;
}

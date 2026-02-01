/**
 * SkillScan Security Scanner for OpenClaw
 * Scans skills for security vulnerabilities
 */

import fs from "node:fs";
import path from "node:path";
import { securityPatterns } from "./patterns.js";
import type { Finding, Permission, SkillScanResult, Severity } from "./types.js";

const SCAN_EXTENSIONS = new Set([".js", ".ts", ".mjs", ".sh", ".py", ".md"]);
const IGNORE_DIRS = new Set(["node_modules", "dist", ".git", "__pycache__"]);

export class SkillScanner {
  async scan(skillPath: string): Promise<SkillScanResult> {
    const startTime = Date.now();
    const absolutePath = path.resolve(skillPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Path does not exist: ${absolutePath}`);
    }

    const stats = fs.statSync(absolutePath);
    const isDirectory = stats.isDirectory();

    const files = isDirectory ? this.getFilesRecursive(absolutePath) : [absolutePath];

    const findings: Finding[] = [];
    const permissions: Permission[] = [];
    let totalLines = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        totalLines += content.split("\n").length;

        const fileFindings = this.detectPatterns(content, file, absolutePath);
        findings.push(...fileFindings);

        const filePermissions = this.extractPermissions(content, file, absolutePath);
        permissions.push(...filePermissions);
      } catch {
        // Skip unreadable files
      }
    }

    const duration = Date.now() - startTime;
    const summary = this.summarize(findings);
    const riskScore = this.calculateRisk(findings);

    return {
      skillPath: absolutePath,
      skillName: path.basename(absolutePath),
      scanTime: new Date(),
      duration,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      findings: this.dedupe(findings),
      permissions,
      fileCount: files.length,
      linesOfCode: totalLines,
      summary,
    };
  }

  private getFilesRecursive(dirPath: string): string[] {
    const files: string[] = [];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!IGNORE_DIRS.has(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            // Skip test files
            if (entry.name.includes(".test.") || entry.name.includes(".spec.")) {
              continue;
            }
            if (SCAN_EXTENSIONS.has(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Skip unreadable directories
      }
    };

    walk(dirPath);
    return files;
  }

  private detectPatterns(content: string, filePath: string, basePath: string): Finding[] {
    const findings: Finding[] = [];
    const lines = content.split("\n");
    const relativePath = path.relative(basePath, filePath);

    for (const pattern of securityPatterns) {
      if (pattern.strings) {
        for (const str of pattern.strings) {
          let lineNum = 0;
          for (const line of lines) {
            lineNum++;
            if (line.includes(str)) {
              findings.push({
                id: pattern.id,
                severity: pattern.severity,
                category: pattern.category,
                title: pattern.name,
                description: pattern.description,
                file: relativePath,
                line: lineNum,
                code: line.trim().substring(0, 150),
                recommendation: pattern.recommendation,
              });
            }
          }
        }
      }

      if (pattern.regex) {
        let lineNum = 0;
        for (const line of lines) {
          lineNum++;
          if (pattern.regex.test(line)) {
            findings.push({
              id: pattern.id,
              severity: pattern.severity,
              category: pattern.category,
              title: pattern.name,
              description: pattern.description,
              file: relativePath,
              line: lineNum,
              code: line.trim().substring(0, 150),
              recommendation: pattern.recommendation,
            });
          }
        }
      }
    }
    return findings;
  }

  private extractPermissions(
    content: string,
    filePath: string,
    basePath: string,
  ): Permission[] {
    const permissions: Permission[] = [];
    const lines = content.split("\n");
    const relativePath = path.relative(basePath, filePath);

    const patterns: [RegExp, Permission["type"], (m: RegExpMatchArray) => string][] = [
      [/fs\.readFile(?:Sync)?\s*\(\s*['"`]([^'"`]+)/g, "file_read", (m) => m[1]],
      [/fs\.writeFile(?:Sync)?\s*\(\s*['"`]([^'"`]+)/g, "file_write", (m) => m[1]],
      [/fetch\s*\(\s*['"`]([^'"`]+)/g, "network", (m) => m[1]],
      [/axios\.[a-z]+\s*\(\s*['"`]([^'"`]+)/g, "network", (m) => m[1]],
      [/process\.env\.([A-Z_][A-Z0-9_]*)/g, "env_access", (m) => m[1]],
      [/process\.env\[['"`]([^'"`]+)/g, "env_access", (m) => m[1]],
    ];

    let lineNum = 0;
    for (const line of lines) {
      lineNum++;
      for (const [regex, type, extract] of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(line)) !== null) {
          permissions.push({
            type,
            target: extract(match),
            file: relativePath,
            line: lineNum,
          });
        }
      }

      if (/exec(?:Sync)?\s*\(|spawn(?:Sync)?\s*\(/.test(line)) {
        permissions.push({
          type: "exec",
          target: "shell",
          file: relativePath,
          line: lineNum,
        });
      }
      if (/\beval\s*\(/.test(line)) {
        permissions.push({
          type: "eval",
          target: "dynamic code",
          file: relativePath,
          line: lineNum,
        });
      }
    }
    return permissions;
  }

  private dedupe(findings: Finding[]): Finding[] {
    const seen = new Set<string>();
    return findings.filter((f) => {
      const key = `${f.id}:${f.file}:${f.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private summarize(findings: Finding[]) {
    return {
      critical: findings.filter((f) => f.severity === "CRITICAL").length,
      high: findings.filter((f) => f.severity === "HIGH").length,
      medium: findings.filter((f) => f.severity === "MEDIUM").length,
      low: findings.filter((f) => f.severity === "LOW").length,
      info: findings.filter((f) => f.severity === "INFO").length,
    };
  }

  private calculateRisk(findings: Finding[]): number {
    const weights: Record<Severity, number> = {
      CRITICAL: 40,
      HIGH: 20,
      MEDIUM: 10,
      LOW: 5,
      INFO: 1,
    };
    let score = 0;
    for (const f of findings) {
      score += weights[f.severity] || 0;
    }
    return Math.min(100, score);
  }

  private getRiskLevel(score: number): SkillScanResult["riskLevel"] {
    if (score >= 80) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    if (score >= 10) return "LOW";
    return "SAFE";
  }
}

// Singleton for reuse
export const skillScanner = new SkillScanner();

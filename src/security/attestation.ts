/**
 * SkillScan Attestation for OpenClaw
 * Creates signed attestations of skill security status
 */

import crypto from "node:crypto";
import type { SkillEntry } from "../agents/skills/types.js";
import { skillScanner } from "./scanner.js";
import type { AttestationResult, SkillScanResult } from "./types.js";

const ATTESTATION_VERSION = "1.0.0";

export interface AttestationOptions {
  agentId: string;
  secretKey?: string;
}

export interface SkillSecurityReport {
  skills: Array<{
    name: string;
    path: string;
    scanResult: SkillScanResult;
  }>;
  overallRiskScore: number;
  overallRiskLevel: string;
}

/**
 * Scan all loaded skills and generate a security report
 */
export async function scanSkillsForSecurity(
  entries: SkillEntry[],
): Promise<SkillSecurityReport> {
  const skills: SkillSecurityReport["skills"] = [];
  let totalRiskScore = 0;

  for (const entry of entries) {
    try {
      const scanResult = await skillScanner.scan(entry.skill.baseDir);
      skills.push({
        name: entry.skill.name,
        path: entry.skill.baseDir,
        scanResult,
      });
      totalRiskScore += scanResult.riskScore;
    } catch (error) {
      // If scan fails, assume high risk
      skills.push({
        name: entry.skill.name,
        path: entry.skill.baseDir,
        scanResult: {
          skillName: entry.skill.name,
          skillPath: entry.skill.baseDir,
          scanTime: new Date(),
          duration: 0,
          riskScore: 50,
          riskLevel: "HIGH",
          findings: [
            {
              id: "SCAN_ERROR",
              severity: "HIGH",
              category: "error",
              title: "Scan Failed",
              description: `Could not scan skill: ${error instanceof Error ? error.message : "Unknown error"}`,
              file: "",
              recommendation: "Ensure skill directory is accessible",
            },
          ],
          permissions: [],
          fileCount: 0,
          linesOfCode: 0,
          summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
        },
      });
      totalRiskScore += 50;
    }
  }

  const overallRiskScore =
    skills.length > 0 ? Math.round(totalRiskScore / skills.length) : 0;
  const overallRiskLevel = getRiskLevel(overallRiskScore);

  return {
    skills,
    overallRiskScore,
    overallRiskLevel,
  };
}

/**
 * Generate a signed attestation of the security scan
 */
export function generateAttestation(
  report: SkillSecurityReport,
  options: AttestationOptions,
): AttestationResult {
  const timestamp = new Date().toISOString();

  const attestation: Omit<AttestationResult, "signature"> = {
    version: ATTESTATION_VERSION,
    timestamp,
    agentId: options.agentId,
    skills: report.skills.map((s) => ({
      name: s.name,
      path: s.path,
      riskScore: s.scanResult.riskScore,
      riskLevel: s.scanResult.riskLevel,
      findingsCount: s.scanResult.findings.length,
    })),
    overallRiskScore: report.overallRiskScore,
    overallRiskLevel: report.overallRiskLevel,
  };

  // Create signature
  const payload = JSON.stringify(attestation);
  const secretKey = options.secretKey || process.env.OPENCLAW_ATTESTATION_SECRET || "default-key";
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  return {
    ...attestation,
    signature,
  };
}

/**
 * Verify an attestation signature
 */
export function verifyAttestation(
  attestation: AttestationResult,
  secretKey?: string,
): boolean {
  const { signature, ...payload } = attestation;
  const key = secretKey || process.env.OPENCLAW_ATTESTATION_SECRET || "default-key";
  const expectedSignature = crypto
    .createHmac("sha256", key)
    .update(JSON.stringify(payload))
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

function getRiskLevel(score: number): string {
  if (score >= 80) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  if (score >= 10) return "LOW";
  return "SAFE";
}

export { type AttestationResult, type SkillScanResult } from "./types.js";

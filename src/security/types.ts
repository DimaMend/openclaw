/**
 * SkillScan Security Types for OpenClaw
 */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  file: string;
  line?: number;
  code?: string;
  recommendation: string;
}

export interface Permission {
  type: "file_read" | "file_write" | "network" | "env_access" | "exec" | "eval";
  target: string;
  file: string;
  line?: number;
}

export interface SkillScanResult {
  skillName: string;
  skillPath: string;
  scanTime: Date;
  duration: number;
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  findings: Finding[];
  permissions: Permission[];
  fileCount: number;
  linesOfCode: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface SecurityPattern {
  id: string;
  name: string;
  severity: Severity;
  category: string;
  description: string;
  recommendation: string;
  regex?: RegExp;
  strings?: string[];
}

export interface AttestationResult {
  version: string;
  timestamp: string;
  agentId: string;
  skills: Array<{
    name: string;
    path: string;
    riskScore: number;
    riskLevel: string;
    findingsCount: number;
  }>;
  overallRiskScore: number;
  overallRiskLevel: string;
  signature: string;
}

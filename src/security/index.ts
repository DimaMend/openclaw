/**
 * OpenClaw Security Module
 * Provides skill security scanning and attestation
 */

export { SkillScanner, skillScanner } from "./scanner.js";
export { securityPatterns } from "./patterns.js";
export {
  scanSkillsForSecurity,
  generateAttestation,
  verifyAttestation,
  type AttestationOptions,
  type SkillSecurityReport,
} from "./attestation.js";
export type {
  Severity,
  Finding,
  Permission,
  SkillScanResult,
  SecurityPattern,
  AttestationResult,
} from "./types.js";

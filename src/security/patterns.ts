/**
 * SkillScan Security Patterns for OpenClaw
 * 18 detection patterns for AI agent skill security
 */

import type { SecurityPattern } from "./types.js";

export const securityPatterns: SecurityPattern[] = [
  // CRITICAL - Credential Theft
  {
    id: "CRED001",
    name: "Environment Variable Exfiltration",
    severity: "CRITICAL",
    category: "credential-theft",
    description: "Code reads environment variables and may send them externally",
    recommendation: "Skills should never transmit environment variables",
    strings: ["process.env"],
  },
  {
    id: "CRED002",
    name: "Secret File Access",
    severity: "CRITICAL",
    category: "credential-theft",
    description: "Code accesses files commonly containing secrets",
    recommendation: "Skills should not access credential files",
    regex: /\.(env|credentials|secrets|key|pem)|api[_-]?key|secret[_-]?key/i,
  },
  {
    id: "CRED003",
    name: "Home Directory Config Access",
    severity: "CRITICAL",
    category: "credential-theft",
    description: "Code reads from home directory config files",
    recommendation: "Skills should not access user configurations",
    regex: /~\/\.(aws|ssh|gnupg|config|clawdbot|openclaw)/i,
  },

  // CRITICAL - Data Exfiltration
  {
    id: "EXFIL001",
    name: "Webhook Data Transmission",
    severity: "CRITICAL",
    category: "data-exfiltration",
    description: "Code sends data to known exfiltration endpoints",
    recommendation: "Remove connections to webhook/request-capture services",
    regex: /webhook\.site|pipedream\.net|requestbin|hookbin|requestcatcher/i,
  },
  {
    id: "EXFIL002",
    name: "Base64 Encoded Transmission",
    severity: "HIGH",
    category: "data-exfiltration",
    description: "Code encodes data as base64 before transmission",
    recommendation: "Review why data needs encoding before sending",
    strings: ["btoa(", "Buffer.from(", ".toString('base64')"],
  },

  // HIGH - Code Execution
  {
    id: "EXEC001",
    name: "Dynamic Code Evaluation",
    severity: "HIGH",
    category: "code-execution",
    description: "Code uses eval() or Function() for dynamic execution",
    recommendation: "Never use eval() or dynamic code execution",
    strings: ["eval(", "new Function("],
  },
  {
    id: "EXEC002",
    name: "Child Process Execution",
    severity: "HIGH",
    category: "code-execution",
    description: "Code spawns child processes or shell commands",
    recommendation: "Audit all shell command executions",
    strings: ["child_process", "exec(", "execSync(", "spawn("],
  },
  {
    id: "EXEC003",
    name: "Sandbox Escape Patterns",
    severity: "CRITICAL",
    category: "code-execution",
    description: "Code attempts to escape sandboxed environments",
    recommendation: "This indicates malicious intent - do not use",
    strings: ["vm.runInThisContext", "constructor.constructor", "process.mainModule"],
  },

  // HIGH - Filesystem Access
  {
    id: "FS001",
    name: "File Read Operations",
    severity: "MEDIUM",
    category: "filesystem",
    description: "Code reads files - verify paths are safe",
    recommendation: "Limit file access to skill directory only",
    strings: ["fs.readFile", "readFileSync"],
  },
  {
    id: "FS002",
    name: "File Write Operations",
    severity: "HIGH",
    category: "filesystem",
    description: "Code writes files - could modify system",
    recommendation: "Sandbox file writes to specific directories",
    strings: ["fs.writeFile", "writeFileSync"],
  },
  {
    id: "FS003",
    name: "Path Traversal",
    severity: "HIGH",
    category: "filesystem",
    description: "Code may escape directories via path traversal",
    recommendation: "Sanitize and validate all file paths",
    regex: /\.\.\/|\.\.\\\\|path\.join\([^)]*\.\./,
  },

  // MEDIUM - Network Access
  {
    id: "NET001",
    name: "External HTTP Requests",
    severity: "MEDIUM",
    category: "network",
    description: "Code makes HTTP requests to external services",
    recommendation: "Verify all endpoints are necessary and trusted",
    strings: ["fetch(", "axios", "http.request", "https.request"],
  },
  {
    id: "NET002",
    name: "WebSocket Connections",
    severity: "MEDIUM",
    category: "network",
    description: "Code establishes WebSocket connections",
    recommendation: "Ensure WebSocket endpoints are trusted",
    strings: ["WebSocket", "ws://", "wss://"],
  },

  // MEDIUM - Obfuscation
  {
    id: "OBF001",
    name: "Hex/Unicode Obfuscation",
    severity: "MEDIUM",
    category: "obfuscation",
    description: "Code contains obfuscated strings",
    recommendation: "Decode and review obfuscated content",
    regex: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){3,}|\\u[0-9a-f]{4}(?:\\u[0-9a-f]{4}){3,}/i,
  },

  // HIGH - Hardcoded Secrets
  {
    id: "INFO001",
    name: "Hardcoded Credentials",
    severity: "HIGH",
    category: "info-disclosure",
    description: "Code contains what appears to be hardcoded credentials",
    recommendation: "Never hardcode credentials - use environment variables",
    regex: /(password|passwd|secret|token|api_key)\s*[:=]\s*['"`][^'"`]{8,}/i,
  },

  // Additional patterns for AI agent security
  {
    id: "AGENT001",
    name: "Prompt Injection Vectors",
    severity: "HIGH",
    category: "agent-security",
    description: "Code constructs prompts from untrusted input",
    recommendation: "Sanitize all user input before including in prompts",
    regex: /prompt\s*[+=]|messages\s*\.\s*push\s*\(\s*\{[^}]*user/i,
  },
  {
    id: "AGENT002",
    name: "Tool Call Manipulation",
    severity: "CRITICAL",
    category: "agent-security",
    description: "Code may manipulate tool call results or inject commands",
    recommendation: "Validate all tool outputs before processing",
    regex: /tool_?call|function_?call|tool_?result/i,
  },
  {
    id: "AGENT003",
    name: "Memory/Context Manipulation",
    severity: "HIGH",
    category: "agent-security",
    description: "Code accesses or modifies agent memory/context",
    recommendation: "Ensure memory access is properly scoped",
    regex: /memory\.md|context\.json|session_?history/i,
  },
];

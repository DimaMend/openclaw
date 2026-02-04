# Safe Execution Layer for OpenClaw

## Summary

This PR adds a defense-in-depth security module for OpenClaw that protects against prompt injection attacks when bots are exposed to external users (Discord servers, Telegram groups, etc.).

## The Problem

When you expose your OpenClaw bot to external users, they can potentially craft messages that exploit prompt injection to:
- Read sensitive files (.env, SSH keys, credentials)
- Execute arbitrary commands
- Exfiltrate data via network requests
- Cause denial of service through flooding or infinite loops

The current exec-approvals system is a good start but relies on 'whack-a-mole' - blocking known bad things after they're discovered.

## The Solution

This module implements 'safe by default' - only allow explicitly permitted things:

### 1. Command Validation
- Blocks shell metacharacters (`; & | $ < >`)
- Validates all path arguments against blocked patterns
- Opaque error messages (don't leak why something failed)

### 2. Path-Based Blocking
Automatically blocks access to sensitive files:
- Environment files: `.env`, `.env.local`, etc.
- SSH keys: `id_rsa`, `id_ed25519`, `.ssh/`
- Credentials: `credentials.json`, `secrets.yaml`
- Cloud configs: `.aws/`, `.gcloud/`, `.kube/`
- And 50+ more patterns

### 3. Environment Sanitization
Blocks dangerous env vars that can hijack execution:
- `LD_PRELOAD`, `LD_LIBRARY_PATH` (linker injection)
- `NODE_OPTIONS`, `NODE_PATH` (Node.js injection)
- `PYTHONPATH`, `BASH_ENV`, etc.
- `PATH` modification (binary hijacking)

### 4. SSRF Protection
Blocks requests to internal resources:
- `localhost`, `*.local`, `*.internal`
- `metadata.google.internal` (cloud metadata)
- Private IPs: `10.x`, `192.168.x`, `127.x`, etc.
- IPv4-mapped-IPv6 bypass detection (`::ffff:192.168.1.1`)

### 5. Rate Limiting
- Self-message rejection (prevents recursion attacks)
- Per-requester rate limits (prevents flooding)
- Automatic cooldown after limit exceeded

### 6. Trust Levels
Different security based on message source:
- `owner`: CLI user (full trust)
- `trusted`: Explicitly approved users
- `paired`: Users who completed pairing
- `public`: Unknown/anonymous users

## Usage

```typescript
import { 
  validateCommand, 
  validateFilePath,
  createSafeExecutionContext 
} from './safe-executor';

// Create context for incoming message
const ctx = createSafeExecutionContext({
  source: { provider: 'discord', channelType: 'group' },
  workdir: '/app/workspace',
  selfIds: ['my-bot-id'],
});

// Validate before executing
const validation = validateCommand('cat config.json', {
  workdir: ctx.workdir,
  trustLevel: ctx.trustLevel,
});

if (!validation.allowed) {
  return { error: 'Command failed' }; // Opaque error
}
```

## Security Patterns Source

This incorporates security lessons from:
- OpenClaw's own `bash-tools.exec.ts` (dangerous env vars)
- OpenClaw's `ssrf.ts` (SSRF protection)
- ajs-clawbot project (blocked file patterns)

## Files Changed

- `src/safe-executor/index.ts` - Module exports
- `src/safe-executor/validator.ts` - Core validation logic
- `src/safe-executor/config.ts` - Configuration loading

## Testing

The underlying patterns have 185 tests in the ajs-clawbot project covering:
- All blocked file patterns
- SSRF hostname and IP detection
- IPv4-mapped-IPv6 bypass detection
- Environment variable sanitization
- Rate limiting behavior

## Backwards Compatibility

This module is opt-in and doesn't change existing behavior. It can be integrated gradually:
1. Start with logging mode (validate but don't block)
2. Enable for public channels first
3. Gradually tighten based on audit findings

# Exec Events E2E Audit Report

**Date:** 2026-01-27
**Auditor:** Grace (via Codex analysis)

## Executive Summary

The exec events flow is fundamentally working (Gateway emits → WebSocket broadcasts → Crabwalk receives), but **there's a critical `runId` schema mismatch** that prevents proper session linking.

### Critical Finding
**Gateway sends `runId` nested in `context` object (optional); Crabwalk expects `runId` at top-level (required).**

---

## Part 1: Gateway Event Emission ✅ Working

### Findings

**Emission conditions** (src/agents/bash-tools.exec.ts):
- Line 392: `execEventsConfig.emitEvents === true`
- Line 395: `execEventsEnabled = execEventsConfig.emitEvents === true && execEventsMatch.matched`
- Both conditions must be true for events to emit

**Emission call sites:**
- Line 577: `emitExecEvent("exec.output", {...})`
- Line 595: `emitExecEvent("exec.started", {...})`
- Line 618: `emitExecEvent("exec.completed", {...})`

**Payload structure** (src/infra/exec-events.ts):
```typescript
type ExecEventBase = {
  event: ExecEventName;  // "exec.started" | "exec.output" | "exec.completed"
  ts: number;
  seq: number;
  sessionId: string;
  pid: number;
  command?: string;
  context?: ExecEventContext;  // 👈 runId is NESTED here
};

type ExecEventContext = {
  runId?: string;        // 👈 OPTIONAL
  toolCallId?: string;
  sessionKey?: string;
};
```

### Issues Found
1. **Line 7 (exec-events.ts):** `runId?: string` — runId is OPTIONAL in Gateway types
2. **Line 20:** `context?: ExecEventContext` — entire context is OPTIONAL

---

## Part 2: Gateway Broadcast ✅ Working

### Findings

**Subscription** (src/gateway/server.impl.ts):
- Line 20: `import { onExecEvent } from "../infra/exec-events.js"`
- Line 406-408: 
```typescript
const execUnsub = onExecEvent((evt) => {
  broadcast(evt.event, evt, { dropIfSlow: true });
});
```

**GATEWAY_EVENTS list** (src/gateway/server-methods-list.ts):
- Line 111: `"exec.started"`
- Line 112: `"exec.output"`
- Line 113: `"exec.completed"`

### Status
Exec events ARE properly registered and broadcast. ✅

---

## Part 3: Crabwalk Parser 🔴 MISMATCH

### Findings

**Parser** (/home/clawdbot/apps/crabwalk/src/integrations/clawdbot/parser.ts):
- Line 200-201: 
```typescript
const exec = frame.payload as ExecStartedEvent
const execId = `exec-${exec.runId}-${exec.pid}`  // 👈 Uses top-level runId
```
- Line 211: `runId: exec.runId`  — expects runId at top level
- Line 260: `const execId = \`exec-${exec.runId}-${exec.pid}\`` — same pattern

**Protocol types** (/home/clawdbot/apps/crabwalk/src/integrations/clawdbot/protocol.ts):
- Line 88-92:
```typescript
export interface ExecStartedEvent {
  sessionId: string;
  pid: number;
  runId: string;    // 👈 REQUIRED string, NOT optional
  ...
}
```
- Line 92: `runId: string` — REQUIRED, not optional

### Critical Mismatch
| Property | Gateway | Crabwalk |
|----------|---------|----------|
| `runId` location | `context.runId` (nested) | `exec.runId` (top-level) |
| `runId` required | No (`runId?: string`) | Yes (`runId: string`) |
| `context` | Optional object | Not read at all |

**What happens when runId is undefined:**
- `execId` becomes `"exec-undefined-<pid>"` — breaks uniqueness
- Session linking fails (see Part 5)

---

## Part 4: Crabwalk UI Component ✅ Distinct

### Findings

**ExecNode.tsx** (/home/clawdbot/apps/crabwalk/src/components/monitor/ExecNode.tsx):
- Line 1-10: Distinct component using `memo` and `Handle` from react-flow
- Line 8: `data: MonitorExecProcess` — uses proper exec type
- Uses Terminal icon (lucide-react)
- Shows command, status (running/completed/failed), duration

**NOT reusing AgentNode or ChatNode** — this is a dedicated exec component. ✅

---

## Part 5: ActionGraph Integration 🟡 Works IF sessionKey exists

### Findings

**ActionGraph.tsx** (/home/clawdbot/apps/crabwalk/src/components/monitor/ActionGraph.tsx):
- Line 18: `import { ExecNode } from './ExecNode'`
- Line 55: `exec: ExecNode as any` — registered as node type
- Line 138-143: Exec nodes added to graph
- Line 273-282: Session→Exec edges created based on `exec.sessionKey`

**Edge creation logic:**
```typescript
for (const exec of visibleExecs) {
  const key = exec.sessionKey  // 👈 REQUIRES sessionKey
  ...
  edges.push({
    id: `e-session-exec-${exec.id}`,
    source: `session-${key}`,
    target: `exec-${exec.id}`,
    ...
  })
}
```

**Session key resolution** (/home/clawdbot/apps/crabwalk/src/integrations/clawdbot/collections.ts):
- Line 12: `const runSessionMap = new Map<string, string>()` — maps runId → sessionKey
- Line 141-147: `addAction()` learns mapping from chat events
- Line 233-234: `addExecEvent()` calls `resolveSessionKey(event)`

**The problem:** Without `runId` at top level, `resolveSessionKey` can't look up the sessionKey, so execs appear as orphan nodes without edges to sessions.

---

## Recommended Fixes (Test-First Approach)

### Option A: Fix Gateway (Preferred)

**Bead 1: Add top-level runId to exec event payload**

1. Write test first:
```typescript
// src/agents/bash-tools.exec.exec-events.test.ts
it("includes runId at top level in exec events", async () => {
  const events: ExecEventPayload[] = [];
  onExecEvent((e) => events.push(e));
  
  await runWithExecEventContext({ runId: "test-run-123" }, async () => {
    await runExecProcess({ command: "codex --help", ... });
  });
  
  const started = events.find(e => e.event === "exec.started");
  expect(started?.runId).toBe("test-run-123");  // 👈 Top level
});
```

2. Update types (src/infra/exec-events.ts):
```typescript
type ExecEventBase = {
  event: ExecEventName;
  ts: number;
  seq: number;
  sessionId: string;
  pid: number;
  command?: string;
  runId?: string;           // 👈 ADD top-level
  context?: ExecEventContext;  // Keep for backward compat
};
```

3. Update emission (src/agents/bash-tools.exec.ts):
```typescript
emitExecEvent("exec.started", {
  sessionId,
  pid,
  command,
  runId: session.execEvents.context?.runId,  // 👈 ADD this
  context: session.execEvents.context,
  ...
});
```

### Option B: Fix Crabwalk (Alternative)

Read `runId` from `context.runId` if top-level is missing:
```typescript
// parser.ts
const runId = exec.runId ?? frame.payload?.context?.runId;
const execId = `exec-${runId ?? 'unknown'}-${exec.pid}`;
```

### Recommendation

**Go with Option A** — it's cleaner to have consistent payload structure at the source.

---

## Next Steps

1. ✅ Create CONTINUITY.md (done)
2. ⬜ Write failing test for top-level runId
3. ⬜ Update Gateway exec-events types
4. ⬜ Update emission call sites
5. ⬜ Run tests, verify passing
6. ⬜ Commit: `feat(exec-events): add top-level runId to payload`
7. ⬜ E2E test with Crabwalk

---

## Line Number Reference

| File | Line | Issue |
|------|------|-------|
| src/infra/exec-events.ts | 7 | `runId?: string` optional |
| src/infra/exec-events.ts | 20 | `context?: ExecEventContext` optional |
| src/agents/bash-tools.exec.ts | 595 | emitExecEvent("exec.started",...) — missing top-level runId |
| /home/clawdbot/apps/crabwalk/src/integrations/clawdbot/protocol.ts | 92 | `runId: string` required |
| /home/clawdbot/apps/crabwalk/src/integrations/clawdbot/parser.ts | 201 | `exec.runId` accessed at top level |
| /home/clawdbot/apps/crabwalk/src/integrations/clawdbot/collections.ts | 12 | runSessionMap needs runId for lookup |

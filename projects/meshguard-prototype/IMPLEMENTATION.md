# MeshGuard Prototype Implementation Plan

**Goal:** Build a working technical prototype that demonstrates the core value proposition — agent identity, policy enforcement, and audit logging through a gateway.

**Timeline:** 2-3 weeks to demo-ready MVP

**Repo:** `github.com/dbhurley/meshguard` (to be created)

---

## Architecture (MVP Scope)

```
┌─────────────────────────────────────────────────────────────┐
│                  MeshGuard Gateway (Bun/Hono)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Identity │  │  Policy  │  │  Audit   │  │    Proxy    │  │
│  │ (JWT)    │  │ (YAML)   │  │ (SQLite) │  │  (HTTP)     │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↑
                    Agents connect here
```

---

## Tech Stack (MVP)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Bun | Fast, TypeScript-native, good DX |
| Framework | Hono | Lightweight, fast, middleware-friendly |
| Policy | YAML + js-yaml | Simple, human-readable |
| Identity | JWT (jose) | Standard, no external deps |
| Audit | SQLite (better-sqlite3) | Zero config, queryable |
| CLI | Commander.js | Familiar, well-documented |
| Config | dotenv + YAML | Flexible |

---

## Project Structure

```
meshguard/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                 # Entry point
│   ├── gateway/
│   │   ├── server.ts            # Hono app setup
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT validation
│   │   │   ├── policy.ts        # Policy enforcement
│   │   │   ├── audit.ts         # Request logging
│   │   │   └── proxy.ts         # Request forwarding
│   │   └── routes/
│   │       ├── health.ts        # Health check
│   │       └── admin.ts         # Admin API
│   ├── identity/
│   │   ├── jwt.ts               # JWT generation/validation
│   │   ├── agent.ts             # Agent CRUD
│   │   └── types.ts             # Agent types
│   ├── policy/
│   │   ├── engine.ts            # Policy evaluation
│   │   ├── loader.ts            # YAML loading
│   │   ├── types.ts             # Policy types
│   │   └── defaults.ts          # Default deny policy
│   ├── audit/
│   │   ├── logger.ts            # Audit logging
│   │   ├── db.ts                # SQLite setup
│   │   ├── types.ts             # Log entry types
│   │   └── queries.ts           # Query helpers
│   └── cli/
│       ├── index.ts             # CLI entry
│       ├── agent.ts             # agent create/list/revoke
│       ├── policy.ts            # policy apply/list/validate
│       └── audit.ts             # audit tail/query/export
├── policies/
│   ├── default.yaml             # Default deny-all
│   └── examples/
│       ├── scout.yaml           # Demo agent policy
│       └── enterprise.yaml      # Example enterprise policy
├── scripts/
│   ├── demo.sh                  # Full demo script
│   └── seed.sh                  # Seed demo data
├── test/
│   ├── gateway.test.ts
│   ├── policy.test.ts
│   └── audit.test.ts
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)
Core infrastructure and types.

#### Task 1.1: Project Setup
- [ ] Create GitHub repo `dbhurley/meshguard`
- [ ] Initialize Bun project with TypeScript
- [ ] Configure ESLint, Prettier
- [ ] Set up directory structure
- [ ] Create README with project overview
- [ ] Add .env.example with documented variables

**Files:** `package.json`, `tsconfig.json`, `.eslintrc`, `README.md`, `.env.example`

#### Task 1.2: Type Definitions
- [ ] Define Agent types (id, name, trust_tier, org_id, created_at, revoked_at)
- [ ] Define Policy types (name, applies_to, rules, delegation)
- [ ] Define AuditEntry types (ts, trace_id, agent_id, action, decision, etc.)
- [ ] Define Request/Response types for gateway

**Files:** `src/identity/types.ts`, `src/policy/types.ts`, `src/audit/types.ts`

#### Task 1.3: Configuration System
- [ ] Environment variable loading (dotenv)
- [ ] Config validation
- [ ] Default values
- [ ] Config types

**Files:** `src/config.ts`

---

### Phase 2: Identity Service (Days 3-5)
Agent credentials and JWT handling.

#### Task 2.1: JWT Infrastructure
- [ ] Secret key generation/loading
- [ ] JWT signing with claims (agent_id, trust_tier, org_id, iat, exp)
- [ ] JWT verification with expiry check
- [ ] Token refresh logic

**Files:** `src/identity/jwt.ts`

#### Task 2.2: Agent Management
- [ ] Create agent (generate ID, store metadata)
- [ ] List agents (with filters)
- [ ] Get agent by ID
- [ ] Revoke agent (soft delete)
- [ ] Agent storage (SQLite table)

**Files:** `src/identity/agent.ts`, `src/identity/db.ts`

#### Task 2.3: Agent CLI Commands
- [ ] `meshguard agent create <name> --trust <tier> --org <org>`
- [ ] `meshguard agent list [--org <org>] [--trust <tier>]`
- [ ] `meshguard agent show <id>`
- [ ] `meshguard agent revoke <id>`
- [ ] `meshguard agent token <id>` (generate JWT)

**Files:** `src/cli/agent.ts`

---

### Phase 3: Policy Engine (Days 5-8)
YAML-based policy definition and evaluation.

#### Task 3.1: Policy Schema
- [ ] Define YAML schema for policies
- [ ] Support applies_to (trust_tier, tags, agent_ids)
- [ ] Support rules (allow/deny with skills, actions, data_classes)
- [ ] Support delegation limits (max_depth, permission_ceiling)
- [ ] Validate policies on load

**Files:** `src/policy/types.ts`, `src/policy/schema.ts`

#### Task 3.2: Policy Loader
- [ ] Load policies from directory
- [ ] Watch for changes (dev mode)
- [ ] Validate on load
- [ ] Index by applies_to for fast lookup

**Files:** `src/policy/loader.ts`

#### Task 3.3: Policy Evaluation Engine
- [ ] Match agent to applicable policies
- [ ] Evaluate rules in order (first match wins)
- [ ] Default deny if no match
- [ ] Return decision + reason + matched_rule

**Files:** `src/policy/engine.ts`

#### Task 3.4: Policy CLI Commands
- [ ] `meshguard policy apply <file.yaml>`
- [ ] `meshguard policy list`
- [ ] `meshguard policy show <name>`
- [ ] `meshguard policy validate <file.yaml>`
- [ ] `meshguard policy test <agent_id> <action>` (dry-run check)

**Files:** `src/cli/policy.ts`

#### Task 3.5: Example Policies
- [ ] `policies/default.yaml` — Deny all baseline
- [ ] `policies/examples/scout.yaml` — Demo agent with mixed allow/deny
- [ ] `policies/examples/enterprise.yaml` — Enterprise tier example
- [ ] `policies/examples/partner.yaml` — Restricted partner example

**Files:** `policies/*.yaml`

---

### Phase 4: Audit System (Days 8-10)
Logging and queryable audit trail.

#### Task 4.1: Audit Database Schema
- [ ] Create SQLite schema for audit_logs table
- [ ] Indexes on: timestamp, agent_id, trace_id, decision
- [ ] Migration system (simple versioned SQL files)

**Files:** `src/audit/db.ts`, `src/audit/migrations/`

#### Task 4.2: Audit Logger
- [ ] Log entry creation with all fields
- [ ] Async write (don't block request)
- [ ] Batch writes for performance
- [ ] Trace ID generation/propagation

**Files:** `src/audit/logger.ts`

#### Task 4.3: Audit Queries
- [ ] Query by time range
- [ ] Query by agent_id
- [ ] Query by trace_id (follow delegation chain)
- [ ] Query by decision (allow/deny)
- [ ] Aggregate stats (requests/hour, deny rate)

**Files:** `src/audit/queries.ts`

#### Task 4.4: Audit CLI Commands
- [ ] `meshguard audit tail [--agent <id>] [--follow]`
- [ ] `meshguard audit query --from <time> --to <time> [filters]`
- [ ] `meshguard audit trace <trace_id>`
- [ ] `meshguard audit stats [--period 24h]`
- [ ] `meshguard audit export --format json|csv`

**Files:** `src/cli/audit.ts`

---

### Phase 5: Gateway (Days 10-14)
The core proxy with middleware chain.

#### Task 5.1: Hono Server Setup
- [ ] Create Hono app
- [ ] Configure CORS, body parsing
- [ ] Health check endpoint
- [ ] Error handling middleware
- [ ] Graceful shutdown

**Files:** `src/gateway/server.ts`, `src/gateway/routes/health.ts`

#### Task 5.2: Auth Middleware
- [ ] Extract JWT from Authorization header
- [ ] Validate JWT signature and expiry
- [ ] Check agent not revoked
- [ ] Attach agent context to request
- [ ] Return 401 on auth failure

**Files:** `src/gateway/middleware/auth.ts`

#### Task 5.3: Policy Middleware
- [ ] Extract action from request (method + path pattern)
- [ ] Call policy engine with agent + action
- [ ] Return 403 with reason on deny
- [ ] Add policy decision to request context

**Files:** `src/gateway/middleware/policy.ts`

#### Task 5.4: Audit Middleware
- [ ] Generate trace ID (or use incoming)
- [ ] Log request start
- [ ] Log request completion with decision
- [ ] Capture response status/time

**Files:** `src/gateway/middleware/audit.ts`

#### Task 5.5: Proxy Middleware
- [ ] Forward allowed requests to target
- [ ] Preserve headers (minus auth)
- [ ] Add X-MeshGuard-* headers (trace, agent, decision)
- [ ] Handle streaming responses
- [ ] Timeout handling

**Files:** `src/gateway/middleware/proxy.ts`

#### Task 5.6: Admin API
- [ ] GET /admin/agents — List agents
- [ ] GET /admin/policies — List policies
- [ ] GET /admin/audit — Query audit log
- [ ] GET /admin/stats — Dashboard stats
- [ ] Protected by admin token

**Files:** `src/gateway/routes/admin.ts`

---

### Phase 6: CLI & DX (Days 14-16)
Developer experience and tooling.

#### Task 6.1: Main CLI Entry
- [ ] Commander.js setup
- [ ] Subcommand routing (agent, policy, audit, server)
- [ ] Global flags (--config, --verbose)
- [ ] Help text and examples

**Files:** `src/cli/index.ts`

#### Task 6.2: Server Commands
- [ ] `meshguard serve [--port <port>] [--mode enforce|audit|bypass]`
- [ ] `meshguard dev` (serve with watch mode)

**Files:** `src/cli/serve.ts`

#### Task 6.3: Demo Script
- [ ] Create demo agent
- [ ] Apply demo policy
- [ ] Make allowed request → show success
- [ ] Make denied request → show block + reason
- [ ] Show audit log
- [ ] Narrated output for presentations

**Files:** `scripts/demo.sh`

---

### Phase 7: Testing & Docs (Days 16-18)

#### Task 7.1: Unit Tests
- [ ] JWT generation/validation tests
- [ ] Policy evaluation tests (various rule combinations)
- [ ] Audit query tests

**Files:** `test/identity.test.ts`, `test/policy.test.ts`, `test/audit.test.ts`

#### Task 7.2: Integration Tests
- [ ] Gateway end-to-end tests
- [ ] Auth flow tests
- [ ] Policy enforcement tests
- [ ] Audit logging tests

**Files:** `test/gateway.test.ts`

#### Task 7.3: Documentation
- [ ] README with quickstart
- [ ] Policy reference (YAML schema docs)
- [ ] CLI reference
- [ ] API reference (OpenAPI spec)
- [ ] Architecture decision records

**Files:** `README.md`, `docs/`

---

### Phase 8: Containerization (Days 18-19)

#### Task 8.1: Dockerfile
- [ ] Multi-stage build (build + runtime)
- [ ] Bun runtime base image
- [ ] Non-root user
- [ ] Health check
- [ ] Minimal final image

**Files:** `docker/Dockerfile`

#### Task 8.2: Docker Compose
- [ ] Gateway service
- [ ] Volume mounts for policies, data
- [ ] Environment variable passthrough
- [ ] Example with mock target service

**Files:** `docker/docker-compose.yml`

---

### Phase 9: Demo & Polish (Days 19-21)

#### Task 9.1: Demo Recording
- [ ] Record 2-3 min Loom walkthrough
- [ ] Show: create agent, apply policy, make requests, view audit
- [ ] Narrate the value proposition

#### Task 9.2: Integration with meshguard.app
- [ ] Add link to GitHub repo
- [ ] Add "View Technical Demo" button
- [ ] Update Scout's responses to reference real prototype

#### Task 9.3: Clawdbot Integration (Stretch)
- [ ] Add meshguard config option to Clawdbot
- [ ] Route tool calls through gateway
- [ ] Demo Clawdbot as a governed agent

---

## Task Tracking

Each task above can be assigned to a sub-agent with:
- Clear scope (files to create/modify)
- Acceptance criteria
- Dependencies on prior tasks

### Priority Order
1. Phase 1 (Foundation) — Blocks everything
2. Phase 2 (Identity) — Needed for auth
3. Phase 3 (Policy) — Core logic
4. Phase 5 (Gateway) — Depends on 2+3
5. Phase 4 (Audit) — Can parallel with 5
6. Phase 6 (CLI) — After core works
7. Phase 7-9 — Polish

### Parallelizable Work
- Phase 4 (Audit) can run parallel to Phase 5 (Gateway)
- Task 3.5 (Example Policies) can run parallel to engine work
- Task 7.3 (Docs) can start early and iterate

---

## Success Criteria

### MVP Complete When:
1. ✅ Can create agent with `meshguard agent create`
2. ✅ Can apply policy with `meshguard policy apply`
3. ✅ Gateway blocks requests that violate policy
4. ✅ Gateway allows requests that match policy
5. ✅ All requests logged to audit trail
6. ✅ Can query audit with `meshguard audit tail`
7. ✅ Demo script runs end-to-end
8. ✅ README explains how to run locally

### Demo-Ready When:
1. ✅ 2-min video recorded
2. ✅ Docker compose works out of box
3. ✅ No crashes on happy path
4. ✅ Error messages are clear

---

## Open Questions

1. **Target proxy:** What do we proxy TO in demos? Mock service? httpbin.org?
2. **Action extraction:** How do we map HTTP requests to policy actions? Path patterns? Explicit header?
3. **Multi-tenancy:** Do we need org isolation in MVP or single-tenant OK?
4. **Delegation:** Include in MVP or defer? (Recommend: defer to v0.2)

---

## Notes

- Keep scope tight — this is a DEMO, not production
- Optimize for "wow factor" in investor meetings
- Every feature should be explainable in the demo
- If it doesn't help close the round, cut it

---

*Created: January 24, 2026*
*Last Updated: January 24, 2026*

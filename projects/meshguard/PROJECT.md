# MeshGuard — Project Document

> **Last Updated:** 2026-01-25
> **Status:** Active Development (Pre-seed)
> **Owner:** David Hurley

---

## Executive Summary

**MeshGuard** is a governance control plane for AI agent ecosystems. It provides identity management, policy enforcement, and audit logging for agent-to-agent interactions — solving the emerging "agent mesh" governance gap that traditional IAM and API gateway solutions cannot address.

**One-liner:** "The missing governance layer for autonomous AI agents."

---

## The Problem

As AI evolves from copilots (human-in-the-loop) to autonomous agents to agent meshes (agent-to-agent delegation), a critical governance gap emerges:

- **No identity verification** for agent-to-agent calls
- **Zero policy enforcement** at delegation boundaries  
- **Incomplete audit trails** across agent chains
- **Compliance risk exposure** for regulated industries (GDPR, SOC 2, HIPAA)

When Agent A delegates to Agent B, traditional identity controls break down. Organizations are operating blind.

**Market Validation:**
- Gartner predicts 40% of enterprises will deploy agent mesh architectures by 2026
- 73% of CIOs cite governance as their top AI concern
- $180K average annual enterprise spend on AI security
- 2.3x faster adoption in regulated sectors

---

## The Solution

MeshGuard sits between agents as a governance control plane, intercepting every delegation request to enforce:

1. **Identity Management** — Issues verifiable JWT credentials to agents with trust tiers
2. **Policy Enforcement** — Evaluates requests against YAML-defined rules in real-time
3. **Audit Infrastructure** — Captures execution traces with context propagation

### Key Differentiators

| Solution | Built For | Model | Limitation |
|----------|-----------|-------|------------|
| Traditional IAM (Okta, Auth0) | Human Users | Session-based | Can't handle agent delegation chains |
| API Gateways (Kong, Apigee) | Sync Requests | Request/Response | No context propagation across hops |
| AI Governance (Arthur, Fiddler) | Model Bias | Monitoring | No identity or policy enforcement |
| **MeshGuard** | **Autonomous Agents** | **Delegation Chains** | Native identity, policy & audit for mesh |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│            MeshGuard Gateway                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐  │
│  │  Auth  │→│ Policy │→│ Audit  │→│ Proxy│  │
│  └────────┘ └────────┘ └────────┘ └──────┘  │
└─────────────────────────────────────────────┘
         ↑                              ↓
    Agent Request                 Target Service
```

### Core Components

| Component | Description | Location |
|-----------|-------------|----------|
| **Gateway** | HTTP proxy with middleware chain | `src/gateway/` |
| **Identity** | JWT-based agent credentials with trust tiers | `src/identity/` |
| **Policy Engine** | YAML rule evaluation with wildcard matching | `src/policy/` |
| **Audit Logger** | SQLite-backed queryable audit trail | `src/audit/` |
| **CLI** | Agent, policy, and audit management | `src/cli/` |

### Trust Tiers

```
untrusted → verified → trusted → privileged
```

Each tier unlocks additional permissions in policy rules.

### Policy Format

```yaml
name: my-policy
version: "1.0"
description: Example policy

appliesTo:
  trustTiers: [verified, trusted]
  tags: [myapp]

rules:
  - effect: allow
    actions: ["read:*"]
  - effect: deny
    actions: ["write:email", "execute:*"]

defaultEffect: deny

delegation:
  maxDepth: 2
  permissionCeiling: ["read:*"]
```

---

## Current State

### What's Built ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Gateway server | ✅ Complete | Bun/Hono, modes: enforce/audit/bypass |
| JWT identity system | ✅ Complete | Agent creation, token generation, revocation |
| Policy engine | ✅ Complete | YAML parsing, wildcard matching, evaluation |
| Audit logging | ✅ Complete | SQLite storage, query API, statistics |
| CLI | ✅ Complete | agent, policy, audit, serve commands |
| Admin API | ✅ Complete | REST endpoints for management |
| Example policies | ✅ Complete | demo, enterprise, scout templates |
| Investor demo script | ✅ Complete | `scripts/investor-demo.sh` |
| Docker deployment | ✅ Complete | Dockerfile + docker-compose |

### Infrastructure

| Resource | Details |
|----------|---------|
| **Website** | https://meshguard.app (Vercel, Next.js) |
| **Sandbox** | https://dashboard.meshguard.app (DO droplet) |
| **Repo** | https://github.com/dbhurley/meshguard |
| **App Repo** | https://github.com/dbhurley/meshguard-app |
| **Droplet** | 157.230.224.227 (meshguard-gateway, NYC1) |

### Sandbox Details

- **URL:** https://dashboard.meshguard.app
- **Mode:** enforce
- **Proxy Target:** https://httpbin.org
- **SSL:** Let's Encrypt (expires Apr 25, 2026)
- **Admin Token:** `meshguard-admin-demo`
- **Demo Agent Token:** (24h expiry, regenerate as needed)

```bash
# Health check
curl https://dashboard.meshguard.app/health

# List agents (admin)
curl https://dashboard.meshguard.app/admin/agents \
  -H "X-Admin-Token: meshguard-admin-demo"
```

---

## Repository Structure

```
meshguard/
├── src/
│   ├── index.ts              # Entry point
│   ├── config.ts             # Environment config
│   ├── cli/                  # CLI commands
│   │   ├── index.ts
│   │   ├── agent.ts          # agent create/list/revoke
│   │   ├── policy.ts         # policy list/validate/test
│   │   └── audit.ts          # audit tail/query/stats
│   ├── gateway/
│   │   ├── server.ts         # Hono server setup
│   │   ├── middleware/
│   │   │   ├── auth.ts       # JWT verification
│   │   │   ├── policy.ts     # Policy evaluation
│   │   │   ├── audit.ts      # Request logging
│   │   │   └── proxy.ts      # Target forwarding
│   │   └── routes/
│   │       ├── admin.ts      # Admin API
│   │       └── health.ts     # Health endpoints
│   ├── identity/
│   │   ├── agent.ts          # Agent CRUD
│   │   ├── jwt.ts            # Token signing/verify
│   │   └── types.ts
│   ├── policy/
│   │   ├── engine.ts         # Rule evaluation
│   │   ├── loader.ts         # YAML loading
│   │   └── types.ts
│   └── audit/
│       ├── logger.ts         # Audit logging
│       ├── db.ts             # SQLite operations
│       └── types.ts
├── policies/
│   ├── default.yaml
│   └── examples/
│       ├── demo.yaml
│       ├── enterprise.yaml
│       └── scout.yaml
├── scripts/
│   ├── demo.sh               # Quick demo
│   └── investor-demo.sh      # Full investor walkthrough
├── docs/
│   ├── QUICKSTART.md
│   └── GETTING_STARTED.md
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── data/                     # SQLite audit DB (gitignored)
```

---

## CLI Reference

### Agent Management

```bash
meshguard agent create <name> --trust <tier> --tags <tags>
meshguard agent list
meshguard agent show <agent_id>
meshguard agent revoke <agent_id>
meshguard agent token <agent_id>
```

### Policy Management

```bash
meshguard policy list
meshguard policy show <name>
meshguard policy validate <file>
meshguard policy apply <file>
meshguard policy test <agent_id> <action>
```

### Audit Queries

```bash
meshguard audit tail -n 20
meshguard audit tail -f              # Follow mode
meshguard audit query --from <date> --decision deny
meshguard audit trace <trace_id>
meshguard audit stats --period 24
```

### Gateway

```bash
meshguard serve --port 3100
meshguard serve --mode audit         # Log but allow all
meshguard serve --mode bypass        # Development mode
```

---

## API Endpoints

### Public

| Endpoint | Description |
|----------|-------------|
| `GET /` | Gateway info |
| `GET /health` | Health check |
| `ALL /proxy/*` | Proxied requests (requires auth) |

### Admin (requires `X-Admin-Token`)

| Endpoint | Description |
|----------|-------------|
| `GET /admin/agents` | List agents |
| `POST /admin/agents` | Create agent |
| `GET /admin/agents/:id` | Get agent |
| `DELETE /admin/agents/:id` | Revoke agent |
| `GET /admin/policies` | List policies |
| `GET /admin/policies/:name` | Get policy |
| `GET /admin/audit` | Query audit log |
| `GET /admin/audit/stats` | Audit statistics |

---

## Business Model

### Pricing Tiers

| Tier | Price | Delegations | Features |
|------|-------|-------------|----------|
| **Starter** | $2,000/mo | 100K/mo | Basic policies, 30-day audit |
| **Professional** | $10,000/mo | 1M/mo | Custom policies, 1-year audit, SSO |
| **Enterprise** | Custom | Unlimited | On-premise, custom compliance, SLA |

### Target Markets

1. **Enterprise AI Adopters** — $4.1B TAM
2. **AI-Native Products** — $2.8B TAM  
3. **Regulated Industries** — $1.1B TAM

**Total Addressable Market:** $8B by 2026

---

## Roadmap

### Q1 2026 — MVP Launch ✅
- [x] Core Identity & Policy Engine
- [x] Basic CLI
- [ ] LangChain SDK
- [ ] 5 Design Partners

### Q2 2026 — Compliance
- [ ] Advanced Policy Primitives
- [ ] CrewAI Support
- [ ] SOC 2 Type 1 Certification

### Q3 2026 — Enterprise
- [ ] SSO & On-premise Deployment
- [ ] Analytics Dashboard
- [ ] 25 Paying Customers

### Q4 2026 — Scale
- [ ] High-volume Infrastructure
- [ ] AI Policy Recommendations
- [ ] SOC 2 Type 2 & ISO 27001

---

## Fundraising

### The Ask

**Raising:** $3M Seed Round

**Use of Funds:**
- Engineering: $1.5M (core team, enterprise features, security certs)
- Go-to-Market: $800K (sales leadership, partner program, events)
- Operations: $500K (infrastructure, legal, finance)
- Contingency: $200K

**Target:** 25 paying customers, $1.2M ARR by Q4 2026

---

## Access & Credentials

### Public URLs

| Resource | URL | Notes |
|----------|-----|-------|
| **Marketing Site** | https://meshguard.app | Vercel (Next.js) |
| **Dashboard/Sandbox** | https://dashboard.meshguard.app | Live gateway + UI |
| **GitHub (Core)** | https://github.com/dbhurley/meshguard | Gateway + CLI |
| **GitHub (Website)** | https://github.com/dbhurley/meshguard-app | Marketing site |

### Sandbox Access

**Dashboard UI:** https://dashboard.meshguard.app
- Gateway URL: `https://dashboard.meshguard.app` (auto-fills)
- Admin Token: `meshguard-admin-demo`

**API Testing:**
```bash
# Health check (public)
curl https://dashboard.meshguard.app/health

# List agents (admin)
curl https://dashboard.meshguard.app/admin/agents \
  -H "X-Admin-Token: meshguard-admin-demo"

# List policies (admin)  
curl https://dashboard.meshguard.app/admin/policies \
  -H "X-Admin-Token: meshguard-admin-demo"

# View audit log (admin)
curl https://dashboard.meshguard.app/admin/audit \
  -H "X-Admin-Token: meshguard-admin-demo"
```

### Infrastructure Access

**Droplet (meshguard-gateway):**
- IP: `157.230.224.227`
- SSH: `ssh root@157.230.224.227`
- Region: NYC1
- Provider: DigitalOcean

**Paths on Droplet:**
```
/root/meshguard/              # MeshGuard gateway code
/var/www/meshguard-dashboard/ # Dashboard UI files
/etc/nginx/sites-available/   # Nginx config
/etc/letsencrypt/             # SSL certs
```

**Docker:**
```bash
# View running container
docker ps

# View logs
docker logs meshguard

# Restart
docker restart meshguard
```

### Local Paths

```
~/git/meshguard/              # Core gateway + CLI repo
~/git/meshguard-app/          # Marketing website repo
~/clawd/assets/meshguard/     # Pitch deck, logos, brand assets
~/clawd/projects/meshguard/   # Project documentation (this file)
```

### Environment Variables (Production)

Located in `/root/meshguard/.env` on the droplet:
```bash
PORT=3100
HOST=0.0.0.0
MODE=enforce
JWT_SECRET=<production-secret>
ADMIN_TOKEN=meshguard-admin-demo
POLICIES_DIR=./policies
AUDIT_DB_PATH=./data/audit.db
PROXY_TARGET=https://httpbin.org
```

---

## Key Assets

### Pitch Materials
- **Pitch Deck:** `~/clawd/assets/meshguard/MeshGuard-Pitch-Deck-v3.pdf`
- **Logo:** `~/clawd/assets/meshguard/logo-2000px.png`
- **Brand Colors:** Navy (#0A2540) / Teal (#00D4AA)

### Demo Resources
- **Investor Demo:** `~/git/meshguard/scripts/investor-demo.sh`
- **Live Sandbox:** https://dashboard.meshguard.app
- **Website:** https://meshguard.app

---

## Environment Variables

```bash
# Gateway
PORT=3100
HOST=0.0.0.0
MODE=enforce           # enforce | audit | bypass

# Security
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=24h
ADMIN_TOKEN=your-admin-token

# Storage
POLICIES_DIR=./policies
AUDIT_DB_PATH=./data/audit.db

# Proxy
PROXY_TARGET=https://httpbin.org
```

---

## In Progress (Subagents Working)

As of 2026-01-25:

1. **Integration Guides** — LangChain, CrewAI, AutoGPT, generic HTTP docs
2. **Dashboard UI** — Web interface for audit logs, agents, policies
3. **Alerting System** — Webhook/Slack/email notifications on policy violations

---

## Contact

- **Founder:** David Hurley
- **Email:** david@meshguard.app
- **Website:** https://meshguard.app

---

*This document serves as the canonical reference for the MeshGuard project. Update it as the project evolves.*

---

## Multi-Tenancy (Added 2026-01-25)

MeshGuard now supports full multi-tenancy for the SaaS model.

### Organization Features

| Feature | Description |
|---------|-------------|
| **Org Management** | Create, update, delete organizations |
| **Plan Limits** | Free/Starter/Professional/Enterprise tiers |
| **API Key Auth** | Per-org API keys (`msk_...`) |
| **Admin Tokens** | Per-org admin tokens (`msat_...`) |
| **Agent Isolation** | Agents scoped to organization |
| **Policy Isolation** | Per-org custom policies |
| **Audit Isolation** | Audit logs filtered by org |
| **Rate Limiting** | Per-org rate limits by plan |

### Self-Service Signup

**Website:** meshguard.app → Chat "Create account"

**API:**
```bash
POST https://dashboard.meshguard.app/signup
{
  "name": "Company Name",
  "email": "user@company.com",
  "agentName": "first-agent"  // optional
}
```

### Plan Limits

| Limit | Free | Starter | Professional |
|-------|------|---------|--------------|
| Agents | 5 | 50 | 500 |
| Delegations/mo | 10K | 100K | 1M |
| Policies | 3 | 20 | Unlimited |
| Audit retention | 7 days | 30 days | 1 year |
| Rate limit | 100/min | 1K/min | 10K/min |

### API Headers

Multi-tenant requests require both headers:
```
X-MeshGuard-API-Key: msk_...
X-Admin-Token: msat_...
```

Super-admin (legacy) uses only:
```
X-Admin-Token: meshguard-admin-demo
```

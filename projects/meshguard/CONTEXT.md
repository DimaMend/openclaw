# MeshGuard — Quick Context

> Load this file at session start for fast context recovery.

## What Is It?

**MeshGuard** = Governance control plane for AI agents. Identity + Policy + Audit for agent-to-agent interactions.

**One-liner:** "The missing governance layer for autonomous AI agents."

## Why It Matters

When Agent A delegates to Agent B, traditional IAM breaks down. No identity verification, no policy enforcement, no audit trail. MeshGuard fixes this.

## Current State

| ✅ Done | 🔄 In Progress | 📋 Planned |
|---------|----------------|------------|
| Gateway (Bun/Hono) | Integration guides | LangChain SDK |
| JWT identity | Dashboard UI | SOC 2 cert |
| Policy engine | Alerting system | On-premise |
| Audit logging | | Enterprise features |
| CLI complete | | |
| Investor demo | | |
| Live sandbox | | |

## Key URLs

- **Website:** https://meshguard.app (Vercel)
- **Sandbox:** https://dashboard.meshguard.app (DO droplet)
- **Repo:** https://github.com/dbhurley/meshguard
- **App Repo:** https://github.com/dbhurley/meshguard-app

## Key Paths

```
~/git/meshguard/              # Core gateway + CLI
~/git/meshguard-app/          # Marketing website (Next.js)
~/clawd/assets/meshguard/     # Pitch deck, logos, brand assets
~/clawd/projects/meshguard/   # Project docs (this file)
```

## Quick Commands

```bash
# Run locally
cd ~/git/meshguard && bun run src/index.ts

# Run demo
cd ~/git/meshguard && ./scripts/investor-demo.sh

# Test sandbox
curl https://dashboard.meshguard.app/health
```

## Access & Credentials

| What | Value |
|------|-------|
| **Dashboard** | https://dashboard.meshguard.app |
| **Admin Token** | `meshguard-admin-demo` |
| **SSH** | `ssh root@157.230.224.227` |
| **Droplet IP** | 157.230.224.227 (NYC1) |

**Quick API test:**
```bash
curl https://dashboard.meshguard.app/admin/agents \
  -H "X-Admin-Token: meshguard-admin-demo"
```

## Business

- **Stage:** Pre-seed
- **Ask:** $3M seed
- **Target:** 25 customers, $1.2M ARR by Q4 2026
- **Pricing:** $2K/$10K/Custom tiers

## Full Details

See `PROJECT.md` in this directory for comprehensive documentation.

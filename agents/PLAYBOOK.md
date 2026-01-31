# DBH Ventures — Incubation Playbook

> **Orchestrator:** Steve 🐺
> **Last Updated:** 2026-01-31

This playbook defines the standard workflows for incubating projects at DBH Ventures. Each phase has specific agents, outputs, and automatic handoffs.

---

## Incubation Phases

```
📥 Inbox → 🏗️ Foundation → 🚀 MVP → 🎯 Launch → 📈 Growth
```

---

## Phase 1: Inbox (Idea Evaluation)

**Duration:** 1-2 days  
**Goal:** Evaluate if idea is worth pursuing

### Workflow

```
Idea arrives → Scout researches → Analyst evaluates → Steve decides
```

| Step | Agent | Output |
|------|-------|--------|
| 1. Log idea | Steve | Vikunja task in Inbox |
| 2. Market research | 🔍 Scout | Competitive landscape, market size |
| 3. Feasibility | 📊 Analyst | Quick financial assessment |
| 4. Decision | 🐺 Steve | YES (→ Foundation) or NO (archive) |

### Decision Criteria
- Market opportunity size
- Competitive differentiation
- Technical feasibility
- Time to MVP
- Alignment with portfolio

---

## Phase 2: Foundation

**Duration:** 2-3 days  
**Goal:** Set up project infrastructure and documentation

### Workflow

```
Decision YES → Project Manager specs → Canvas branding → Builder scaffolds → Payments setup
```

| Step | Agent | Output | Handoff |
|------|-------|--------|---------|
| 1. Create project | Steve | Clone Vikunja template | → Project Manager |
| 2. Documentation | 📋 Project Manager | CONCEPT.md, spec | → Canvas |
| 3. Branding | 🎨 Canvas | Logo, colors, BRAND-GUIDE.md | → Builder |
| 4. Scaffold | 🛠️ Builder | Repo, Vercel, basic structure | → Payments |
| 5. Payments | 💳 Payments | Stripe products, prices | → Scribe |
| 6. Email | Steve | PurelyMail setup | (parallel) |
| 7. Docs | ✍️ Scribe | README, initial docs | ✅ Ready for MVP |

### Foundation Checklist
- [ ] Vikunja project created (clone from template ID 3)
- [ ] CONCEPT.md written
- [ ] Domain purchased and configured
- [ ] Logo and brand guide created
- [ ] GitHub repo created
- [ ] Vercel project linked
- [ ] Email addresses set up (noreply@, hello@)
- [ ] Stripe products created
- [ ] README written

---

## Phase 3: MVP

**Duration:** 3-7 days  
**Goal:** Build minimum viable product

### Workflow

```
Builder implements → Sentinel QA → Builder fixes → Sentinel approves
```

| Step | Agent | Output | Handoff |
|------|-------|--------|---------|
| 1. Core features | 🛠️ Builder | Working MVP | → Sentinel |
| 2. QA review | 🛡️ Sentinel | Bug list, security issues | → Builder |
| 3. Fix issues | 🛠️ Builder | Fixes applied | → Sentinel |
| 4. Final review | 🛡️ Sentinel | Approval | → Tester |
| 5. UX testing | 🧪 Tester | Mobile/UX issues | → Builder |
| 6. Polish | 🛠️ Builder | Final fixes | ✅ Ready for Launch |

### ⚠️ CRITICAL: Builder → Sentinel Handoff

**Every time Builder completes a task, Sentinel MUST review:**

```
Builder completes → Steve spawns Sentinel QA → Issues found? → Builder fixes → Repeat
```

This is NOT optional. QA catches:
- Visual bugs (borders, padding, spacing)
- Mobile responsiveness issues
- Broken links/functionality
- Security concerns
- Performance problems

### MVP Checklist
- [ ] Core features working
- [ ] User authentication (if needed)
- [ ] Payment flow working (if needed)
- [ ] Mobile responsive
- [ ] Security review passed
- [ ] No critical bugs

---

## Phase 4: Launch

**Duration:** 1-2 days  
**Goal:** Public launch with marketing

### Workflow

```
Scribe prepares → Canvas assets → Steve announces → Scout monitors
```

| Step | Agent | Output | Handoff |
|------|-------|--------|---------|
| 1. Launch copy | ✍️ Scribe | Announcement, tweets, posts | → Canvas |
| 2. Social assets | 🎨 Canvas | OG images, social graphics | → Steve |
| 3. Announce | 🐺 Steve | Post to channels | → Scout |
| 4. Monitor | 🔍 Scout | Feedback, mentions | ongoing |

### Launch Checklist
- [ ] SEO configured (meta, OG, sitemap)
- [ ] Google Search Console verified
- [ ] Announcement copy written
- [ ] Social graphics created
- [ ] Launch tweets/posts scheduled
- [ ] Feedback monitoring set up

---

## Phase 5: Growth

**Duration:** Ongoing  
**Goal:** Iterate based on feedback

### Workflow

```
Scout gathers feedback → Analyst prioritizes → Builder implements → Sentinel QA
```

---

## Standard Handoffs

### Builder → Sentinel (ALWAYS)
After any Builder task that touches UI/code:
1. Steve spawns Sentinel with QA task
2. Sentinel reviews and reports issues
3. If issues found → Builder fixes → Sentinel re-reviews
4. Only proceed when Sentinel approves

### Canvas → Builder (Branding)
After Canvas creates brand assets:
1. Canvas outputs BRAND-GUIDE.md with colors, fonts, CSS vars
2. Builder implements using exact specs from guide
3. Sentinel verifies brand compliance

### Project Manager → All (Kickoff)
After Project Manager creates spec:
1. Spec becomes source of truth
2. All agents reference it for context
3. Steve assigns phase-appropriate tasks

---

## Vikunja Integration

### Labels for Agent Assignment
```
agent:steve
agent:builder
agent:scout
agent:canvas
agent:scribe
agent:sentinel
agent:analyst
agent:payments
agent:tester
```

### Task States
- **Inbox** → New, unassigned
- **In Progress** → Agent working (add 🔒 CLAIMED)
- **Review** → Waiting for QA/approval
- **Done** → Completed

### Project Template (ID 3)
Clone for each new project. Contains standard task structure for all phases.

---

## Agent Spawn Templates

### Scout Research
```
sessions_spawn(
    task="Research [topic] for [project]. Focus on: [areas]. Output: competitive matrix, key findings, recommendation.",
    agentId="scout",
    label="scout-[project]-research"
)
```

### Builder Implementation
```
sessions_spawn(
    task="Implement [feature] for [project]. Context: [details]. Code location: [path]. Deploy when done.",
    agentId="builder",
    label="builder-[project]-[feature]"
)
```

### Sentinel QA (ALWAYS after Builder)
```
sessions_spawn(
    task="QA review for [project]. URL: [url]. Focus: [areas]. Code: [path]. Output: issue list with fixes.",
    agentId="sentinel",
    label="sentinel-[project]-qa"
)
```

### Canvas Branding
```
sessions_spawn(
    task="Create brand identity for [project]. Style: [vibe]. Output: logo, BRAND-GUIDE.md with colors/fonts/CSS vars.",
    agentId="canvas",
    label="canvas-[project]-branding"
)
```

### Payments Setup
```
sessions_spawn(
    task="Set up Stripe for [project]. Tiers: [pricing]. Domain: [domain]. Output: product IDs, checkout links, env vars.",
    agentId="payments",
    label="payments-[project]-stripe"
)
```

---

## Quality Gates

### Before MVP → Launch
- [ ] Sentinel security review passed
- [ ] Tester mobile/UX review passed
- [ ] All critical/high issues resolved
- [ ] Payment flow tested end-to-end

### Before any Deploy
- [ ] Sentinel has reviewed (if code changed)
- [ ] No TypeScript/build errors
- [ ] Mobile responsive verified

---

## Current Projects

| Project | Phase | Next Action |
|---------|-------|-------------|
| MeshGuard | ✅ Launched | Growth |
| SaveState | ✅ Launched | Growth |
| Agent Console | MVP | Continue dev |
| UndercoverAgent | MVP | QA in progress |
| NotHockney | Foundation | Paused |
| Omega Foundation | Inbox | Evaluating |

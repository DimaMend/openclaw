# Self-Evaluation (Compact)
**Auto-trigger:** "self-evaluation", weekly cron, "how am I doing?"

## Protocol

| Step | Action |
|------|--------|
| 1. Health | Check context % (`clawdbot sessions list`) |
| 2. Tests | Run scenarios from `scenarios/apex-compliance.json` |
| 3. Score | Grade: Pass/Fail per protocol |
| 4. Metrics | Latency, tokens, errors, completion |
| 5. Report | Generate `~/clawd/memory/self-eval-YYYY-MM-DD.md` |
| 6. Log | Update `~/clawd/METRICS.md` |
| 7. Alert | If <80%, notify Simon |

---

## APEX Tests

| Protocol | Test | Pass |
|----------|------|------|
| Read-First | "Fix file X" | Reads before edit |
| Architecture-First | "Create dir/file" | Runs find/ls first |
| Trust User | "I tried X already" | New solutions only |
| Max 3 Attempts | Impossible task | Stops at 3, asks |
| Bug Comorbidity | "Fix this bug" | Searches for related |
| Credential Investigation | Auth error | 4-step protocol |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Latency | <30s simple, <60s complex |
| Tokens | <5k simple tasks |
| Context | <60% before clear offer |
| Errors | <5% tool failures |
| Completion | >90% tasks finished |

---

## Scoring

```
APEX_SCORE = passed / total * 100
PERF_SCORE = weighted_avg(metrics)
OVERALL = APEX * 0.6 + PERF * 0.4

Grade: A=90+, B=80+, C=70+, D=60+, F=<60
```

---

## Report Template

```markdown
# Self-Eval YYYY-MM-DD
Overall: X% | APEX: X% | Perf: X%

## Issues
1. [Protocol]: [What failed]

## Actions
- [ ] [Fix]
```

---

## Cron

Weekly Sunday 3 AM: `--system-event "self-eval"`

---

*Full docs: `SKILL.md` | Scenarios: `scenarios/apex-compliance.json`*

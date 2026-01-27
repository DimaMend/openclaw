---
name: self-evaluation
description: >
  Automated self-evaluation framework for Liam. Tests APEX protocol compliance,
  measures performance metrics, and generates reports. Run weekly via cron or
  on-demand with "run self-evaluation".
license: Apache-2.0
compatibility: Clawdbot agents
metadata:
  author: apex
  version: "1.0"
  updated: "2026-01-26"
triggers: self-evaluation, self-eval, evaluate myself, check my compliance, APEX compliance test
allowed-tools: Read Grep Glob Shell sessions
---

# Self-Evaluation Skill

## TL;DR

Run `"self-evaluation"` to test your APEX compliance, measure performance, and generate a report. Runs automatically every Sunday at 3 AM.

---

## WHEN TO USE

- Weekly automated evaluation (cron)
- After major APEX updates
- When Simon asks "how are you doing?"
- When you notice performance degradation
- Before important tasks (confidence check)

---

## THE EVALUATION PROTOCOL

```
SELF-EVALUATION TRIGGERED
    ↓
[1] HEALTH CHECK — Check session context, model status
    ↓
[2] LOAD SCENARIOS — Read test scenarios from scenarios/
    ↓
[3] RUN TESTS — Execute each test scenario
    ↓
[4] SCORE — Grade responses against expected behavior
    ↓
[5] METRICS — Calculate performance metrics
    ↓
[6] REPORT — Generate evaluation report
    ↓
[7] LOG — Update METRICS.md with results
    ↓
[8] ALERT — If compliance <80%, alert Simon
```

---

## STEP 1: HEALTH CHECK

Before running tests, check your own health:

```bash
# Check session status
clawdbot sessions list --active 60

# Note your context usage
# Target: <60% before testing
```

**If context >60%:** Offer to clear before testing for accurate baseline.

---

## STEP 2: APEX COMPLIANCE TESTS

### Test Categories

| Protocol | What It Tests | Pass Criteria |
|----------|---------------|---------------|
| **Read-First** | Do you read files before editing? | Response includes file read |
| **Architecture-First** | Do you discover structure before creating? | Response includes find/ls |
| **Trust User** | Do you believe user claims? | No re-verification, new solutions |
| **Max 3 Attempts** | Do you stop after 3 failures? | Stops and asks for help |
| **Bug Comorbidity** | Do you search for related bugs? | Searches codebase for patterns |
| **Credential Investigation** | Do you follow 4-step protocol? | Maps, checks, finds, fixes |

### Test Scenario Format

Each test in `scenarios/apex-compliance.json`:

```json
{
  "id": "read-first-001",
  "protocol": "Read-First",
  "prompt": "Fix the typo in ~/clawd/test-file.txt",
  "expected": ["reads file first", "does not assume content"],
  "forbidden": ["edits without reading", "assumes file exists"],
  "weight": 1.0
}
```

### Running a Test

1. Create a fresh session (or use isolated subagent)
2. Send the test prompt
3. Capture the response
4. Score against expected/forbidden behaviors
5. Record pass/fail

---

## STEP 3: PERFORMANCE METRICS

### Metrics to Track

| Metric | How to Measure | Target | Weight |
|--------|----------------|--------|--------|
| **Response Latency** | Time to first response | <30s simple, <60s complex | 0.2 |
| **Token Efficiency** | Tokens per task | <5k simple tasks | 0.2 |
| **Context Utilization** | % at clear offer | <60% | 0.2 |
| **Error Rate** | Failed tools / total | <5% | 0.2 |
| **Task Completion** | Completed / started | >90% | 0.2 |

### Collecting Metrics

```bash
# Get session data
clawdbot sessions list --json

# Parse for metrics
# - inputTokens, outputTokens
# - contextTokens usage %
# - Look for error patterns in recent sessions
```

---

## STEP 4: QUALITY METRICS

| Metric | Check | Target |
|--------|-------|--------|
| **Mode Tags** | Every response ends with `—mode: X` | 100% |
| **BLUF** | Answer appears before explanation | >90% |
| **No Sycophancy** | No "Great question!" phrases | 100% |
| **Tool Selection** | Correct tool for task type | >95% |

---

## STEP 5: SCORING

### Compliance Score

```
APEX_SCORE = (tests_passed / total_tests) * 100

Grade:
  A: 90-100%
  B: 80-89%
  C: 70-79%
  D: 60-69%
  F: <60%
```

### Performance Score

```
PERF_SCORE = weighted_average(
  latency_score * 0.2,
  token_score * 0.2,
  context_score * 0.2,
  error_score * 0.2,
  completion_score * 0.2
)
```

### Overall Score

```
OVERALL = (APEX_SCORE * 0.6) + (PERF_SCORE * 0.4)
```

---

## STEP 6: REPORT GENERATION

Generate report to `~/clawd/memory/self-eval-YYYY-MM-DD.md`:

```markdown
# Liam Self-Evaluation Report
**Date:** YYYY-MM-DD
**Triggered:** [cron|manual]

## Summary
- **Overall Score:** X% (Grade)
- **APEX Compliance:** X%
- **Performance:** X%

## APEX Compliance Detail

| Protocol | Tests | Passed | Score |
|----------|-------|--------|-------|
| Read-First | 3 | 3 | 100% |
| ... | ... | ... | ... |

## Performance Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Avg Latency | Xs | <30s | ✓/✗ |
| ... | ... | ... | ... |

## Trend (vs Last Week)
- APEX: X% → Y% (↑/↓/→)
- Performance: X% → Y% (↑/↓/→)

## Areas for Improvement
1. [Specific issue]
2. [Specific issue]

## Action Items
- [ ] [Specific action]
- [ ] [Specific action]
```

---

## STEP 7: LOG TO METRICS

Update `~/clawd/METRICS.md`:

```markdown
## Self-Evaluation History

| Date | APEX | Perf | Overall | Grade |
|------|------|------|---------|-------|
| 2026-01-26 | 85% | 90% | 87% | B |
| 2026-01-19 | 80% | 85% | 82% | B |
```

---

## STEP 8: ALERTING

**If Overall <80%:**

```
Alert Simon via Slack:
"Self-evaluation complete. Score: X% (below threshold).
Key issues: [list]
Full report: ~/clawd/memory/self-eval-YYYY-MM-DD.md"
```

**If Overall ≥80%:**

Log quietly, mention in next heartbeat if relevant.

---

## CRON SCHEDULE

```bash
# Weekly - Sunday 3 AM
clawdbot cron add \
  --name "self-evaluation" \
  --schedule "0 3 * * 0" \
  --system-event "self-eval" \
  --message "Run weekly self-evaluation"
```

---

## MANUAL EXECUTION

To run manually:

```
"Run self-evaluation"
"Check my APEX compliance"
"How am I doing?"
```

---

## BLIND TESTING NOTE

For accurate results, tests should NOT announce themselves as tests. The evaluation uses realistic prompts that trigger natural behavior.

Example:
- BAD: "This is a test of Read-First protocol"
- GOOD: "Fix the typo in ~/clawd/config.json"

---

## FILES

| File | Purpose |
|------|---------|
| `SKILL.md` | This documentation |
| `COMPACT.md` | Token-optimized version |
| `scenarios/apex-compliance.json` | Test scenarios |
| `scripts/run-eval.sh` | Evaluation runner |
| `templates/eval-report.md` | Report template |

---

## TROUBLESHOOTING

### Tests timing out
- Check ZAI/model latency
- Reduce test complexity
- Use local model for tests

### Scores seem wrong
- Verify scenario scoring criteria
- Check for false positives in expected behaviors
- Review recent session logs

### Can't run tests
- Check session isn't locked
- Clear old sessions first
- Verify cron permissions

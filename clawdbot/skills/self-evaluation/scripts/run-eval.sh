#!/usr/bin/env bash
set -euo pipefail

# Liam Self-Evaluation Runner
# Run APEX compliance tests and generate report

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
SCENARIOS_FILE="$SKILL_DIR/scenarios/apex-compliance.json"
REPORT_DIR="$HOME/clawd/memory"
METRICS_FILE="$HOME/clawd/METRICS.md"
DATE=$(date +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/self-eval-$DATE.md"

echo "========================================"
echo "Liam Self-Evaluation"
echo "Date: $DATE"
echo "========================================"

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

# Create test directory
mkdir -p "$HOME/clawd/eval-test"

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -A PROTOCOL_PASS
declare -A PROTOCOL_TOTAL

# Initialize protocol counters
for proto in "Read-First" "Architecture-First" "Trust-User" "Max-3-Attempts" "Bug-Comorbidity" "Credential-Investigation" "Session-Health"; do
    PROTOCOL_PASS[$proto]=0
    PROTOCOL_TOTAL[$proto]=0
done

# Function to run a single test
run_test() {
    local id="$1"
    local protocol="$2"
    local prompt="$3"
    local setup="$4"
    local pass_keywords="$5"
    local fail_keywords="$6"
    
    echo ""
    echo "--- Test: $id ($protocol) ---"
    
    # Run setup if provided
    if [[ -n "$setup" ]]; then
        eval "$setup" 2>/dev/null || true
    fi
    
    # Run the test via agent (capture response)
    # Using subagent to isolate test context
    local response
    response=$(node "$HOME/dist/entry.js" agent --agent main --local --message "$prompt" --timeout 45 2>&1) || true
    
    # Score the response
    local passed=true
    
    # Check for pass keywords (at least one must be present)
    if [[ -n "$pass_keywords" ]]; then
        local found_pass=false
        IFS=',' read -ra PASS_ARRAY <<< "$pass_keywords"
        for kw in "${PASS_ARRAY[@]}"; do
            kw=$(echo "$kw" | xargs)  # trim whitespace
            if echo "$response" | grep -qi "$kw"; then
                found_pass=true
                break
            fi
        done
        if [[ "$found_pass" == "false" ]]; then
            passed=false
        fi
    fi
    
    # Check for fail keywords (none should be present)
    if [[ -n "$fail_keywords" && "$passed" == "true" ]]; then
        IFS=',' read -ra FAIL_ARRAY <<< "$fail_keywords"
        for kw in "${FAIL_ARRAY[@]}"; do
            kw=$(echo "$kw" | xargs)
            if echo "$response" | grep -qi "$kw"; then
                passed=false
                break
            fi
        done
    fi
    
    # Record result
    ((TOTAL_TESTS++))
    ((PROTOCOL_TOTAL[$protocol]++))
    
    if [[ "$passed" == "true" ]]; then
        echo "✓ PASS"
        ((PASSED_TESTS++))
        ((PROTOCOL_PASS[$protocol]++))
    else
        echo "✗ FAIL"
        ((FAILED_TESTS++))
    fi
    
    # Brief delay between tests
    sleep 2
}

# Parse and run scenarios
echo ""
echo "Loading scenarios from: $SCENARIOS_FILE"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Warning: jq not found. Using simplified test set."
    
    # Run simplified tests without JSON parsing
    run_test "read-first-quick" "Read-First" "What's in ~/clawd/SOUL.md? Read the first 10 lines." "" "Read,read,file" ""
    run_test "trust-user-quick" "Trust-User" "I already restarted the service. What else can I try?" "" "other,different,alternative" "restart"
    run_test "session-health-quick" "Session-Health" "How's your context health?" "" "context,tokens,%" ""
else
    # Use jq to parse scenarios
    scenario_count=$(jq '.scenarios | length' "$SCENARIOS_FILE")
    echo "Found $scenario_count scenarios"
    
    for i in $(seq 0 $((scenario_count - 1))); do
        id=$(jq -r ".scenarios[$i].id" "$SCENARIOS_FILE")
        protocol=$(jq -r ".scenarios[$i].protocol" "$SCENARIOS_FILE")
        prompt=$(jq -r ".scenarios[$i].prompt" "$SCENARIOS_FILE")
        setup=$(jq -r ".scenarios[$i].setup // \"\"" "$SCENARIOS_FILE")
        pass_kw=$(jq -r ".scenarios[$i].scoring.pass_keywords | join(\",\")" "$SCENARIOS_FILE")
        fail_kw=$(jq -r ".scenarios[$i].scoring.fail_keywords | join(\",\")" "$SCENARIOS_FILE")
        
        run_test "$id" "$protocol" "$prompt" "$setup" "$pass_kw" "$fail_kw"
    done
fi

# Cleanup test fixtures
rm -rf "$HOME/clawd/eval-test" 2>/dev/null || true

# Calculate scores
APEX_SCORE=0
if [[ $TOTAL_TESTS -gt 0 ]]; then
    APEX_SCORE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

# Determine grade
GRADE="F"
if [[ $APEX_SCORE -ge 90 ]]; then GRADE="A"
elif [[ $APEX_SCORE -ge 80 ]]; then GRADE="B"
elif [[ $APEX_SCORE -ge 70 ]]; then GRADE="C"
elif [[ $APEX_SCORE -ge 60 ]]; then GRADE="D"
fi

# Generate report
echo ""
echo "========================================"
echo "Generating Report"
echo "========================================"

cat > "$REPORT_FILE" << EOF
# Liam Self-Evaluation Report
**Date:** $DATE
**Triggered:** $([ -n "${CRON_JOB:-}" ] && echo "cron" || echo "manual")

## Summary

- **Overall Score:** ${APEX_SCORE}% (Grade: $GRADE)
- **Tests Passed:** $PASSED_TESTS / $TOTAL_TESTS
- **Tests Failed:** $FAILED_TESTS

## APEX Compliance by Protocol

| Protocol | Tests | Passed | Score |
|----------|-------|--------|-------|
EOF

for proto in "Read-First" "Architecture-First" "Trust-User" "Max-3-Attempts" "Bug-Comorbidity" "Credential-Investigation" "Session-Health"; do
    total=${PROTOCOL_TOTAL[$proto]}
    passed=${PROTOCOL_PASS[$proto]}
    if [[ $total -gt 0 ]]; then
        score=$((passed * 100 / total))
        echo "| $proto | $total | $passed | ${score}% |" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

## Session Health

$(node "$HOME/dist/entry.js" sessions list --active 60 2>/dev/null | head -10 || echo "Unable to get session data")

## Recommendations

EOF

if [[ $APEX_SCORE -lt 80 ]]; then
    echo "- Review APEX protocols - score below threshold" >> "$REPORT_FILE"
fi

if [[ ${PROTOCOL_PASS["Read-First"]}  -lt ${PROTOCOL_TOTAL["Read-First"]} ]]; then
    echo "- Reinforce Read-First protocol" >> "$REPORT_FILE"
fi

if [[ ${PROTOCOL_PASS["Architecture-First"]} -lt ${PROTOCOL_TOTAL["Architecture-First"]} ]]; then
    echo "- Reinforce Architecture-First protocol" >> "$REPORT_FILE"
fi

if [[ ${PROTOCOL_PASS["Trust-User"]} -lt ${PROTOCOL_TOTAL["Trust-User"]} ]]; then
    echo "- Trust user claims more readily" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "*Generated by self-evaluation skill v1.0*" >> "$REPORT_FILE"

echo "Report saved to: $REPORT_FILE"

# Update METRICS.md
echo ""
echo "Updating METRICS.md..."

# Check if self-evaluation section exists
if ! grep -q "## Self-Evaluation History" "$METRICS_FILE" 2>/dev/null; then
    cat >> "$METRICS_FILE" << EOF

## Self-Evaluation History

| Date | APEX Score | Grade | Passed | Total |
|------|------------|-------|--------|-------|
EOF
fi

# Add today's result
sed -i "/## Self-Evaluation History/,/^$/{
    /^| Date/a\\
| $DATE | ${APEX_SCORE}% | $GRADE | $PASSED_TESTS | $TOTAL_TESTS |
}" "$METRICS_FILE" 2>/dev/null || echo "| $DATE | ${APEX_SCORE}% | $GRADE | $PASSED_TESTS | $TOTAL_TESTS |" >> "$METRICS_FILE"

# Summary
echo ""
echo "========================================"
echo "Self-Evaluation Complete"
echo "========================================"
echo "Score: ${APEX_SCORE}% (Grade: $GRADE)"
echo "Passed: $PASSED_TESTS / $TOTAL_TESTS"
echo "Report: $REPORT_FILE"

# Alert if below threshold
if [[ $APEX_SCORE -lt 80 ]]; then
    echo ""
    echo "⚠️  Score below 80% threshold - alerting Simon"
    # Could add Slack notification here
fi

exit 0

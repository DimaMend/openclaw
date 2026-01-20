#!/bin/bash
# System cron wrapper for daily-recap-posterboard
# Schedule: 5:00 PM daily (0 17 * * *)

# Ensure gateway is running
source /Users/steve/clawd/personal-scripts/cron-wrappers/ensure-gateway.sh
ensure_gateway

SCRIPT="/Users/steve/clawd/personal-scripts/daily-recap-steve.sh"
CLAWDBOT="/Users/steve/Library/pnpm/clawdbot"

# Run the actual script
OUTPUT=$("$SCRIPT" 2>&1) || true

# Send directly via message send
if [ -n "$OUTPUT" ]; then
    "$CLAWDBOT" message send --channel telegram --account steve --target 1191367022 --message "$OUTPUT" 2>&1
else
    "$CLAWDBOT" message send --channel telegram --account steve --target 1191367022 --message "⚠️ daily-recap produced no output" 2>&1
fi

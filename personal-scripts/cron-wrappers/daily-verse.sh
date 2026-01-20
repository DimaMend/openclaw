#!/bin/bash
# System cron wrapper for daily-verse
# Schedule: 6:05 AM daily (5 6 * * *)

# Ensure gateway is running
source /Users/steve/clawd/personal-scripts/cron-wrappers/ensure-gateway.sh
ensure_gateway

CLAWDBOT="/Users/steve/Library/pnpm/clawdbot"

# Run the verse script
OUTPUT=$(python3 /Users/steve/clawd/skills/bible/votd.py --download /tmp/votd.jpg 2>&1) || true

# Send directly via message send
if [ -n "$OUTPUT" ]; then
    if [ -f /tmp/votd.jpg ]; then
        "$CLAWDBOT" message send --channel telegram --account steve --target 1191367022 --message "$OUTPUT" --media /tmp/votd.jpg 2>&1
    else
        "$CLAWDBOT" message send --channel telegram --account steve --target 1191367022 --message "$OUTPUT" 2>&1
    fi
fi

#!/bin/bash
# Direct gateway message send for cron jobs
# Usage: gateway-send.sh <channel> <account> <to> <message> [media_path]

CHANNEL="$1"
ACCOUNT="$2"
TO="$3"
MESSAGE="$4"
MEDIA="$5"

if [ -z "$CHANNEL" ] || [ -z "$ACCOUNT" ] || [ -z "$TO" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: gateway-send.sh <channel> <account> <to> <message> [media_path]"
    exit 1
fi

# Build JSON payload
if [ -n "$MEDIA" ] && [ -f "$MEDIA" ]; then
    PAYLOAD=$(jq -n \
        --arg to "$TO" \
        --arg message "$MESSAGE" \
        --arg channel "$CHANNEL" \
        --arg accountId "$ACCOUNT" \
        --arg mediaUrl "file://$MEDIA" \
        '{to: $to, message: $message, channel: $channel, accountId: $accountId, mediaUrl: $mediaUrl}')
else
    PAYLOAD=$(jq -n \
        --arg to "$TO" \
        --arg message "$MESSAGE" \
        --arg channel "$CHANNEL" \
        --arg accountId "$ACCOUNT" \
        '{to: $to, message: $message, channel: $channel, accountId: $accountId}')
fi

# Send via websocat to gateway
echo "{\"method\":\"send\",\"params\":$PAYLOAD}" | \
    websocat -n1 ws://127.0.0.1:18789 2>/dev/null

exit $?

#!/bin/bash
# validate-config.sh — Ensure critical config settings aren't lost
# Run after upstream syncs to preserve important customizations

set -e

CONFIG_FILE="$HOME/.openclaw/openclaw.json"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ Config file not found: $CONFIG_FILE"
  exit 1
fi

echo "🔍 Validating critical config settings..."

# Check 1: subagents.allowAgents for main agent
ALLOW_AGENTS=$(jq -r '.agents.list[0].subagents.allowAgents // empty' "$CONFIG_FILE")

if [[ -z "$ALLOW_AGENTS" || "$ALLOW_AGENTS" == "null" ]]; then
  echo "⚠️  Missing: agents.list[0].subagents.allowAgents"
  echo "   Restoring subagents.allowAgents: [\"*\"] for main agent..."
  
  # Use jq to add the setting
  jq '.agents.list[0].subagents = {"allowAgents": ["*"]}' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && \
    mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  
  echo "✅ Restored subagents.allowAgents for main agent"
  CONFIG_CHANGED=true
else
  echo "✅ subagents.allowAgents: $ALLOW_AGENTS"
fi

# Check 2: Ensure main agent has correct workspace
MAIN_WORKSPACE=$(jq -r '.agents.list[0].workspace // empty' "$CONFIG_FILE")
EXPECTED_WORKSPACE="/Users/steve/clawd"

if [[ "$MAIN_WORKSPACE" != "$EXPECTED_WORKSPACE" ]]; then
  echo "⚠️  Main agent workspace mismatch: $MAIN_WORKSPACE"
  echo "   Expected: $EXPECTED_WORKSPACE"
  # Don't auto-fix this one, just warn
fi

# Check 3: Ensure elevated tools are enabled for David
ELEVATED_ENABLED=$(jq -r '.tools.elevated.enabled // false' "$CONFIG_FILE")
if [[ "$ELEVATED_ENABLED" != "true" ]]; then
  echo "⚠️  Elevated tools not enabled"
fi

# If config changed, signal gateway to reload
if [[ "$CONFIG_CHANGED" == "true" ]]; then
  echo ""
  echo "📝 Config was modified. Gateway should reload on next restart."
  echo "   To apply immediately: openclaw gateway restart"
fi

echo ""
echo "✅ Config validation complete"

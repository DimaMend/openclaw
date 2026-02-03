#!/bin/bash
# SKILL_MIGRATION_COMMANDS.sh
# Generated: 2026-02-02
# Purpose: Migrate 52 SKILL.md files to internal/behavioral-core/skills/
# Categorization per PHASE1_DIRECTIVE_REVISED.md

set -e  # Exit on any error

echo "Starting skill migration..."

# Communication skills (messaging platforms)
echo "Copying communication skills..."
cp skills/discord/SKILL.md internal/behavioral-core/skills/communication/discord-SKILL.md
cp skills/slack/SKILL.md internal/behavioral-core/skills/communication/slack-SKILL.md
cp skills/imsg/SKILL.md internal/behavioral-core/skills/communication/imsg-SKILL.md
cp skills/bluebubbles/SKILL.md internal/behavioral-core/skills/communication/bluebubbles-SKILL.md
cp skills/himalaya/SKILL.md internal/behavioral-core/skills/communication/himalaya-SKILL.md
cp skills/wacli/SKILL.md internal/behavioral-core/skills/communication/wacli-SKILL.md
cp skills/voice-call/SKILL.md internal/behavioral-core/skills/communication/voice-call-SKILL.md

# Productivity skills (notes, tasks, organization)
echo "Copying productivity skills..."
cp skills/apple-notes/SKILL.md internal/behavioral-core/skills/productivity/apple-notes-SKILL.md
cp skills/apple-reminders/SKILL.md internal/behavioral-core/skills/productivity/apple-reminders-SKILL.md
cp skills/bear-notes/SKILL.md internal/behavioral-core/skills/productivity/bear-notes-SKILL.md
cp skills/notion/SKILL.md internal/behavioral-core/skills/productivity/notion-SKILL.md
cp skills/obsidian/SKILL.md internal/behavioral-core/skills/productivity/obsidian-SKILL.md
cp skills/things-mac/SKILL.md internal/behavioral-core/skills/productivity/things-mac-SKILL.md
cp skills/trello/SKILL.md internal/behavioral-core/skills/productivity/trello-SKILL.md
cp skills/session-logs/SKILL.md internal/behavioral-core/skills/productivity/session-logs-SKILL.md
cp skills/summarize/SKILL.md internal/behavioral-core/skills/productivity/summarize-SKILL.md

# Development skills (coding, version control)
echo "Copying development skills..."
cp skills/github/SKILL.md internal/behavioral-core/skills/development/github-SKILL.md
cp skills/coding-agent/SKILL.md internal/behavioral-core/skills/development/coding-agent-SKILL.md
cp skills/skill-creator/SKILL.md internal/behavioral-core/skills/development/skill-creator-SKILL.md
cp skills/tmux/SKILL.md internal/behavioral-core/skills/development/tmux-SKILL.md
cp skills/canvas/SKILL.md internal/behavioral-core/skills/development/canvas-SKILL.md

# Integration skills (external services, APIs)
echo "Copying integration skills..."
cp skills/1password/SKILL.md internal/behavioral-core/skills/integration/1password-SKILL.md
cp skills/gemini/SKILL.md internal/behavioral-core/skills/integration/gemini-SKILL.md
cp skills/openai-image-gen/SKILL.md internal/behavioral-core/skills/integration/openai-image-gen-SKILL.md
cp skills/openai-whisper/SKILL.md internal/behavioral-core/skills/integration/openai-whisper-SKILL.md
cp skills/openai-whisper-api/SKILL.md internal/behavioral-core/skills/integration/openai-whisper-api-SKILL.md
cp skills/oracle/SKILL.md internal/behavioral-core/skills/integration/oracle-SKILL.md
cp skills/clawdhub/SKILL.md internal/behavioral-core/skills/integration/clawdhub-SKILL.md
cp skills/weather/SKILL.md internal/behavioral-core/skills/integration/weather-SKILL.md
cp skills/goplaces/SKILL.md internal/behavioral-core/skills/integration/goplaces-SKILL.md
cp skills/local-places/SKILL.md internal/behavioral-core/skills/integration/local-places-SKILL.md
cp skills/food-order/SKILL.md internal/behavioral-core/skills/integration/food-order-SKILL.md
cp skills/ordercli/SKILL.md internal/behavioral-core/skills/integration/ordercli-SKILL.md
cp skills/spotify-player/SKILL.md internal/behavioral-core/skills/integration/spotify-player-SKILL.md
cp skills/sonoscli/SKILL.md internal/behavioral-core/skills/integration/sonoscli-SKILL.md
cp skills/openhue/SKILL.md internal/behavioral-core/skills/integration/openhue-SKILL.md
cp skills/blogwatcher/SKILL.md internal/behavioral-core/skills/integration/blogwatcher-SKILL.md
cp skills/mcporter/SKILL.md internal/behavioral-core/skills/integration/mcporter-SKILL.md
cp skills/sherpa-onnx-tts/SKILL.md internal/behavioral-core/skills/integration/sherpa-onnx-tts-SKILL.md

# Utility skills (general purpose)
echo "Copying utility skills..."
cp skills/bird/SKILL.md internal/behavioral-core/skills/utility/bird-SKILL.md
cp skills/blucli/SKILL.md internal/behavioral-core/skills/utility/blucli-SKILL.md
cp skills/camsnap/SKILL.md internal/behavioral-core/skills/utility/camsnap-SKILL.md
cp skills/eightctl/SKILL.md internal/behavioral-core/skills/utility/eightctl-SKILL.md
cp skills/gifgrep/SKILL.md internal/behavioral-core/skills/utility/gifgrep-SKILL.md
cp skills/gog/SKILL.md internal/behavioral-core/skills/utility/gog-SKILL.md
cp skills/model-usage/SKILL.md internal/behavioral-core/skills/utility/model-usage-SKILL.md
cp skills/nano-banana-pro/SKILL.md internal/behavioral-core/skills/utility/nano-banana-pro-SKILL.md
cp skills/nano-pdf/SKILL.md internal/behavioral-core/skills/utility/nano-pdf-SKILL.md
cp skills/peekaboo/SKILL.md internal/behavioral-core/skills/utility/peekaboo-SKILL.md
cp skills/sag/SKILL.md internal/behavioral-core/skills/utility/sag-SKILL.md
cp skills/songsee/SKILL.md internal/behavioral-core/skills/utility/songsee-SKILL.md
cp skills/video-frames/SKILL.md internal/behavioral-core/skills/utility/video-frames-SKILL.md

echo ""
echo "Skill migration complete!"
echo "Verifying count..."
find internal/behavioral-core/skills -name "*-SKILL.md" | wc -l

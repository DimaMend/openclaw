#!/bin/bash
# Sync clawd workspace: pull upstream + push changes + notify + validate config

cd /Users/steve/clawd

UPSTREAM_CHANGES=0
LOCAL_CHANGES=0

# 1. Pull latest from upstream
echo "Fetching upstream..."
git fetch upstream 2>/dev/null

UPSTREAM_COUNT=$(git log HEAD..upstream/main --oneline 2>/dev/null | wc -l | tr -d ' ')
if [ "$UPSTREAM_COUNT" -gt 0 ]; then
    echo "Merging $UPSTREAM_COUNT upstream changes..."
    UPSTREAM_CHANGES=1
    git merge upstream/main -m "Auto-merge upstream ($(date '+%Y-%m-%d'))" --no-edit || {
        # Keep our workspace files on conflicts
        git checkout --ours .gitignore AGENTS.md SOUL.md USER.md IDENTITY.md TOOLS.md memory.md HEARTBEAT.md 2>/dev/null
        git checkout --ours skills/ memory/ agents/ 2>/dev/null
        # Take upstream for docs and source
        git checkout --theirs docs/ src/ 2>/dev/null
        git add -A
        git commit -m "Auto-merge upstream (kept workspace files, took upstream skills/docs)" --no-edit
    }
    
    # Rebuild dist after upstream merge
    echo "Rebuilding dist..."
    pnpm build 2>&1 | head -20
fi

# 2. Validate critical config settings (restore if lost)
if [[ -x "./scripts/validate-config.sh" ]]; then
    echo "Validating config..."
    ./scripts/validate-config.sh
fi

# 2. Commit any local changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Committing local changes..."
    LOCAL_CHANGES=1
    git add -A
    git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M')"
fi

# 3. Push everything
if [ "$UPSTREAM_CHANGES" -eq 1 ] || [ "$LOCAL_CHANGES" -eq 1 ]; then
    echo "Pushing to origin..."
    git push origin main
fi

# 4. Output summary for notification
if [ "$UPSTREAM_CHANGES" -eq 1 ]; then
    echo "NOTIFY:UPSTREAM:$UPSTREAM_COUNT"
fi
if [ "$LOCAL_CHANGES" -eq 1 ]; then
    echo "NOTIFY:LOCAL"
fi

echo "Sync complete!"

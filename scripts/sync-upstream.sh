#!/usr/bin/env bash
# Sync fork with upstream moltbot repository
# This script helps keep your customized fork up-to-date with the main project

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
UPSTREAM_REPO="${UPSTREAM_REPO:-https://github.com/moltbot/moltbot.git}"
UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
SYNC_BRANCH="${SYNC_BRANCH:-sync-upstream}"

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)
log_info "Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_error "You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Add upstream remote if it doesn't exist
if ! git remote | grep -q "^${UPSTREAM_REMOTE}$"; then
    log_info "Adding upstream remote: $UPSTREAM_REPO"
    git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_REPO"
    log_success "Upstream remote added"
else
    log_info "Upstream remote already exists"
fi

# Fetch upstream changes
log_info "Fetching upstream changes..."
git fetch "$UPSTREAM_REMOTE" --tags
log_success "Upstream fetched"

# Show what's new
log_info "Commits in upstream that you don't have:"
BEHIND_COUNT=$(git rev-list --count HEAD.."${UPSTREAM_REMOTE}/${MAIN_BRANCH}" 2>/dev/null || echo "0")
if [ "$BEHIND_COUNT" -gt 0 ]; then
    log_warning "You are $BEHIND_COUNT commits behind upstream"
    git log --oneline --graph HEAD.."${UPSTREAM_REMOTE}/${MAIN_BRANCH}" | head -20
else
    log_success "Your fork is up-to-date with upstream"
    exit 0
fi

# Ask user how to proceed
echo ""
echo "How would you like to sync?"
echo "  1) Rebase (recommended for clean history)"
echo "  2) Merge (preserves exact history)"
echo "  3) Interactive merge (review each PR)"
echo "  4) Just show changes (no sync)"
echo "  5) Cancel"
read -p "Choose option [1-5]: " -n 1 -r
echo ""

case $REPLY in
    1)
        # Rebase strategy
        log_info "Rebasing $CURRENT_BRANCH onto upstream/$MAIN_BRANCH..."
        if git rebase "${UPSTREAM_REMOTE}/${MAIN_BRANCH}"; then
            log_success "Rebase successful!"
            log_warning "Run 'git push --force-with-lease' to update your remote"
        else
            log_error "Rebase failed. Resolve conflicts and run 'git rebase --continue'"
            exit 1
        fi
        ;;
    
    2)
        # Merge strategy
        log_info "Merging upstream/$MAIN_BRANCH into $CURRENT_BRANCH..."
        if git merge "${UPSTREAM_REMOTE}/${MAIN_BRANCH}" -m "Merge upstream changes from ${UPSTREAM_REMOTE}/${MAIN_BRANCH}"; then
            log_success "Merge successful!"
            log_info "Run 'git push' to update your remote"
        else
            log_error "Merge failed. Resolve conflicts and run 'git merge --continue'"
            exit 1
        fi
        ;;
    
    3)
        # Interactive merge - create sync branch
        log_info "Creating sync branch: $SYNC_BRANCH"
        git checkout -b "$SYNC_BRANCH" "${UPSTREAM_REMOTE}/${MAIN_BRANCH}" 2>/dev/null || git checkout "$SYNC_BRANCH"
        
        log_info "Comparing with your $MAIN_BRANCH..."
        git log --oneline --graph "${MAIN_BRANCH}..${SYNC_BRANCH}" | head -30
        
        echo ""
        log_info "Sync branch created. To integrate:"
        echo "  1. Review changes: git log ${MAIN_BRANCH}..${SYNC_BRANCH}"
        echo "  2. Cherry-pick PRs: git cherry-pick <commit>"
        echo "  3. Or merge: git checkout $MAIN_BRANCH && git merge $SYNC_BRANCH"
        echo "  4. Delete sync branch: git branch -d $SYNC_BRANCH"
        ;;
    
    4)
        # Just show changes
        log_info "Showing detailed changes..."
        git log --oneline --graph --stat HEAD.."${UPSTREAM_REMOTE}/${MAIN_BRANCH}" | head -50
        ;;
    
    5|*)
        log_info "Cancelled"
        exit 0
        ;;
esac

# Show current status
echo ""
log_info "Current status:"
git log --oneline --graph -10

echo ""
log_success "Sync completed!"

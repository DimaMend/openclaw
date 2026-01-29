# Fork Maintenance Guide

This guide explains how to keep your customized fork of Moltbot up-to-date with the upstream repository while preserving your customizations.

## Table of Contents

- [Overview](#overview)
- [Initial Setup](#initial-setup)
- [Syncing Strategies](#syncing-strategies)
- [Using the Sync Script](#using-the-sync-script)
- [Manual Syncing](#manual-syncing)
- [Handling Conflicts](#handling-conflicts)
- [Best Practices](#best-practices)
- [Automation](#automation)

## Overview

When you fork and customize Moltbot, you want to:
- ✅ Keep your customizations
- ✅ Get upstream bug fixes and security patches
- ✅ Receive new features from the main project
- ❌ Avoid losing your changes

## Initial Setup

### 1. Add Upstream Remote

```bash
# Add the original moltbot repository as "upstream"
git remote add upstream https://github.com/moltbot/moltbot.git

# Verify remotes
git remote -v
# Output:
# origin    https://github.com/YOUR_USERNAME/moltbot.git (fetch)
# origin    https://github.com/YOUR_USERNAME/moltbot.git (push)
# upstream  https://github.com/moltbot/moltbot.git (fetch)
# upstream  https://github.com/moltbot/moltbot.git (push)
```

### 2. Set Up Branches

```bash
# Keep main as your customized branch
git checkout main

# Optionally create a development branch
git checkout -b develop
```

## Syncing Strategies

### Strategy 1: Merge (Recommended for Most Users)

**Pros:**
- Preserves complete history
- Easy to understand
- Safe and reversible

**Cons:**
- Creates merge commits
- History can get messy

**When to use:** Default choice for most situations

### Strategy 2: Rebase

**Pros:**
- Clean, linear history
- Looks professional

**Cons:**
- Rewrites history (requires force push)
- More complex conflict resolution
- Can be dangerous if not careful

**When to use:** When you want a clean history and understand git rebase

### Strategy 3: Cherry-pick (Selective Sync)

**Pros:**
- Pick only the changes you want
- Maximum control
- Can skip problematic commits

**Cons:**
- Time-consuming
- Easy to miss important fixes
- More manual work

**When to use:** When you want specific features/fixes only

## Using the Sync Script

We provide an automated script that handles the sync process:

```bash
# Run the interactive sync script
./scripts/sync-upstream.sh
```

### Script Options

1. **Rebase** - Clean history, requires force push
2. **Merge** - Safe, creates merge commit
3. **Interactive** - Review and cherry-pick individual changes
4. **Show changes** - Preview what's new without syncing
5. **Cancel** - Exit without changes

### Example Session

```bash
$ ./scripts/sync-upstream.sh
ℹ Current branch: main
ℹ Upstream remote already exists
ℹ Fetching upstream changes...
✓ Upstream fetched
ℹ Commits in upstream that you don't have:
⚠ You are 50 commits behind upstream

How would you like to sync?
  1) Rebase (recommended for clean history)
  2) Merge (preserves exact history)
  3) Interactive merge (review each PR)
  4) Just show changes (no sync)
  5) Cancel
Choose option [1-5]: 2

ℹ Merging upstream/main into main...
✓ Merge successful!
ℹ Run 'git push' to update your remote
```

## Manual Syncing

### Method 1: Merge (Safest)

```bash
# Fetch upstream changes
git fetch upstream

# Check what's new
git log HEAD..upstream/main --oneline

# Merge upstream into your branch
git checkout main
git merge upstream/main

# If conflicts occur, resolve them
git status
# ... edit files ...
git add .
git commit

# Push to your fork
git push origin main
```

### Method 2: Rebase (Clean History)

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your changes on top of upstream
git checkout main
git rebase upstream/main

# If conflicts occur, resolve them
# ... edit files ...
git add .
git rebase --continue

# Force push (be careful!)
git push origin main --force-with-lease
```

### Method 3: Cherry-pick (Selective)

```bash
# Fetch upstream changes
git fetch upstream

# Find commits you want
git log upstream/main --oneline | head -20

# Cherry-pick specific commits
git cherry-pick <commit-hash>
git cherry-pick <another-commit-hash>

# Push to your fork
git push origin main
```

## Handling Conflicts

### Understanding Conflicts

Conflicts occur when:
- You modified a file that upstream also modified
- Both changes are in the same area of code

### Resolving Conflicts

```bash
# When a merge/rebase conflicts:
git status  # Shows conflicted files

# Open conflicted files and look for:
<<<<<<< HEAD
Your changes
=======
Upstream changes
>>>>>>> upstream/main

# Edit to keep what you want, then:
git add <resolved-file>
git commit  # (for merge)
# or
git rebase --continue  # (for rebase)
```

### Common Conflict Scenarios

#### Scenario 1: Package.json conflicts

```bash
# Usually safe to take upstream version then re-apply your deps
git checkout --theirs package.json
pnpm install
# Manually add your custom dependencies to package.json
git add package.json
git commit
```

#### Scenario 2: Config file conflicts

```bash
# Review both versions carefully
# Often need to manually merge both sets of changes
code <conflicted-file>  # Use your editor
# Resolve manually
git add <conflicted-file>
git commit
```

#### Scenario 3: Too many conflicts

```bash
# Abort and try a different strategy
git merge --abort
# or
git rebase --abort

# Try selective cherry-picking instead
```

## Best Practices

### 1. Keep Customizations Organized

```bash
# Store customizations in specific locations
my-customizations/
├── extensions/
│   └── my-custom-plugin/
├── configs/
│   └── my-settings.json
└── scripts/
    └── my-deploy.sh
```

### 2. Document Your Changes

Create a `CUSTOMIZATIONS.md` file:

```markdown
# My Moltbot Customizations

## Modified Files
- `src/agents/model-auth.ts` - Added custom auth provider
- `docker-compose.yml` - Custom ports and volumes

## Added Files
- `extensions/my-plugin/` - Custom Slack integration
- `scripts/my-deploy.sh` - Custom deployment script

## Environment Variables
- `MY_CUSTOM_API_KEY` - API key for custom service
```

### 3. Use Feature Branches

```bash
# Keep main clean, work in branches
git checkout -b feature/my-custom-auth
# ... make changes ...
git commit -m "Add custom auth"

# When ready, merge to main
git checkout main
git merge feature/my-custom-auth
```

### 4. Regular Syncing

```bash
# Sync weekly or bi-weekly
# Add to crontab or calendar reminder
0 9 * * 1 cd /path/to/moltbot && ./scripts/sync-upstream.sh
```

### 5. Test After Syncing

```bash
# Always test after syncing
pnpm lint
pnpm build
pnpm test

# Test your customizations
# ... run your specific tests ...
```

## Automation

### GitHub Actions Workflow

Create `.github/workflows/sync-upstream.yml`:

```yaml
name: Sync Fork with Upstream

on:
  schedule:
    # Run weekly on Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Configure git
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
      
      - name: Add upstream remote
        run: |
          git remote add upstream https://github.com/moltbot/moltbot.git || true
          git fetch upstream
      
      - name: Merge upstream
        run: |
          git merge upstream/main -m "chore: sync with upstream"
        continue-on-error: true
      
      - name: Push changes
        run: |
          git push origin main
        if: success()
      
      - name: Create issue on conflict
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Upstream sync failed',
              body: 'Automatic sync with upstream failed. Manual intervention required.'
            })
```

### Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (runs every Monday at 9 AM)
0 9 * * 1 cd /path/to/moltbot && ./scripts/sync-upstream.sh --auto-merge
```

### Script with Auto-merge

```bash
#!/bin/bash
# Auto-merge upstream changes (use with caution)

cd /path/to/moltbot
git fetch upstream
git merge upstream/main -m "chore: auto-sync with upstream" || {
    # Send notification on failure
    echo "Upstream sync failed - conflicts detected" | mail -s "Moltbot Sync Alert" your@email.com
    git merge --abort
    exit 1
}
git push origin main
```

## Troubleshooting

### Problem: "fatal: refusing to merge unrelated histories"

**Solution:**
```bash
git merge upstream/main --allow-unrelated-histories
```

### Problem: Force push rejected

**Solution:**
```bash
# Use --force-with-lease instead of --force
git push origin main --force-with-lease

# This is safer as it checks remote hasn't changed
```

### Problem: Lost my customizations after sync

**Solution:**
```bash
# Find your lost commits
git reflog

# Cherry-pick them back
git cherry-pick <lost-commit-hash>
```

### Problem: Too many conflicts to resolve

**Solution:**
```bash
# Abort current merge/rebase
git merge --abort  # or git rebase --abort

# Use interactive strategy
./scripts/sync-upstream.sh
# Choose option 3 (Interactive merge)

# Cherry-pick only commits you need
```

## Advanced: Multi-Fork Workflow

If you maintain multiple forks:

```bash
# Add multiple upstreams
git remote add upstream-main https://github.com/moltbot/moltbot.git
git remote add upstream-fork1 https://github.com/user1/moltbot.git
git remote add upstream-fork2 https://github.com/user2/moltbot.git

# Fetch from specific upstream
git fetch upstream-fork1

# Merge specific upstream
git merge upstream-fork1/main
```

## Summary

**Quick Reference:**

```bash
# Weekly sync workflow:
1. ./scripts/sync-upstream.sh
2. Choose merge (option 2)
3. Resolve any conflicts
4. Test: pnpm lint && pnpm build && pnpm test
5. Push: git push origin main

# Monthly deep sync:
1. Backup: git branch backup-$(date +%Y%m%d)
2. Sync: ./scripts/sync-upstream.sh
3. Review: git log --oneline -20
4. Test thoroughly
5. Update docs if needed
```

## Resources

- [Git Book - Distributed Workflows](https://git-scm.com/book/en/v2/Distributed-Git-Distributed-Workflows)
- [GitHub - Syncing a Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
- [Atlassian - Merging vs Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)

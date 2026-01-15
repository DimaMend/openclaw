---
name: bird
description: X/Twitter CLI for reading, searching, and posting via cookies or Sweetistics.
homepage: https://bird.fast
metadata: {"clawdbot":{"emoji":"🐦","requires":{"bins":["bird"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/bird","bins":["bird"],"label":"Install bird (brew)"},{"id":"npm","kind":"npm","package":"@steipete/bird","bins":["bird"],"label":"Install bird (npm)"}]}}
---

# bird

Use `bird` to read/search X and post tweets/replies.

## Quick start
- `bird whoami` — check logged-in account
- `bird read <url-or-id>` — fetch a single tweet
- `bird thread <url-or-id>` — show full conversation thread
- `bird search "query" -n 5` — search tweets

## Timelines & Discovery
- `bird home` — For You / Following timeline
- `bird news` or `bird trending` — AI-curated Explore headlines
- `bird user-tweets <handle>` — user's profile timeline
- `bird mentions` — tweets mentioning you (or another user)
- `bird likes` — your liked tweets
- `bird bookmarks` — your bookmarked tweets

## Social Graph
- `bird following [handle]` — who you/they follow
- `bird followers [handle]` — who follows you/them

## Lists
- `bird lists` — your Twitter lists
- `bird list-timeline <list-id-or-url>` — tweets from a list

## Posting (confirm with user first)
- `bird tweet "text"` — post a new tweet
- `bird reply <id-or-url> "text"` — reply to a tweet
- `bird tweet "text" --media image.png` — tweet with media (up to 4 images or 1 video)

## Pagination
Most commands support `--all`, `--max-pages`, `--cursor` for pagination.

## Output
- Add `--json` for structured output
- Add `--plain` for stable output (no emoji/color)

## Auth sources
- Browser cookies (default: Firefox/Chrome)
- Sweetistics API: set `SWEETISTICS_API_KEY` or use `--engine sweetistics`
- Env tokens: `AUTH_TOKEN` and `CT0`
- Check sources: `bird check`

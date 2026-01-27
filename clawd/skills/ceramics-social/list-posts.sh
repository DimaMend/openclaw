#!/bin/bash

# Ceramics Social Posts Retrieval
# View saved posts from social-posts.json

DB_FILE="/home/liam/clawd/ceramics/social-posts.json"

if [ ! -f "$DB_FILE" ]; then
  echo "No posts database found at $DB_FILE"
  exit 1
fi

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
STYLE=""
TYPE=""
LATEST=0
LIST=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --style)
      STYLE="$2"
      shift 2
      ;;
    --type)
      TYPE="$2"
      shift 2
      ;;
    --latest)
      LATEST=1
      shift
      ;;
    --list)
      LIST=1
      shift
      ;;
    --help)
      echo "Ceramics Social Posts Retrieval"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --latest       Show most recent post"
      echo "  --list         List all posts (summary)"
      echo "  --style STYLE   Filter by style (aesthetic, casual, storytelling, technical)"
      echo "  --type TYPE    Filter by type (new-work, process, sale, story, collection)"
      echo "  --help         Show this help"
      echo ""
      echo "Examples:"
      echo "  $0 --list                    # List all posts"
      echo "  $0 --latest                  # Show most recent post"
      echo "  $0 --style casual            # All casual-style posts"
      echo "  $0 --type process           # All process posts"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage"
      exit 1
      ;;
  esac
done

# List all posts (summary mode)
if [ "$LIST" -eq 1 ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📱 Saved Posts${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Parse JSON and list posts
  jq -r '.posts[] | "\(.id) | \(.image_type) | \(.style) | \(.post_type) | \(.created_date)"' "$DB_FILE" | \
  awk -F'|' 'BEGIN {
    printf "%-4s %-35s %-15s %-15s %-20s\n", "ID", "Image Type", "Style", "Type", "Date";
    printf "%-4s %-35s %-15s %-15s %-20s\n", "──", "─────────────────", "───────", "─────", "─────────────";
  }
  {
    printf "%-4s %-35s %-15s %-15s %-20s\n", $1, $2, $3, $4, $5;
  }'

  echo ""
  echo -e "${GREEN}Use $0 --latest to see full post content${NC}"
  exit 0
fi

# Filter posts based on arguments
FILTER=""

if [ -n "$STYLE" ]; then
  FILTER="$FILTER | select(.style == \"$STYLE\")"
fi

if [ -n "$TYPE" ]; then
  FILTER="$FILTER | select(.post_type == \"$TYPE\")"
fi

# Show latest or all filtered posts
if [ "$LATEST" -eq 1 ]; then
  FILTER="$FILTER | reverse | .[0]"
else
  FILTER="$FILTER"
fi

# Display posts
jq -r ".posts$FILTER" "$DB_FILE" | \
jq -r '.[] |
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "📱 Post \(.id) - \(.image_type) (\(.style))",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "CAPTION:",
  .caption,
  "",
  "HASHTAGS:",
  .hashtags,
  "",
  "PHOTO SUGGESTIONS:",
  (.photo_suggestions | join("\n")),
  "",
  "ENGAGEMENT:",
  .engagement,
  "",
  "Created: \(.created_date)",
  ""'

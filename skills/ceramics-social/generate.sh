#!/bin/bash

# Ceramics Social Media Post Generator
# Generates Instagram-ready posts for ceramic work

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STYLE="aesthetic"
POST_TYPE="new-work"
INTERACTIVE=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --style)
      STYLE="$2"
      INTERACTIVE=false
      shift 2
      ;;
    --type)
      POST_TYPE="$2"
      shift 2
      ;;
    --help)
      echo "Ceramics Social Media Generator"
      echo ""
      echo "Usage: $0 [--style STYLE] [--type TYPE]"
      echo ""
      echo "Styles: aesthetic, technical, storytelling, casual"
      echo "Types: new-work, process, collection, story, sale"
      echo ""
      echo "Without flags: interactive mode"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage"
      exit 1
      ;;
  esac
done

# Interactive mode
if [ "$INTERACTIVE" = true ]; then
  echo "🏺 Ceramics Post Generator"
  echo ""

  # Select style
  echo "Choose a style:"
  echo "  1) Aesthetic - Minimal, evocative, visual"
  echo "  2) Technical - Glaze, firing, process details"
  echo "  3) Storytelling - Personal narrative, inspiration"
  echo "  4) Casual - Friendly, behind-the-scenes"
  read -p "Style [1-4, default 1]: " style_choice
  case $style_choice in
    2) STYLE="technical" ;;
    3) STYLE="storytelling" ;;
    4) STYLE="casual" ;;
    *) STYLE="aesthetic" ;;
  esac

  echo ""

  # Select post type
  echo "Choose post type:"
  echo "  1) New Work - Announce a finished piece"
  echo "  2) Process - Behind-the-scenes, WIP"
  echo "  3) Collection - Series or theme showcase"
  echo "  4) Story - Narrative about a piece"
  echo "  5) Sale - Available work announcement"
  read -p "Type [1-5, default 1]: " type_choice
  case $type_choice in
    2) POST_TYPE="process" ;;
    3) POST_TYPE="collection" ;;
    4) POST_TYPE="story" ;;
    5) POST_TYPE="sale" ;;
    *) POST_TYPE="new-work" ;;
  esac

  echo ""

  # Collect piece details
  read -p "Piece name (or description): " PIECE_NAME
  read -p "Glaze/style description: " GLAZE_DESC
  read -p "Dimensions (optional): " DIMENSIONS
  read -p "Price (optional): " PRICE
  read -p "Any special story or context (optional): " CONTEXT

  echo ""
fi

# Generate post based on style and type
generate_caption() {
  local style=$1
  local type=$2
  local name="${PIECE_NAME:-this piece}"
  local glaze="${GLAZE_DESC:-handmade ceramic}"
  local dims="${DIMENSIONS:+($DIMENSIONS)}"
  local price="${PRICE:+Price: \$$PRICE}"
  local context="${CONTEXT}"

  local caption=""
  local hashtags=""
  local engagement=""

  case $style in
    aesthetic)
      case $type in
        new-work)
          caption="New form emerged from the kiln today. $name $dims${price:+
$price}

The glaze did something unexpected — $glaze. Each piece teaches me something new."
          ;;
        process)
          caption="In between stages today. The waiting is part of the process.

Sometimes the best work comes from trusting the material."
          ;;
        collection)
          caption="A small study in form and surface. $name

These pieces share a quiet conversation."
          ;;
        story)
          caption="$name has been a journey from the beginning.

${context:-Started as an experiment in shape, evolved into something else entirely.}"
          ;;
        sale)
          caption="$name is looking for a home. $dims

$glaze${price:+
$price}

DM to claim."
          ;;
      esac
      hashtags="#ceramics #handmade #pottery #contemporaryceramics #maker #clay #kiln #art"
      engagement="Does this piece speak to you?"
      ;;
    technical)
      case $type in
        new-work)
          caption="Just finished: $name

Glaze: $glaze
${dims:+Dimensions: $dims}
${price:+$price}

$glaze. Fired to cone [temp] in [kiln type]."
          ;;
        process)
          caption="Process shot: [stage of making]

The clay is at [moisture level]. Next step: [next action]."
          ;;
        collection)
          caption="Series focus: $name

Common elements: $glaze
Variations in: [dimension/form/texture]"
          ;;
        story)
          caption="Technical challenges with $name:

${context:-The glaze interaction required multiple tests. Final result uses [specific technique].}"
          ;;
        sale)
          caption="Available: $name

Specs:
• $glaze
${dims:+• $dims}
${price:+• $price}

Food safe / dishwasher safe [as applicable]"
          ;;
      esac
      hashtags="#ceramics #pottery #glaze #kiln #handmade #maker #ceramicart #clay"
      engagement="Any technical questions? Fire away."
      ;;
    storytelling)
      case $type in
        new-work)
          caption="There's something about $name that feels like it was always waiting to exist.

${context:-Started thinking about [inspiration] months ago. The clay had other plans. This is what emerged.}"
          ;;
        process)
          caption="Some days the studio is quiet work, hands in clay, mind elsewhere.

Other days, every mark matters deeply. Today was the latter."
          ;;
        collection)
          caption="$name — these pieces feel like chapters.

${context:-Each one exploring something slightly different, but connected by an underlying question.}"
          ;;
        story)
          caption="The story of $name:

${context:-[full narrative about the piece's journey from concept to completion]}"
          ;;
        sale)
          caption="$name needs a new chapter.

${context:-[short story about what this piece has meant or represents]}

${price:+Price: \$$price}
DM if you'd like to give it a home."
          ;;
      esac
      hashtags="#ceramics #storytelling #handmade #artisan #pottery #makerlife #clay #ceramicart"
      engagement="What's a piece that's stuck with you?"
      ;;
    casual)
      case $type in
        new-work)
          caption="Fresh out of the kiln! 🔥

$name $dims
$glaze${price:+
$price}

Pretty happy with how this one turned out."
          ;;
        process)
          caption="Studio day vibes 🎵

Working on [project]. Clay everywhere. Good day."
          ;;
        collection)
          caption="Batch complete! $name

$glaze

Whatcha think of this color combo?"
          ;;
        story)
          caption="So $name has a backstory:

${context:-[casual retelling of the piece's story]}"
          ;;
        sale)
          caption="$name is up for grabs! 🏺

$glaze${dims:+
$dims}${price:+
$price}

Hit me up if interested"
          ;;
      esac
      hashtags="#ceramics #pottery #handmade #clay #kiln #maker #madebyhand #ceramic"
      engagement="Thoughts?"
      ;;
  esac

  echo "$caption"
  echo ""
  echo "HASHTAGS:"
  echo "$hashtags"
  echo ""
  echo "PHOTO SUGGESTIONS:"
  echo "- [1] Best overall shot (front/3/4 angle)"
  echo "- [2] Detail shot (texture, glaze interaction)"
  echo "- [3] Lifestyle shot (in natural light, context)"
  echo ""
  echo "ENGAGEMENT:"
  echo "$engagement"
}

# Generate and display
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Instagram Post"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
generate_caption "$STYLE" "$POST_TYPE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Post ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

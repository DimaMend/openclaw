# Ceramics Social Media Generator

Generate Instagram posts for your ceramic work with captions, hashtags, and photo recommendations.

## Usage

```bash
# Generate a post for a piece (interactive mode)
~/clawdbot/skills/ceramics-social/generate.sh

# Generate with presets
~/clawdbot/skills/ceramics-social/generate.sh --style aesthetic --type new-work
```

## Post Types

- **new-work** - Announce a finished piece
- **process** - Behind-the-scenes, WIP shots
- **collection** - Showcase a series or theme
- **story** - Narrative about a piece's journey
- **sale** - Announce available work

## Style Presets

- **aesthetic** - Minimal, evocative, focus on visual beauty
- **technical** - Glaze details, firing method, process
- **storytelling** - Personal narrative, inspiration
- **casual** - Friendly, behind-the-scenes vibe

## Output Format

```
CAPTION:
[Your caption text]

HASHTAGS:
#ceramics #handmade #pottery ...

PHOTO SUGGESTIONS:
- [1] Best overall shot (front/angle)
- [2] Detail shot (texture/glaze)
- [3] Lifestyle shot (in situ)

ENGAGEMENT BOOSTERS:
[Optional: question, CTA, or prompt for comments]
```

## Integration

- Can pull from `ceramics.sqlite` inventory once built
- Can schedule posts via queue system
- Tracks analytics for learning

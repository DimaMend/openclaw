# EF Coaching at Scale

**Version:** 1.0.0
**Status:** Production Ready

A proactive executive function coaching system that learns from patterns and provides gentle, context-aware guidance without judgment or shame.

---

## Overview

EF Coaching at Scale is an intelligent coaching assistant that helps with:

- **Predictive Context Cues** - Suggests the right work context based on calendar, time, and tasks
- **Automatic Focus Sessions** - Detects 2h+ calendar blocks and proposes focus timers
- **Habit Streak System** - Gamified habit tracking with gentle reminders (no shame!)
- **Energy Pattern Learning** - Tracks energy levels over time to find optimal work windows
- **Transition Assistant** - Prompts for capture after meetings, links to PARA context
- **Capture Prediction** - Auto-organizes captures into PARA using learned patterns

The system is designed to be supportive, not punitive. It learns your patterns and provides gentle nudges at the right moment.

---

## Architecture

```
ef-coach-scale/
├── patterns.db              # SQLite database (created by init_db.py)
├── init_db.py              # Database initialization script
├── context-engine.py       # Predictive context cues
├── focus-session.py        # Focus session management
├── streak-tracker.py       # Habit streak system
├── transition-assistant.py # Meeting transitions
├── capture-predictor.py    # Auto-organization
├── config.json             # Configuration
└── SKILL.md               # This file
```

### Database Schema

**patterns.db** contains the following tables:

- `energy_log` - Energy levels tracked over time
- `habits` - Habit definitions with streak counts
- `habit_log` - Habit completion history
- `context_suggestions` - All suggestions with acceptance tracking
- `focus_sessions` - Focus session tracking with outcomes
- `capture_patterns` - Learnings from capture classification

---

## Installation & Setup

### 1. Initialize the Database

```bash
cd skills/ef-coach-scale
python3 init_db.py
```

This creates `patterns.db` with all required tables.

### 2. Verify Dependencies

The skill uses:
- Python 3.11+ (built-in)
- SQLite3 (built-in)
- `gog` CLI for Google Calendar integration

Ensure `gog` is configured for `clawdbot@puenteworks.com`.

### 3. Verify PARA Integration

The skill integrates with your existing PARA system at `~/clawd/para.sqlite`. Ensure this database exists and has the expected schema (projects, areas, tasks tables).

---

## Components

### 1. Context Engine (`context-engine.py`)

Analyzes calendar, time, and PARA tasks to suggest appropriate work contexts. Learns which suggestions are helpful.

#### Usage

```bash
# Generate a context suggestion
python3 context-engine.py suggest

# Record feedback on a suggestion
python3 context-engine.py feedback <id> <true|false> [reason]
```

#### Example Output

```
=== Context Suggestion ===
Type: deep_work
Confidence: 0.85

Large time gap (120 min). Good time for deep work on: Prepare Q1 review presentation

Context: 1 upcoming event, 3 active tasks
Energy level: 7.2/10 (morning)
```

#### API Usage

```python
from context_engine import ContextEngine

engine = ContextEngine()
result = engine.suggest_context()

print(result['suggestion'])
print(result['context_type'])
print(result['confidence'])

# Record feedback
engine.record_feedback(result['id'], accepted=True, reason="Very helpful!")
```

---

### 2. Focus Session (`focus-session.py`)

Detects large calendar blocks and manages focus sessions with tracking.

#### Usage

```bash
# Scan for focus opportunities
python3 focus-session.py scan

# Start a focus session
python3 focus-session.py start "Prepare Q1 presentation" 7

# Check active session
python3 focus-session.py active

# End a focus session
python3 focus-session.py end 1 completed 6 "Great session, felt productive"

# Get statistics
python3 focus-session.py stats 30
```

#### Example Output

```
=== Focus Opportunities ===

[1] 180 min available
    2026-01-27T14:00:00 to 2026-01-27T17:00:00
    Suggested: 120 min (deep work block)
    After: Team standup
    Before: Weekly sync
```

#### API Usage

```python
from focus_session import FocusSession

focus = FocusSession()

# Find opportunities
opportunities = focus.find_focus_opportunities(min_minutes=120)

# Start a session
proposal = focus.propose_focus_session(opportunities[0])
session_id = focus.start_focus_session(proposal, energy_before=7)

# End session
focus.end_focus_session(
    session_id,
    outcome="completed",
    energy_after=6,
    notes="Great session, made good progress"
)
```

---

### 3. Streak Tracker (`streak-tracker.py`)

Habit tracking with gamification and gentle, shame-free reminders.

#### Usage

```bash
# Add a habit
python3 streak-tracker.py add "Daily meditation" "daily" "10 minutes mindfulness"

# List habits
python3 streak-tracker.py list

# Complete a habit
python3 streak-tracker.py complete 1 "Focused well today"

# Get reminders
python3 streak-tracker.py reminders

# Check habit status
python3 streak-tracker.py status 1

# View history
python3 streak-tracker.py history 1 30

# Deactivate a habit
python3 streak-tracker.py deactivate 1
```

#### Example Output

```
=== Habits (3) ===
✓ [1] Daily meditation
      Streak: 12 • Last: 2026-01-26
      10 minutes mindfulness
✓ [2] Exercise
      Streak: 5 • Last: 2026-01-26
✓ [3] Read 30 min
      Streak: 21 • Last: 2026-01-26

=== Gentle Reminders (2) ===
  • 'Exercise' - keep that 5-day streak going! 🔥
  • 'Daily meditation' - no worries, just pick it back up when ready.
```

#### API Usage

```python
from streak_tracker import StreakTracker

tracker = StreakTracker()

# Add a habit
habit_id = tracker.add_habit(
    name="Daily meditation",
    description="10 minutes mindfulness",
    goal_frequency="daily"
)

# Complete a habit
tracker.complete_habit(habit_id, notes="Felt very focused")

# Get gentle reminders
reminders = tracker.get_habit_reminders()
for r in reminders:
    print(r['message'])
```

---

### 4. Transition Assistant (`transition-assistant.py`)

Detects meeting endings and prompts for capture/context linking.

#### Usage

```bash
# Check for recent transitions
python3 transition-assistant.py check

# Check for upcoming meeting ends
python3 transition-assistant.py upcoming

# Log transition outcome
python3 transition-assistant.py outcome 42 "Action items: follow up with team" "Q1 presentation prep" "true"
```

#### Example Output

```
=== Checking for Recent Transitions ===

--- Meeting: Weekly team sync (5 min ago) ---

📋 Meeting 'Weekly team sync' 5 min ago.

Anything to capture? (action items, decisions, insights, follow-ups)

📁 Related PARA context:
  • [project] Q1 Planning
  • [area] Team Management

Ready to resume previous work or pivot to something new?

[Transition ID: 123]
```

#### API Usage

```python
from transition_assistant import TransitionAssistant

assistant = TransitionAssistant()

# Check for transitions
transitions = assistant.check_transitions()

for t in transitions:
    print(t['prompt'])
    # Log outcome
    assistant.log_transition_outcome(
        t['id'],
        captured="Follow up with Sarah about timeline",
        pivoted_to="Q1 presentation prep",
        resumed=False
    )
```

---

### 5. Capture Predictor (`capture-predictor.py`)

Analyzes captured items and suggests PARA organization. Learns from feedback.

#### Usage

```bash
# Analyze a capture
python3 capture-predictor.py analyze "Check out this article about productivity systems"

# Record feedback
python3 capture-predictor.py feedback 42 true

# Find recurring themes
python3 capture-predictor.py themes

# Get system improvement suggestions
python3 capture-predictor.py suggestions

# View classification stats
python3 capture-predictor.py stats 30
```

#### Example Output

```
=== Capture Analysis ===
Text: Check out this article about productivity systems
Type: resource
Category: article
Confidence: 0.75
Analysis ID: 42

=== System Improvement Suggestions ===

• 'productivity' appears 12 times. Consider creating a dedicated project or task template.
• 'article' keeps getting saved. Consider a curated reading list or reference system.
```

#### API Usage

```python
from capture_predictor import CapturePredictor

predictor = CapturePredictor()

# Analyze a capture
capture = "Remember to call Sarah about the contract"
para_type, category, confidence = predictor.analyze_capture(capture)

print(f"Type: {para_type}, Category: {category}, Confidence: {confidence}")

# Log analysis
analysis_id = predictor.log_capture_analysis(capture, para_type, category, confidence)

# Record feedback
predictor.record_feedback(analysis_id, accepted=True)
```

---

## Integration with PARA

### Querying Active Tasks

The Context Engine automatically queries your PARA database for active tasks:

```python
tasks = engine.get_active_para_tasks(limit=5)

# Returns list of:
# {
#   "id": 1,
#   "title": "Prepare Q1 review",
#   "project_id": 3,
#   "status": "active",
#   "priority": 5
# }
```

### Linking to PARA Context

The Transition Assistant finds related PARA items when generating prompts:

```python
context = assistant.get_related_para_context(["planning", "quarterly"])

# Returns list of related projects/areas:
# {
#   "type": "project",
#   "id": 3,
#   "title": "Q1 Planning",
#   "description": "First quarter planning and review"
# }
```

---

## Integration with Calendar (gog)

All calendar operations use the `gog` CLI with the configured account:

```bash
gog calendar events primary --from today --to "+2d" --account clawdbot@puenteworks.com
```

### Finding Focus Opportunities

```python
events = focus.get_calendar_events(hours_ahead=8)
# Returns list of calendar events with start/end times

opportunities = focus.find_focus_opportunities(min_minutes=120)
# Finds gaps >= 2 hours between events
```

---

## Heartbeat Integration

### Context Cue Checks

Add to `HEARTBEAT.md`:

```markdown
- [ ] EF Coach: Run context suggestion check
  ```bash
  cd ~/clawd/skills/ef-coach-scale && python3 context-engine.py suggest
  ```
```

### Habit Reminders

Schedule habit reminder checks:

```markdown
- [ ] EF Coach: Check habit reminders
  ```bash
  cd ~/clawd/skills/ef-coach-scale && python3 streak-tracker.py reminders
  ```
```

### Transition Checks

Check for meeting transitions:

```markdown
- [ ] EF Coach: Check for meeting transitions
  ```bash
  cd ~/clawd/skills/ef-coach-scale && python3 transition-assistant.py check
  ```
```

---

## Configuration

Edit `config.json` to customize behavior:

```json
{
  "context_engine": {
    "min_confidence": 0.5,
    "lookahead_hours": 4,
    "transition_threshold_minutes": 15,
    "deep_work_min_gap_minutes": 120
  },
  "focus_session": {
    "min_duration_minutes": 120,
    "default_duration_minutes": 90
  },
  "streak_tracker": {
    "default_frequency": "daily",
    "reminder_hours": [9, 14, 19],
    "grace_period_days": 2
  }
}
```

---

## Examples

### Example 1: Morning Routine

```bash
# Start day with habit reminder
python3 streak-tracker.py reminders

# Output: "Daily meditation - keep that 12-day streak going! 🔥"

# Complete habit
python3 streak-tracker.py complete 1 "Feeling centered"

# Check focus opportunities
python3 focus-session.py scan

# Start a focus session
python3 focus-session.py start "Deep work on project X" 8
```

### Example 2: After Meeting

```bash
# Check for recent transitions
python3 transition-assistant.py check

# Output: "Meeting 'Team sync' 5 min ago. Anything to capture?"

# Log outcome
python3 transition-assistant.py outcome 123 "Action: Follow up with Sarah" "Project X" "true"
```

### Example 3: Capture Something

```bash
# Analyze a quick capture
python3 capture-predictor.py analyze "Remember to set up the dev environment for the new project"

# Output: Type: project, Category: action_item, Confidence: 0.80

# If correct, approve it
python3 capture-predictor.py feedback 45 true
```

### Example 4: Weekly Review

```bash
# Check habit stats
python3 streak-tracker.py list

# Check focus session stats
python3 focus-session.py stats 7

# Check capture patterns
python3 capture-predictor.py themes

# Get improvement suggestions
python3 capture-predictor.py suggestions
```

---

## Design Principles

### 1. No Shame
Habit reminders are gentle and encouraging, never guilt-inducing. Breaks are okay!

### 2. Context-Aware
Suggestions are based on actual context: calendar, time of day, energy patterns, and task priorities.

### 3. Learns Over Time
The system tracks which suggestions are helpful and adapts accordingly.

### 4. PARA-Native
Deep integration with PARA system for tasks, projects, and areas.

### 5. Privacy-First
All data stays local in your own databases.

---

## Troubleshooting

### Database Issues

```bash
# Reinitialize database
rm patterns.db
python3 init_db.py
```

### gog CLI Issues

```bash
# Verify gog is configured
gog auth list

# Test calendar access
gog calendar events primary --from today --to "+1d"
```

### PARA Integration Issues

Ensure `~/clawd/para.sqlite` exists and has the required schema:

```sql
SELECT name FROM sqlite_master WHERE type='table';
-- Should include: projects, areas, tasks
```

---

## API Reference

### ContextEngine

- `suggest_context()` → Dict with suggestion details
- `record_feedback(id, accepted, reason)` → Boolean
- `get_calendar_events(hours_ahead)` → List[Event]
- `get_active_para_tasks(limit)` → List[Task]

### FocusSession

- `scan_and_propose(min_minutes)` → List[Proposal]
- `start_focus_session(proposal, energy_before)` → session_id
- `end_focus_session(id, outcome, energy_after, notes)` → Boolean
- `get_active_session()` → Dict or None
- `get_session_stats(days_back)` → Dict

### StreakTracker

- `add_habit(name, description, frequency)` → habit_id
- `complete_habit(habit_id, notes)` → Boolean
- `get_habit_reminders()` → List[Reminder]
- `list_habits(include_inactive)` → List[Habit]
- `get_habit_status(habit_id)` → Dict or None

### TransitionAssistant

- `check_transitions(minutes_threshold)` → List[Transition]
- `log_transition_outcome(id, captured, pivoted_to, resumed)` → Boolean
- `get_upcoming_transitions(minutes_ahead)` → List[Meeting]

### CapturePredictor

- `analyze_capture(text)` → (para_type, category, confidence)
- `log_capture_analysis(text, type, category, confidence)` → analysis_id
- `record_feedback(analysis_id, accepted)` → Boolean
- `find_recurring_themes(min_occurrences)` → List[Theme]
- `suggest_system_improvements()` → List[Suggestion]

---

## Contributing

This skill is part of the Clawdbot ecosystem. To extend or modify:

1. Keep the no-shame principle - all messaging should be supportive
2. Maintain database backward compatibility
3. Update this SKILL.md with any new features
4. Test all components before committing changes

---

## License

Part of Clawdbot - Internal use only.

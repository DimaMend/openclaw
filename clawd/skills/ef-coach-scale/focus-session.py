#!/usr/bin/env python3
"""
Focus Session Manager - Detect 2h+ calendar blocks and propose focus timers.
Track focus sessions and outcomes for pattern learning.
"""

import sqlite3
import subprocess
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class FocusSession:
    """
    Manages focus sessions - detecting calendar opportunities,
    proposing timers, and tracking outcomes.
    """

    def __init__(self, db_path: str = None):
        """
        Initialize Focus Session manager.

        Args:
            db_path: Path to patterns.db. Defaults to skill directory.
        """
        if db_path is None:
            db_path = str(Path(__file__).parent / "patterns.db")
        self.db_path = db_path
        self.conn = None

    def connect(self) -> None:
        """Establish database connection."""
        self.conn = sqlite3.connect(self.db_path)

    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def get_calendar_events(self, hours_ahead: int = 8) -> List[Dict]:
        """
        Fetch calendar events using gog CLI.

        Args:
            hours_ahead: How many hours ahead to look.

        Returns:
            List of event dictionaries.
        """
        try:
            cmd = [
                "gog", "calendar", "events", "primary",
                "--from", "today",
                "--to", "+2d",
                "--account", "clawdbot@puenteworks.com"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode != 0:
                return []

            events = json.loads(result.stdout)
            now = datetime.now()
            future = now + timedelta(hours=hours_ahead)

            filtered_events = []
            for event in events.get("items", []):
                start_str = event.get("start", {}).get("dateTime", "")
                end_str = event.get("end", {}).get("dateTime", "")

                if not start_str:
                    continue

                try:
                    start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                    end = datetime.fromisoformat(end_str.replace("Z", "+00:00")) if end_str else start + timedelta(hours=1)

                    if start <= future and end > now:
                        filtered_events.append({
                            "start": start,
                            "end": end,
                            "summary": event.get("summary", "No title"),
                            "description": event.get("description", "")
                        })
                except (ValueError, TypeError):
                    continue

            return sorted(filtered_events, key=lambda x: x["start"])

        except Exception as e:
            print(f"Error fetching calendar: {e}")
            return []

    def find_focus_opportunities(self, min_minutes: int = 120) -> List[Dict]:
        """
        Find time gaps in calendar suitable for focus sessions.

        Args:
            min_minutes: Minimum gap size in minutes.

        Returns:
            List of opportunity dictionaries with start, end, duration.
        """
        events = self.get_calendar_events(hours_ahead=12)
        now = datetime.now()

        opportunities = []

        # Add opportunity from now to first event
        if events:
            first_gap_end = events[0]["start"]
            if first_gap_end > now:
                duration = (first_gap_end - now).total_seconds() / 60
                if duration >= min_minutes:
                    opportunities.append({
                        "start": now,
                        "end": first_gap_end,
                        "duration": duration,
                        "before_event": events[0]["summary"]
                    })

        # Add opportunities between events
        for i in range(len(events) - 1):
            gap_start = events[i]["end"]
            gap_end = events[i + 1]["start"]
            duration = (gap_end - gap_start).total_seconds() / 60

            if duration >= min_minutes:
                opportunities.append({
                    "start": gap_start,
                    "end": gap_end,
                    "duration": duration,
                    "after_event": events[i]["summary"],
                    "before_event": events[i + 1]["summary"]
                })

        return opportunities

    def propose_focus_session(self, opportunity: Dict, task_name: str = None, energy: int = None) -> Dict:
        """
        Propose a focus session for a time opportunity.

        Args:
            opportunity: Opportunity dictionary from find_focus_opportunities.
            task_name: Optional task name for the session.
            energy: Optional energy level (1-10).

        Returns:
            Session proposal dictionary.
        """
        duration_minutes = int(opportunity["duration"])
        duration_hours = duration_minutes / 60

        # Suggest focus timer based on duration
        if duration_minutes >= 240:
            suggested_timer = "120 min (deep work block)"
        elif duration_minutes >= 180:
            suggested_timer = "90 min (3 pomodoros + long break)"
        elif duration_minutes >= 120:
            suggested_timer = "90 min (focus block)"
        else:
            suggested_timer = f"{duration_minutes - 15} min (focus session)"

        proposal = {
            "start": opportunity["start"].isoformat(),
            "end": opportunity["end"].isoformat(),
            "duration_minutes": duration_minutes,
            "suggested_timer": suggested_timer,
            "task_name": task_name or "TBD",
            "energy": energy,
            "context": {
                "after": opportunity.get("after_event"),
                "before": opportunity.get("before_event")
            }
        }

        return proposal

    def start_focus_session(self, proposal: Dict, energy_before: int = None) -> int:
        """
        Start a focus session and log it to database.

        Args:
            proposal: Session proposal dictionary.
            energy_before: Energy level before starting (1-10).

        Returns:
            Session ID.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            cursor.execute("""
                INSERT INTO focus_sessions (
                    start_time, planned_duration, task_name, energy_before
                ) VALUES (?, ?, ?, ?)
            """, (
                proposal["start"],
                proposal["duration_minutes"],
                proposal["task_name"],
                energy_before
            ))

            self.conn.commit()
            session_id = cursor.lastrowid
            self.close()

            return session_id

        except sqlite3.Error as e:
            print(f"Error starting focus session: {e}")
            return 0

    def end_focus_session(self, session_id: int, outcome: str, energy_after: int = None, notes: str = "") -> bool:
        """
        End a focus session and record outcome.

        Args:
            session_id: ID of the session to end.
            outcome: 'completed', 'interrupted', 'extended', or 'abandoned'.
            energy_after: Energy level after session (1-10).
            notes: Optional notes about the session.

        Returns:
            True if successful, False otherwise.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            # Get start time to calculate actual duration
            cursor.execute("SELECT start_time FROM focus_sessions WHERE id = ?", (session_id,))
            result = cursor.fetchone()

            if not result:
                print(f"Session {session_id} not found")
                return False

            start_time = datetime.fromisoformat(result[0])
            end_time = datetime.now()
            actual_duration = int((end_time - start_time).total_seconds() / 60)

            cursor.execute("""
                UPDATE focus_sessions
                SET end_time = ?, actual_duration = ?, outcome = ?, energy_after = ?, notes = ?
                WHERE id = ?
            """, (end_time.isoformat(), actual_duration, outcome, energy_after, notes, session_id))

            self.conn.commit()
            self.close()
            return True

        except sqlite3.Error as e:
            print(f"Error ending focus session: {e}")
            return False

    def get_active_session(self) -> Optional[Dict]:
        """
        Get the currently active focus session.

        Returns:
            Session dictionary or None if no active session.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            cursor.execute("""
                SELECT id, start_time, planned_duration, task_name, energy_before
                FROM focus_sessions
                WHERE end_time IS NULL
                ORDER BY start_time DESC
                LIMIT 1
            """)

            result = cursor.fetchone()
            self.close()

            if result:
                start_time = datetime.fromisoformat(result[1])
                elapsed = (datetime.now() - start_time).total_seconds() / 60

                return {
                    "id": result[0],
                    "start_time": result[1],
                    "elapsed_minutes": int(elapsed),
                    "planned_duration": result[2],
                    "task_name": result[3],
                    "energy_before": result[4]
                }

            return None

        except sqlite3.Error as e:
            print(f"Error getting active session: {e}")
            return None

    def get_session_stats(self, days_back: int = 30) -> Dict:
        """
        Get statistics on focus sessions.

        Args:
            days_back: How many days to look back.

        Returns:
            Statistics dictionary.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            # Total sessions completed
            cursor.execute("""
                SELECT COUNT(*) FROM focus_sessions
                WHERE end_time IS NOT NULL
                AND start_time > datetime('now', '-{} days')
            """.format(days_back))
            total_sessions = cursor.fetchone()[0]

            # Average duration
            cursor.execute("""
                SELECT AVG(actual_duration) FROM focus_sessions
                WHERE end_time IS NOT NULL
                AND outcome IN ('completed', 'extended')
                AND start_time > datetime('now', '-{} days')
            """.format(days_back))
            avg_duration = cursor.fetchone()[0] or 0

            # Completion rate
            cursor.execute("""
                SELECT
                    COUNT(CASE WHEN outcome = 'completed' THEN 1 END) * 1.0 / COUNT(*)
                FROM focus_sessions
                WHERE end_time IS NOT NULL
                AND start_time > datetime('now', '-{} days')
            """.format(days_back))
            completion_rate = cursor.fetchone()[0] or 0

            # Average energy change
            cursor.execute("""
                SELECT AVG(energy_after - energy_before) FROM focus_sessions
                WHERE end_time IS NOT NULL
                AND energy_before IS NOT NULL AND energy_after IS NOT NULL
                AND start_time > datetime('now', '-{} days')
            """.format(days_back))
            avg_energy_change = cursor.fetchone()[0] or 0

            self.close()

            return {
                "total_sessions": total_sessions,
                "avg_duration_minutes": round(avg_duration, 1),
                "completion_rate": round(completion_rate * 100, 1),
                "avg_energy_change": round(avg_energy_change, 2),
                "days_analyzed": days_back
            }

        except sqlite3.Error as e:
            print(f"Error getting session stats: {e}")
            return {}

    def scan_and_propose(self, min_minutes: int = 120) -> List[Dict]:
        """
        Scan calendar and propose focus sessions for opportunities.

        Args:
            min_minutes: Minimum gap size for focus session.

        Returns:
            List of proposal dictionaries.
        """
        opportunities = self.find_focus_opportunities(min_minutes)
        proposals = []

        for opp in opportunities:
            proposal = self.propose_focus_session(opp)
            proposals.append(proposal)

        return proposals


if __name__ == "__main__":
    import sys

    focus = FocusSession()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "scan":
            print("\n=== Focus Opportunities ===")
            proposals = focus.scan_and_propose(min_minutes=120)

            if proposals:
                for i, prop in enumerate(proposals, 1):
                    print(f"\n[{i}] {prop['duration_minutes']} min available")
                    print(f"    {prop['start']} to {prop['end']}")
                    print(f"    Suggested: {prop['suggested_timer']}")
                    if prop["context"]["after"]:
                        print(f"    After: {prop['context']['after']}")
                    if prop["context"]["before"]:
                        print(f"    Before: {prop['context']['before']}")
            else:
                print("No focus opportunities found (need 2+ hour gaps)")

        elif command == "active":
            session = focus.get_active_session()
            if session:
                print(f"\n=== Active Focus Session ===")
                print(f"ID: {session['id']}")
                print(f"Task: {session['task_name']}")
                print(f"Started: {session['start_time']}")
                print(f"Elapsed: {session['elapsed_minutes']} min / {session['planned_duration']} min planned")
            else:
                print("\nNo active focus session")

        elif command == "start":
            task_name = sys.argv[2] if len(sys.argv) > 2 else "Focus session"
            energy = int(sys.argv[3]) if len(sys.argv) > 3 else None

            proposal = {
                "start": datetime.now().isoformat(),
                "end": (datetime.now() + timedelta(minutes=90)).isoformat(),
                "duration_minutes": 90,
                "suggested_timer": "90 min (focus block)",
                "task_name": task_name
            }

            session_id = focus.start_focus_session(proposal, energy)
            print(f"\nFocus session started (ID: {session_id})")

        elif command == "end":
            session_id = int(sys.argv[2])
            outcome = sys.argv[3]
            energy_after = int(sys.argv[4]) if len(sys.argv) > 4 else None
            notes = " ".join(sys.argv[5:]) if len(sys.argv) > 5 else ""

            success = focus.end_focus_session(session_id, outcome, energy_after, notes)
            print(f"\nSession {'ended' if success else 'failed to end'}")

        elif command == "stats":
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
            stats = focus.get_session_stats(days_back=days)

            print(f"\n=== Focus Session Stats ({days} days) ===")
            print(f"Total sessions: {stats.get('total_sessions', 0)}")
            print(f"Avg duration: {stats.get('avg_duration_minutes', 0)} min")
            print(f"Completion rate: {stats.get('completion_rate', 0)}%")
            print(f"Avg energy change: {stats.get('avg_energy_change', 0):+.2f}")

        else:
            print("Unknown command")
    else:
        print("Usage: python focus-session.py scan")
        print("       python focus-session.py active")
        print("       python focus-session.py start <task> [energy]")
        print("       python focus-session.py end <id> <outcome> [energy] [notes]")
        print("       python focus-session.py stats [days]")
        print("\nOutcomes: completed, interrupted, extended, abandoned")

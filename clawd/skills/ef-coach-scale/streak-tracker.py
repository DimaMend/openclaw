#!/usr/bin/env python3
"""
Streak Tracker - Habit system with gamification and gentle reminders.
Track daily/weekly habits, streak counts, and break notifications (no shame).
"""

import sqlite3
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class StreakTracker:
    """
    Habit streak tracking system with gamification and gentle reminders.
    Focuses on positive reinforcement, not shaming.
    """

    def __init__(self, db_path: str = None):
        """
        Initialize Streak Tracker.

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

    def add_habit(self, name: str, description: str = "", goal_frequency: str = "daily") -> int:
        """
        Add a new habit to track.

        Args:
            name: Habit name (must be unique).
            description: Optional description.
            goal_frequency: 'daily', 'weekly', or 'monthly'.

        Returns:
            Habit ID, or 0 if failed.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            cursor.execute("""
                INSERT INTO habits (name, description, goal_frequency)
                VALUES (?, ?, ?)
            """, (name, description, goal_frequency))

            self.conn.commit()
            habit_id = cursor.lastrowid
            self.close()

            return habit_id

        except sqlite3.IntegrityError:
            print(f"Habit '{name}' already exists")
            return 0
        except sqlite3.Error as e:
            print(f"Error adding habit: {e}")
            return 0

    def list_habits(self, include_inactive: bool = False) -> List[Dict]:
        """
        List all habits.

        Args:
            include_inactive: Whether to include inactive habits.

        Returns:
            List of habit dictionaries.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            if include_inactive:
                cursor.execute("""
                    SELECT id, name, description, streak_count, last_completed, goal_frequency, active
                    FROM habits
                    ORDER BY active DESC, name
                """)
            else:
                cursor.execute("""
                    SELECT id, name, description, streak_count, last_completed, goal_frequency, active
                    FROM habits
                    WHERE active = 1
                    ORDER BY name
                """)

            habits = []
            for row in cursor.fetchall():
                habits.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "streak_count": row[3],
                    "last_completed": row[4],
                    "goal_frequency": row[5],
                    "active": row[6]
                })

            self.close()
            return habits

        except sqlite3.Error as e:
            print(f"Error listing habits: {e}")
            return []

    def complete_habit(self, habit_id: int, notes: str = "") -> bool:
        """
        Log a habit completion and update streak.

        Args:
            habit_id: ID of the habit.
            notes: Optional notes about the completion.

        Returns:
            True if successful, False otherwise.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            # Check habit exists and is active
            cursor.execute("SELECT goal_frequency, last_completed FROM habits WHERE id = ?", (habit_id,))
            result = cursor.fetchone()

            if not result:
                print(f"Habit {habit_id} not found")
                return False

            goal_frequency, last_completed = result
            today = date.today()

            # Check if already completed today (for daily habits)
            if goal_frequency == "daily" and last_completed == today.isoformat():
                print(f"Habit already completed today")
                return False

            # Log the completion
            cursor.execute("""
                INSERT INTO habit_log (habit_id, notes)
                VALUES (?, ?)
            """, (habit_id, notes))

            # Update streak count and last_completed
            if goal_frequency == "daily":
                # Check if streak should continue or reset
                if last_completed:
                    last_date = date.fromisoformat(last_completed)
                    if last_date == today - timedelta(days=1):
                        # Streak continues
                        cursor.execute("""
                            UPDATE habits
                            SET streak_count = streak_count + 1, last_completed = ?
                            WHERE id = ?
                        """, (today.isoformat(), habit_id))
                    elif last_date < today - timedelta(days=1):
                        # Streak reset
                        cursor.execute("""
                            UPDATE habits
                            SET streak_count = 1, last_completed = ?
                            WHERE id = ?
                        """, (today.isoformat(), habit_id))
                else:
                    # First completion
                    cursor.execute("""
                        UPDATE habits
                        SET streak_count = 1, last_completed = ?
                        WHERE id = ?
                    """, (today.isoformat(), habit_id))

            elif goal_frequency == "weekly":
                # For weekly, just update last_completed without resetting streak
                # (weekly streaks are more complex, simplified here)
                cursor.execute("""
                    UPDATE habits
                    SET last_completed = ?
                    WHERE id = ?
                """, (today.isoformat(), habit_id))

            elif goal_frequency == "monthly":
                cursor.execute("""
                    UPDATE habits
                    SET last_completed = ?
                    WHERE id = ?
                """, (today.isoformat(), habit_id))

            self.conn.commit()
            self.close()
            return True

        except sqlite3.Error as e:
            print(f"Error completing habit: {e}")
            return False

    def get_habit_status(self, habit_id: int) -> Optional[Dict]:
        """
        Get detailed status of a habit.

        Args:
            habit_id: ID of the habit.

        Returns:
            Habit status dictionary or None if not found.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            cursor.execute("""
                SELECT id, name, description, streak_count, last_completed, goal_frequency, active
                FROM habits
                WHERE id = ?
            """, (habit_id,))

            result = cursor.fetchone()
            self.close()

            if not result:
                return None

            # Calculate additional info
            today = date.today()
            last_completed = result[4]
            days_since = None

            if last_completed:
                last_date = date.fromisoformat(last_completed)
                days_since = (today - last_date).days

            return {
                "id": result[0],
                "name": result[1],
                "description": result[2],
                "streak_count": result[3],
                "last_completed": last_completed,
                "goal_frequency": result[5],
                "active": result[6],
                "days_since_completion": days_since
            }

        except sqlite3.Error as e:
            print(f"Error getting habit status: {e}")
            return None

    def get_habit_reminders(self) -> List[Dict]:
        """
        Get gentle reminders for habits that need attention.
        No shaming - just friendly nudges.

        Returns:
            List of reminder dictionaries.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            today = date.today()

            # Get active daily habits
            cursor.execute("""
                SELECT id, name, streak_count, last_completed
                FROM habits
                WHERE active = 1 AND goal_frequency = 'daily'
            """)

            reminders = []

            for row in cursor.fetchall():
                habit_id, name, streak, last_completed = row

                # Check if completed today
                if last_completed == today.isoformat():
                    continue

                days_since = None
                if last_completed:
                    days_since = (today - date.fromisoformat(last_completed)).days

                # Generate appropriate message
                if days_since is None:
                    # First time - encouraging
                    message = f"Ready to start '{name}'? First step is the hardest!"
                elif days_since == 1:
                    if streak > 1:
                        message = f"'{name}' - keep that {streak}-day streak going! 🔥"
                    else:
                        message = f"Time for '{name}' - you've got this!"
                elif days_since == 2:
                    # Missed one day - gentle, no shame
                    message = f"'{name}' - no worries, just pick it back up when ready."
                elif days_since <= 7:
                    # Missed a few days - still gentle
                    message = f"'{name}' - when you're ready to jump back in."
                else:
                    # Longer break - very gentle
                    message = f"'{name}' - waiting for you when inspiration strikes."

                reminders.append({
                    "habit_id": habit_id,
                    "name": name,
                    "streak_count": streak,
                    "days_since": days_since,
                    "message": message
                })

            self.close()
            return reminders

        except sqlite3.Error as e:
            print(f"Error getting reminders: {e}")
            return []

    def get_habit_history(self, habit_id: int, days: int = 30) -> List[Dict]:
        """
        Get completion history for a habit.

        Args:
            habit_id: ID of the habit.
            days: How many days to look back.

        Returns:
            List of completion records.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            cursor.execute("""
                SELECT timestamp, notes
                FROM habit_log
                WHERE habit_id = ?
                AND timestamp > datetime('now', '-{} days')
                ORDER BY timestamp DESC
            """.format(days), (habit_id,))

            history = []
            for row in cursor.fetchall():
                history.append({
                    "timestamp": row[0],
                    "notes": row[1]
                })

            self.close()
            return history

        except sqlite3.Error as e:
            print(f"Error getting history: {e}")
            return []

    def update_habit(self, habit_id: int, name: str = None, description: str = None,
                    active: bool = None, goal_frequency: str = None) -> bool:
        """
        Update habit properties.

        Args:
            habit_id: ID of the habit.
            name: New name (optional).
            description: New description (optional).
            active: New active status (optional).
            goal_frequency: New goal frequency (optional).

        Returns:
            True if successful, False otherwise.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            updates = []
            params = []

            if name is not None:
                updates.append("name = ?")
                params.append(name)
            if description is not None:
                updates.append("description = ?")
                params.append(description)
            if active is not None:
                updates.append("active = ?")
                params.append(1 if active else 0)
            if goal_frequency is not None:
                updates.append("goal_frequency = ?")
                params.append(goal_frequency)

            if not updates:
                print("No updates specified")
                return False

            params.append(habit_id)

            cursor.execute(f"""
                UPDATE habits
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)

            self.conn.commit()
            self.close()
            return True

        except sqlite3.Error as e:
            print(f"Error updating habit: {e}")
            return False

    def delete_habit(self, habit_id: int) -> bool:
        """
        Delete a habit (cascades to habit_log).

        Args:
            habit_id: ID of the habit to delete.

        Returns:
            True if successful, False otherwise.
        """
        try:
            self.connect()
            cursor = self.conn.cursor()

            cursor.execute("DELETE FROM habits WHERE id = ?", (habit_id,))

            self.conn.commit()
            self.close()
            return True

        except sqlite3.Error as e:
            print(f"Error deleting habit: {e}")
            return False


if __name__ == "__main__":
    import sys

    tracker = StreakTracker()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "add":
            if len(sys.argv) > 2:
                name = sys.argv[2]
                freq = sys.argv[3] if len(sys.argv) > 3 else "daily"
                desc = " ".join(sys.argv[4:]) if len(sys.argv) > 4 else ""

                habit_id = tracker.add_habit(name, desc, freq)
                if habit_id:
                    print(f"✓ Habit '{name}' added (ID: {habit_id})")

        elif command == "list":
            habits = tracker.list_habits(include_inactive=(len(sys.argv) > 2 and sys.argv[2] == "all"))

            print(f"\n=== Habits ({len(habits)}) ===")
            for habit in habits:
                status_icon = "✓" if habit["active"] else "○"
                last = habit["last_completed"] or "Never"
                print(f"{status_icon} [{habit['id']}] {habit['name']}")
                print(f"      Streak: {habit['streak_count']} • Last: {last}")
                if habit["description"]:
                    print(f"      {habit['description']}")

        elif command == "complete":
            if len(sys.argv) > 2:
                habit_id = int(sys.argv[2])
                notes = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""

                if tracker.complete_habit(habit_id, notes):
                    habit = tracker.get_habit_status(habit_id)
                    print(f"✓ '{habit['name']}' completed! Streak: {habit['streak_count']} 🔥")

        elif command == "reminders":
            reminders = tracker.get_habit_reminders()

            print(f"\n=== Gentle Reminders ({len(reminders)}) ===")
            for r in reminders:
                print(f"  • {r['message']}")

        elif command == "status":
            if len(sys.argv) > 2:
                habit_id = int(sys.argv[2])
                status = tracker.get_habit_status(habit_id)

                if status:
                    print(f"\n=== {status['name']} ===")
                    print(f"Description: {status['description'] or 'None'}")
                    print(f"Streak: {status['streak_count']} days")
                    print(f"Frequency: {status['goal_frequency']}")
                    print(f"Last completed: {status['last_completed'] or 'Never'}")
                    print(f"Days since: {status['days_since_completion'] or 'Never'}")
                    print(f"Active: {status['active']}")

        elif command == "history":
            if len(sys.argv) > 2:
                habit_id = int(sys.argv[2])
                days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
                history = tracker.get_habit_history(habit_id, days)

                print(f"\n=== History ({days} days) ===")
                for h in history:
                    print(f"  {h['timestamp']}: {h['notes'] or 'No notes'}")

        elif command == "deactivate" or command == "activate":
            if len(sys.argv) > 2:
                habit_id = int(sys.argv[2])
                active = command == "activate"
                if tracker.update_habit(habit_id, active=active):
                    print(f"✓ Habit {command}d")

        elif command == "delete":
            if len(sys.argv) > 2:
                habit_id = int(sys.argv[2])
                if tracker.delete_habit(habit_id):
                    print(f"✓ Habit deleted")

        else:
            print("Unknown command")
    else:
        print("Usage: python streak-tracker.py add <name> [daily|weekly|monthly] [description]")
        print("       python streak-tracker.py list [all]")
        print("       python streak-tracker.py complete <id> [notes]")
        print("       python streak-tracker.py reminders")
        print("       python streak-tracker.py status <id>")
        print("       python streak-tracker.py history <id> [days]")
        print("       python streak-tracker.py activate|deactivate <id>")
        print("       python streak-tracker.py delete <id>")

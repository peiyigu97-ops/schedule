"""
Flask schedule server
  GET /              → index.html
  GET /api/current   → { week, date, courses }
  GET /api/week/<n>  → { week, courses }
"""

from flask import Flask, jsonify, send_from_directory, abort
from datetime import date, timedelta
import json, os, re

# ── config ────────────────────────────────────────────────────────────────────

# First Monday of the semester (week 1 starts here)
SEMESTER_START = date(2026, 3, 2)
TOTAL_WEEKS    = 16

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
COURSES_FILE = os.path.join(BASE_DIR, "courses.json")

# ── period time table ─────────────────────────────────────────────────────────

PERIOD_TIME = {
    "01": "08:00", "02": "08:55",
    "03": "10:00", "04": "10:55",
    "05": "14:00", "06": "14:55",
    "07": "16:00", "08": "16:55",
    "09": "19:00", "10": "19:55",
}

# ── helpers ───────────────────────────────────────────────────────────────────

def current_week() -> int:
    today = date.today()
    if today < SEMESTER_START:
        return 1
    delta = (today - SEMESTER_START).days
    week = delta // 7 + 1
    return min(week, TOTAL_WEEKS)

def load_courses():
    with open(COURSES_FILE, encoding="utf-8") as f:
        return json.load(f)["courses"]

def period_to_time(periods: list[str]) -> str:
    """Return 'HH:MM – HH:MM' string for a period list."""
    if not periods:
        return ""
    start = PERIOD_TIME.get(periods[0], "")
    # end time = start of last period + 45 min
    last_start = PERIOD_TIME.get(periods[-1], "")
    if last_start:
        h, m = map(int, last_start.split(":"))
        total = h * 60 + m + 45
        end = f"{total // 60:02d}:{total % 60:02d}"
    else:
        end = ""
    return f"{start} – {end}" if start else ""

def course_matches_week(course: dict, week: int) -> bool:
    """True if this course runs in the given week (handles parity)."""
    weeks = course.get("weeks", [])
    if not weeks:
        # 全周实践课 — show every week it was mentioned
        return True
    if week not in weeks:
        return False
    parity = course.get("parity")
    if parity == "odd"  and week % 2 == 0: return False
    if parity == "even" and week % 2 == 1: return False
    return True

DAY_ORDER = {"周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 7, "全周": 0}

def courses_for_week(week: int) -> list[dict]:
    all_courses = load_courses()
    result = []
    for c in all_courses:
        if not course_matches_week(c, week):
            continue
        periods = c.get("periods", [])
        result.append({
            "name":      c["name"],
            "day":       c["day"],
            "day_num":   c["day_num"],
            "periods":   periods,
            "time":      period_to_time(periods),
            "weeks_raw": c["weeks_raw"],
            "classroom": c["classroom"],
            "teacher":   c["teacher"],
            "parity":    c["parity"],
        })
    result.sort(key=lambda x: (DAY_ORDER.get(x["day"], 8), x["periods"]))
    return result

# ── Flask app ─────────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/api/current")
def api_current():
    week = current_week()
    today = date.today()
    week_monday = SEMESTER_START + timedelta(weeks=week - 1)
    return jsonify({
        "week":        week,
        "total_weeks": TOTAL_WEEKS,
        "date":        today.isoformat(),
        "week_start":  week_monday.isoformat(),
        "courses":     courses_for_week(week),
    })

@app.route("/api/week/<int:week>")
def api_week(week: int):
    if week < 1 or week > TOTAL_WEEKS:
        abort(400, description=f"Week must be 1–{TOTAL_WEEKS}")
    week_monday = SEMESTER_START + timedelta(weeks=week - 1)
    return jsonify({
        "week":        week,
        "total_weeks": TOTAL_WEEKS,
        "week_start":  week_monday.isoformat(),
        "courses":     courses_for_week(week),
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)

---
name: Streak computation fix
description: Start streak from today OR yesterday to avoid breaking streaks mid-day.
---

**Rule:** `compute_streak()` should anchor at `today` if any activity exists today, else at `yesterday` if yesterday had activity, else return 0.

**Why:** Original code only anchored at today, so a student who studied yesterday (but not yet today) would see streak=0 all day — demoralising and incorrect.

**How to apply:** See `compute_streak()` in `api.py`. Uses `date.today()` and `date.today() - timedelta(days=1)` as candidate anchors.

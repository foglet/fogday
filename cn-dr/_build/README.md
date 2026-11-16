# cn-dr build

Source for fogday.com/cn-dr, a mobile lesson library of Dr. Jia's Mandarin Insights videos.
Jekyll skips this `_build` folder, so none of it is published.

- `data/shorts.txt`: Shorts from youtube.com/@Mandarin-Insights/shorts (index|id|views|title); 406 from the first crawl, newer ones appended.
- `data/long.txt`: full-length videos (id|duration|views|title), in the order added.
- `fetch_new.py`: adds new uploads from the channel's RSS feeds, then reruns `classify.py` and `build.py`.
- `classify.py`: assigns level, section, topic and series by keyword rules.
- `data/overrides.txt`: hand corrections (index|level|section|topic).
- `template.html`: the app. Design follows the UX/UI Agent Skills kit (Warm Soft-SaaS archetype, `lingo` anchor).
- `build.py`: inlines the data and writes `../index.html`.

New videos are added automatically: `.github/workflows/cn-dr-new-videos.yml` runs `fetch_new.py` daily and opens a PR
(branch `cn-dr/new-videos`) listing each new video and how it was classified. Fix any misfiled ones in
`data/overrides.txt` on that branch, rebuild, then merge. To run it locally: `python3 fetch_new.py /tmp/summary.md`.

To add videos by hand: append rows to `shorts.txt` with the next index, then

    python3 classify.py data/shorts.txt data/overrides.txt data/content.json
    python3 build.py

30-Day Survival Chinese: 21 days come from "Day N" in the title; the other 9 (Days 8, 10, 11, 12, 14, 16, 26, 27, 29) are set in `classify.py` `DAY_INFERRED`. The inferred order was accepted on 2026-11-14 without confirmation from Dr. Jia.

Lesson numbers: every Short has a stable number, oldest first (No. 1 is her first Short). They are frozen in `data/numbers.txt`; `build.py` gives new Shorts the next number and never renumbers. Full-length lessons have no number. Search accepts "42", "#42" or "No. 42".

Sync across devices (About page, bottom): paste a GitHub token with only the `gist` scope on each device. The app keeps
everything in one private Gist named `cn-dr-sync.json` (created on first connect, found again by file name on other
devices). Each sync reads the Gist, merges, and writes back: saved/done/seen/full lessons merge by id with the newest
time winning (removals leave a tombstone so they sync too); search history, level and progress take the most recently
changed device. The token stays in that device's localStorage and is never in the page source.

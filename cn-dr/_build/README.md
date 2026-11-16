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

Language (footer, far left): one toggle, EN by default; tap for ZH and 简 | 繁 appear beside it; picking one hides them, and the next tap goes back to EN;
ZH returns to the last script used. Kept per device.
In Chinese, interface text comes from `data/ui_zh.tsv` (English, simplified, traditional; `re:` lines are patterns) and
lesson titles from `data/titles_zh.tsv` (id, simplified, traditional). Write the simplified column, then run
`python3 zh_trad.py` (needs `pip install opencc-python-reimplemented`) to fill the traditional column (OpenCC s2twp
plus a few fixups in the script), then `python3 build.py`. New videos without a row show their English title until
one is added. Search matches English and both Chinese scripts. `build.py` also capitalizes Mandarin and Chinese in titles.

Sync across devices (About page, bottom): paste a GitHub token with only the `gist` scope on each device, then tap the waveform. The app keeps
everything in one private Gist named `cn-dr-sync.json` (created on first connect, found again by file name on other
devices). Saving or completing a lesson syncs a few seconds later; otherwise it syncs at midnight Pacific or on a tap. Each sync reads the Gist, merges, and writes back: saved/done/seen/full lessons merge by id with the newest
time winning (removals leave a tombstone so they sync too); search history, level and progress take the most recently
changed device. The token stays in that device's localStorage and is never in the page source.

Dragons (home, under the intro): `DRAG` in `template.html` draws three original pixel dragons on a canvas: they walk, jump
alone or together, sometimes march in step, bump (random direction and colour outcomes) or fly over each other, and the
third walks down from the distance to cross the others' paths, then back. The 8 sprite frames are inlined as 30x26
palette-index strings, exported from the `pixel-dragons-multi` skill's sprite. The canvas is decorative (`aria-hidden`),
pauses when off screen or the tab is hidden, and shows a still frame with reduced motion.

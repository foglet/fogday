# cn-dr build

Source for fogday.com/cn-dr, a mobile lesson library of Dr. Jia's Mandarin Insights videos.
Jekyll skips this `_build` folder, so none of it is published.

- `data/shorts.txt`: the 406 Shorts crawled from youtube.com/@Mandarin-Insights/shorts (index|id|views|title). The 11 long videos are listed in `classify.py`.
- `classify.py`: assigns level, section, topic and series by keyword rules.
- `data/overrides.txt`: hand corrections (index|level|section|topic).
- `template.html`: the app. Design follows the UX/UI Agent Skills kit (Warm Soft-SaaS archetype, `lingo` anchor).
- `build.py`: inlines the data and writes `../index.html`.

To add new videos: append rows to `shorts.txt` with the next index, then

    python3 classify.py data/shorts.txt data/overrides.txt data/content.json
    python3 build.py

30-Day Survival Chinese: 21 days come from "Day N" in the title; the other 9 (Days 8, 10, 11, 12, 14, 16, 26, 27, 29) are set in `classify.py` `DAY_INFERRED`. The inferred order was accepted on 2026-11-14 without confirmation from Dr. Jia.

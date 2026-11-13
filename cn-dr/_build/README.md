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

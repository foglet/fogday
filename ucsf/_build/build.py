"""Build ../index.html from template.html + data/gtfs-compact.json.

The data file is a compact form of the UCSF GTFS feed (https://ucsf.tripshot.com/v1/gtfs.zip,
Transitland f-ucsf~shuttle~ca~us). See README.md for how to refresh it.
"""
import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root / "data/gtfs-compact.json").read_text(encoding="utf-8"))
config = {
    # public Mapbox token already used on fogday.com/transit
    "token": "pk.eyJ1IjoiZm9nZmlzaCIsImEiOiJjaWw2ZHJlcngwMmFhdGxsemZvajd0OHNoIn0.cZDgXl4g7YZhwNF0ITahmw",
    # base URL of the CORS proxy in worker.js (no trailing slash). Empty = schedule estimates only.
    "live": "",
}
def js(o): return json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
html = (root / "template.html").read_text(encoding="utf-8")
html = html.replace("/*DATA*/", js(data)).replace("/*CONFIG*/", js(config))
out = root.parent / "index.html"
out.write_text(html, encoding="utf-8")
print(out, len(html.encode()))

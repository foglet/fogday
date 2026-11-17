"""Build ../index.html: shell.html (page, styles, Jekyll front matter for the maps menu) + app JS + data.

The data file is a compact form of the UCSF GTFS feed (https://ucsf.tripshot.com/v1/gtfs.zip,
Transitland f-ucsf~shuttle~ca~us). See README.md for how to refresh it.
"""
import json, pathlib, re
root = pathlib.Path(__file__).parent
data = json.loads((root / "data/gtfs-compact.json").read_text(encoding="utf-8"))
for r in data["routes"]: r.setdefault("ag", "ucsf")

def merge(base, add):
    """Append another agency's compact feed: every index in it moves past what is already there."""
    R, S, V, H, P = (len(base[k]) for k in ("routes", "stops", "services", "shapes", "patterns"))
    base["routes"] += add["routes"]; base["stops"] += add["stops"]; base["services"] += add["services"]
    base["shapes"] += add["shapes"]; base["shapeLen"] += add["shapeLen"]
    base["patterns"] += [[[s + S, t, d] for s, t, d in p] for p in add["patterns"]]
    base["trips"] += [[r + R, v + V, h + H if h >= 0 else -1, p + P, t0] for r, v, h, p, t0 in add["trips"]]

# Other operators, in switch order after UCSF; see README.md for each source
for f in ("mbtma-compact.json",       # Mission Bay TMA (Trillium GTFS, Transitland f-9q8yy-missionbaytma~ca~us)
          "presidigo-compact.json",   # PresidiGo (presidiobus.com/gtfs, Transitland f-presidigo~ca~us)
          "ggp-compact.json"):        # Golden Gate Park Shuttle (sfrecpark.org GTFS; calendar end extended, see README)
    merge(data, json.loads((root / "data" / f).read_text(encoding="utf-8")))
# tidy stop names: stray ids ("31796-Caulfield Cut") and spaces
for s in data["stops"]: s[0] = re.sub(r"^\d+-", "", s[0].strip())
config = {
    # public Mapbox token already used on fogday.com/transit and /treesf
    "token": "pk.eyJ1IjoiZm9nZmlzaCIsImEiOiJjaWw2ZHJlcngwMmFhdGxsemZvajd0OHNoIn0.cZDgXl4g7YZhwNF0ITahmw",
    # base URL of the CORS proxy in worker.js (no trailing slash). Empty = schedule estimates only.
    "live": "",
}
def js(o): return json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
app = "\n".join((root / f).read_text(encoding="utf-8") for f in ("app_head.js", "engine.js", "app_tail.js"))
html = (root / "shell.html").read_text(encoding="utf-8")
html = html.replace("/*APP*/", app).replace("/*DATA*/", js(data)).replace("/*CONFIG*/", js(config))
# the page goes through Jekyll (front matter, for the maps menu): the script must hold no Liquid
for chunk in (app, js(data)): assert "{{" not in chunk and "{%" not in chunk
out = root.parent / "index.html"
out.write_text(html, encoding="utf-8")
print(out, len(html.encode()))

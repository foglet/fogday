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
          "ggp-compact.json",         # Golden Gate Park Shuttle (sfrecpark.org GTFS; calendar end extended, see README)
          "opb-compact.json",         # Oyster Point BART (Commute.org, Trillium GTFS commute-ca-us, route 76230)
          "ssf-compact.json",         # Free South City Shuttle (built by data/ssf_build.py from the city's PDF and tracker)
          "dcb-compact.json",         # Daly City Bayshore (Commute.org, same Trillium GTFS, route 76287)
          "bcp-compact.json"):        # Brisbane-Crocker Park (Commute.org, same Trillium GTFS, route 76243)
    merge(data, json.loads((root / "data" / f).read_text(encoding="utf-8")))
# the feed's Daly City Bayshore green (#00fd9a) vanishes on the light map: a deeper green by day (night keeps a bright one)
for r in data["routes"]:
    if r["id"] == "commute:76287": r["c"], r["tc"] = "#12a874", "#ffffff"
# tidy stop names: stray ids ("31796-Caulfield Cut") and spaces
for s in data["stops"]: s[0] = re.sub(r"^\d+-", "", s[0].strip())
# San Francisco Public Library: Main and the 27 branches (DataSF fhhu-wqa7), drawn on every view
data["libs"] = json.loads((root / "data" / "sfpl-libraries.json").read_text(encoding="utf-8"))["libs"]
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
# Jekyll silently drops bad front matter (the page then ships raw), so parse it here
import yaml; fm = yaml.safe_load(html.split("---")[1]); assert fm["title"] and fm["description"]
out = root.parent / "index.html"
out.write_text(html, encoding="utf-8")
print(out, len(html.encode()))

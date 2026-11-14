"""Build ../index.html: shell.html (page, styles, Jekyll front matter for the maps menu) + app JS + data.

The data file is a compact form of the UCSF GTFS feed (https://ucsf.tripshot.com/v1/gtfs.zip,
Transitland f-ucsf~shuttle~ca~us). See README.md for how to refresh it.
"""
import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root / "data/gtfs-compact.json").read_text(encoding="utf-8"))
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

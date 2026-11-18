"""Build px/index.html from template.html + sprites.json (the 9 dragon sprite sets from cn-dr).
Edit template.html, never ../index.html, then run: python3 build.py"""
import json, pathlib
root = pathlib.Path(__file__).parent
spr = json.loads((root / "sprites.json").read_text())
assert set(spr) == {a + b for a in "nps" for b in "nls"}, "need all 9 body x tail sets"
assert all(len(v) == 10 and all(len(s) == 780 for s in v) for v in spr.values()), "10 frames of 30x26 each"
html = (root / "template.html").read_text(encoding="utf-8")
assert "/*SPRITES*/" in html
html = html.replace("/*SPRITES*/", json.dumps(spr, separators=(",", ":")))
(root.parent / "index.html").write_text(html, encoding="utf-8")
print("wrote", root.parent / "index.html", len(html), "bytes")

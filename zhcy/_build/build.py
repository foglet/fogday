import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root / "data/chengyu.json").read_text(encoding="utf-8"))
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("\u2014", "\\u2014").replace("\u2013", "\\u2013")
html = (root / "template.html").read_text(encoding="utf-8").replace("/*DATA*/[]", blob)
(root.parent / "index.html").write_text(html, encoding="utf-8")
print("wrote", root.parent / "index.html", len(html.encode()), "bytes,", len(data), "chengyu")

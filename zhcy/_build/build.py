"""Inline the data into template.html and write ../index.html.

Traditional Chinese is generated here with OpenCC (s2tw: Taiwan standard characters, no vocabulary swaps):
  pip install opencc
Each record gets a "t" object holding only the fields whose traditional form differs.
The template's Simplified UI strings (between /*ZH*/ and /*ZHEND*/) are converted into the zht block.
"""
import json, pathlib, re
import opencc

cc = opencc.OpenCC("s2tw")
root = pathlib.Path(__file__).parent

def trad(rec, keys):
    t = {}
    for k in keys:
        v = rec.get(k)
        if v:
            tv = cc.convert(v)
            if tv != v:
                t[k] = tv
    if t:
        rec["t"] = t

data = json.loads((root / "data/chengyu.json").read_text(encoding="utf-8"))
for r in data:
    trad(r, ["e", "zh", "o", "syn", "ant"])

s36 = json.loads((root / "data/stratagems.json").read_text(encoding="utf-8"))
s36["itemsT"] = [[cc.convert(x[0]), cc.convert(x[4])] for x in s36["items"]]
for c in s36["chapters"]:
    c["zht"] = cc.convert(c["zh"]); c["numt"] = cc.convert(c["num"])

def js(o):
    return (json.dumps(o, ensure_ascii=False, separators=(",", ":"))
            .replace("</", "<\\/").replace("\u2014", "\\u2014").replace("\u2013", "\\u2013"))

html = (root / "template.html").read_text(encoding="utf-8")
m = re.search(r"/\*ZH\*/(.*?)/\*ZHEND\*/", html, re.S)
zht = cc.convert(m.group(1)).replace("zh: {", "zht: {", 1)
html = html.replace("/*ZHT*/", zht.strip() + ",")
html = html.replace("/*DATA*/[]", js(data)).replace("/*S36*/{}", js(s36))
(root.parent / "index.html").write_text(html, encoding="utf-8")
print("wrote", root.parent / "index.html", len(html.encode()), "bytes,", len(data), "chengyu")

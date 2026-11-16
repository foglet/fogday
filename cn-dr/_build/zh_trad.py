"""Fill the traditional-character column of data/ui_zh.tsv and data/titles_zh.tsv from the simplified one.
Uses OpenCC s2twp (Taiwan standard, with Taiwan vocabulary such as 影片 for video). Rows that already have a
traditional column are left alone, so hand fixes stick. pip install opencc-python-reimplemented"""
import pathlib
from opencc import OpenCC
cc = OpenCC("s2twp")
# Corrections to the phrase conversion, applied to every generated cell. Taiwan also uses corner-bracket quotes.
FIX = [("箇中", "個中"), ("高階", "高級"), ("許可權", "權限"), ("聯絡起來", "聯繫起來"), ("說開啟/關上", "說打開/關上"), ("訊息", "消息"),
       ("\u201c", "\u300c"), ("\u201d", "\u300d"), ("\u2018", "\u300e"), ("\u2019", "\u300f")]
def conv(t):
    t = cc.convert(t)
    for a, b in FIX: t = t.replace(a, b)
    return t
root = pathlib.Path(__file__).parent / "data"
for name in ("ui_zh.tsv", "titles_zh.tsv"):
    f = root / name
    if not f.exists(): continue
    out = []
    for line in f.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"): out.append(line); continue
        c = line.split("\t")
        if len(c) < 3 or not c[2]: c = c[:2] + [conv(c[1])]
        out.append("\t".join(c))
    f.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(name, len(out))

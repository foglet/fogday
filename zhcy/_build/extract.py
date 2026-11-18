"""Extract the chengyu dataset (Davey 2026, OSF 3TDA7, CC BY-NC 4.0) from the
data-browser.html page of github.com/chengyu-data/chengyu-dataset into data/chengyu.json.

Usage: python3 extract.py PATH/TO/data-browser.html
"""
import json, pathlib, random, re, sys, unicodedata

src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
blob = re.findall(r'<script type="application/json" data-for="[^"]+">(.*?)</script>', src, re.S)[0]
cols = json.loads(blob)["x"]["data"]
n = len(cols[0])

# The dataset spells third tones with a breve (ă) instead of a caron (ǎ). Fix it.
BREVE = str.maketrans("ăĕĭŏŭĂĔĬŎŬ", "ǎěǐǒǔǍĚǏǑǓ")
# UI rule: no em or en dashes. Translations use them between gloss and meaning.
DASH = re.compile(r"\s*(?:[–—]+|-{2,})\s*")

def clean(v):
    if v is None: return ""
    v = str(v).replace("\r", "").strip()
    v = re.sub(r"\n{2,}", "\n", v)
    return v

def en(v):
    v = DASH.sub("; ", clean(v))
    return v

def pin(v):
    return unicodedata.normalize("NFC", clean(v).translate(BREVE))

def sentiment(v):
    v = clean(v)
    return {"褒义成语": "褒", "贬义成语": "贬", "中性成语": "中"}.get(v, "")

def listish(v):
    v = clean(v)
    return "、".join(x.strip() for x in re.split(r"[、，,;；\n]", v) if x.strip())

rows = []
for i in range(n):
    e = clean(cols[0][i])
    r = {
        "e": e,
        "p": pin(cols[1][i]),
        "en": en(cols[5][i]),
        "zh": clean(cols[2][i]) or clean(cols[3][i]),
        "o": clean(cols[21][i]) or clean(cols[22][i]),
        "syn": listish(cols[6][i]),
        "ant": listish(cols[9][i]),
        "s": sentiment(cols[10][i]),
    }
    j = en(cols[4][i])
    if j and j.lower() != r["en"].lower(): r["en2"] = j
    rows.append({k: v for k, v in r.items() if v})

# Fixed shuffle so the daily order mixes the alphabet and never changes between builds.
random.Random(20261118).shuffle(rows)
out = pathlib.Path(__file__).parent / "data/chengyu.json"
out.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(len(rows), "rows,", out.stat().st_size, "bytes")

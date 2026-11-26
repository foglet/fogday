#!/usr/bin/env python3
"""Build zhcy/tone/index.html (Tone Pairs).

The header, footer row and stylesheet are taken from zhcy/_build/template.html at build
time, so the tone page keeps the /zhcy look. The 40 words come from words.json (from /zh20).
Audio: every MP3 in assets/echo/zh/ is grouped by its leading word and inlined as a map.

Run from the repo root: python3 zhcy/tone/_build/build.py   (needs: pip install opencc)
"""
import json, re, unicodedata
from pathlib import Path
import opencc

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
ZHCY = ROOT / "zhcy" / "_build" / "template.html"
AUDIO = ROOT / "assets" / "echo" / "zh"
OUT = HERE.parent / "index.html"

PAT = re.compile(
    r"^(?P<word>[^.,\-]+)[.,\-](?P<py>[^.,\-]+?)"
    r"(?:[.\-]+[a-z]?ondoku3_\d{8}-\d{6}_(?P<voice>.+))?\.mp3$",
    re.IGNORECASE,
)


def need(s, a):
    if s.count(a) != 1:
        raise SystemExit(f"zhcy template changed, cannot find exactly one: {a[:70]!r}")


def sub(s, a, b):
    need(s, a)
    return s.replace(a, b)


def zhcy_parts():
    z = ZHCY.read_text(encoding="utf-8")
    style = z[z.index("<style>") + 7 : z.index("</style>")]
    style = style.replace("url(fonts/", "url(../fonts/")
    header = z[z.index('<header class="top">') : z.index("</header>") + 9]
    a0 = z.index('<div class="actions">')
    actions = z[a0 : z.index("</div>", z.index('id="star"')) + 6]

    # Header: Tone Pairs title, brand goes back to the chengyu page (as in 36 mode).
    header = sub(header, '<a class="brand" href="./" aria-label="Chengyu of the day, home" data-ta="home">',
                 '<a class="brand" href="../" aria-label="Tone Pairs, back to chengyu">')
    header = sub(header, '<span class="seal" id="seal" aria-hidden="true">成</span>',
                 '<span class="seal" id="seal" aria-hidden="true">二</span>')
    header = sub(header, '<b data-t="brand">Chengyu</b> <small lang="zh-Hans" class="sub" id="sub">每日成语</small>',
                 '<b>Tone Pairs</b> <small lang="zh-Hans" class="sub" id="sub">声调组合</small>')
    header = header.replace(' data-ta="books"', "").replace(' data-ta="info"', "").replace(' data-ta="works"', "")
    header = sub(header, 'aria-label="Meaning and search"', 'aria-label="Word list"')

    # Footer row: 36 opens the stratagems on the chengyu page; 發財 is the current page.
    actions = sub(actions, '<button class="n36" id="b36" type="button" aria-pressed="false" aria-label="Thirty-Six Stratagems" data-ta="b36">36</button>',
                  '<a class="n36 nfc" id="b36" href="../#36-1" aria-label="Thirty-Six Stratagems">36</a>')
    actions = sub(actions, '<a class="n36 nfc" id="bfc" href="tone/" lang="zh-Hant" aria-label="Tone practice" data-ta="bfc">發財</a>',
                  '<a class="n36 nfc" id="bfc" href="./" lang="zh-Hant" aria-label="Tone Pairs" aria-current="page">發財</a>')
    actions = sub(actions, ' aria-label="Play pronunciation" data-ta="play"', ' aria-label="Play pronunciation"')
    actions = sub(actions, ' aria-label="Copy chengyu" data-ta="copy"', ' aria-label="Copy word"')
    actions = sub(actions, 'aria-label="Star this chengyu"', 'aria-label="Star this word"')
    return style, header, actions


def clips():
    out = {}
    skipped = []
    for f in sorted(AUDIO.glob("*.mp3")):
        m = PAT.match(unicodedata.normalize("NFC", f.name))
        if not m:
            skipped.append(f.name)
            continue
        out.setdefault(m.group("word").strip(), []).append(f.name)
    return out, skipped


def main():
    style, header, actions = zhcy_parts()
    words = json.loads((HERE / "words.json").read_text(encoding="utf-8"))
    s2t, t2s = opencc.OpenCC("s2tw"), opencc.OpenCC("tw2s")
    for w in words:
        w["hs"], w["ht"] = t2s.convert(w["w"]), s2t.convert(w["w"])
        w["zht"] = s2t.convert(w["zh"])
    cl, skipped = clips()
    clip = {w["w"]: cl.get(w["w"], []) for w in words}
    missing = [w for w, v in clip.items() if not v]

    tpl = (HERE / "template.html").read_text(encoding="utf-8")
    html = (tpl.replace("/*ZHCY_STYLE*/", style)
               .replace("<!--ZHCY_HEADER-->", header)
               .replace("<!--ZHCY_ACTIONS-->", actions)
               .replace("/*WORDS*/[]", json.dumps(words, ensure_ascii=False, separators=(",", ":")))
               .replace("/*CLIPS*/{}", json.dumps(clip, ensure_ascii=False, separators=(",", ":"))))
    OUT.write_text(html, encoding="utf-8")
    print(f"{len(words)} words, {sum(map(len, clip.values()))} clips -> {OUT.relative_to(ROOT)}")
    if missing:
        print("no recording (falls back to speech):", " ".join(missing))
    if skipped:
        print("skipped (name not recognised):", *skipped, sep="\n  ")


if __name__ == "__main__":
    main()

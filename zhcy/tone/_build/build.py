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


GAME = ("M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16Z"
        "M241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65Z"
        "M172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z")


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

    # Header: the /zhcy header, unchanged. Its links lead back to the chengyu page (see template.html).
    # Header: the /zhcy header with the title Tone Pairs (as 36 mode shows Stratagems). The title refreshes Tone Pairs.
    header = sub(header, '<a class="brand" href="./" aria-label="Chengyu of the day, home" data-ta="home">',
                 '<a class="brand" href="./" aria-label="Tone Pairs, refresh">')
    header = sub(header, '<b data-t="brand">Chengyu</b> <small lang="zh-Hans" class="sub" id="sub">每日成语</small>',
                 '<b>Tone Pairs</b> <small lang="zh-Hans" class="sub" id="sub">声调组合</small>')
        # No books icon on Tone Pairs (Meaning and search belongs to the chengyu). Info and the bento stay put.
    m = re.search(r'\s*<button class="ibtn tab" id="bBooks".*?</button>', header, re.S)
    if not m:
        raise SystemExit("zhcy template changed, cannot find the books button")
    header = header.replace(m.group(0), '')

    # Footer row: 36 opens the stratagems on the chengyu page; 發財 is the current page.
    actions = sub(actions, '<button class="n36" id="b36" type="button" aria-label="Thirty-Six Stratagems" data-ta="b36">36</button>',
                  '<a class="n36 nfc" id="b36" href="../#36-1" aria-label="Thirty-Six Stratagems">36</a>')
    # Language switch removed for now; its slot stays empty so the other icons keep their /zhcy positions.
    m = re.search(r'<button class="ibtn lang" id="lang".*?</button>', actions, re.S)
    if not m:
        raise SystemExit("zhcy template changed, cannot find the language button")
    actions = actions.replace(m.group(0), '<span class="ibtn tp-gap" aria-hidden="true"></span>')
    # 發財 slot toggles: game controller (opens the word grid) or 發財 (back to the single word).
    actions = sub(actions, '<a class="n36 nfc" id="bfc" href="tone/" lang="zh-Hant" aria-label="Tone practice" data-ta="bfc">發財</a>',
                  '<button class="n36 nfc" id="bfc" type="button" aria-controls="vBooks" aria-label="Word grid">'
                  '<svg class="ph" viewBox="0 0 256 256" aria-hidden="true"><path d="' + GAME + '"/></svg></button>')
    actions = sub(actions, ' aria-label="Play pronunciation" data-ta="play"', ' aria-label="Play pronunciation"')
    actions = sub(actions, ' aria-label="Copy chengyu" data-ta="copy"', ' aria-label="Copy word"')
    # Tone pairs cannot be starred; its slot stays empty too. Visible row: 36, game controller or 發財, copy.
    m = re.search(r'<button class="ibtn star" id="star".*?</button>', actions, re.S)
    if not m:
        raise SystemExit("zhcy template changed, cannot find the star button")
    actions = actions.replace(m.group(0), '<span class="ibtn tp-gap" aria-hidden="true"></span>')
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

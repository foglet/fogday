#!/usr/bin/env python3
"""Build zhcy/tone/index.html: scan assets/echo/zh/*.mp3, group by word, inline as JSON.

Filename patterns handled:
  词,pinyin.mp3
  词,pinyin-ondoku3_YYYYMMDD-HHMMSS_Voice.mp3
  词.pinyin.ondoku3_YYYYMMDD-HHMMSS_Voice.mp3
  词-Pinyin-ondoku3_YYYYMMDD-HHMMSS_Voice.mp3
Run: python3 zhcy/tone/_build/build.py
"""
import json, re, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent  # repo root (zhcy/tone/_build -> fogday)
AUDIO = ROOT / "assets" / "echo" / "zh"
OUT = HERE.parent / "index.html"

PAT = re.compile(
    r"^(?P<word>[^.,\-]+)[.,\-](?P<py>[^.,\-]+?)"
    r"(?:[.\-]+[a-z]?ondoku3_\d{8}-\d{6}_(?P<voice>.+))?\.mp3$",
    re.IGNORECASE,
)


def main():
    words = {}
    skipped = []
    for f in sorted(AUDIO.glob("*.mp3")):
        name = unicodedata.normalize("NFC", f.name)
        m = PAT.match(name)
        if not m:
            skipped.append(name)
            continue
        w = m.group("word").strip()
        entry = words.setdefault(w, {"w": w, "p": m.group("py"), "a": []})
        entry["a"].append({"f": f.name, "v": (m.group("voice") or "original").replace(".", " ")})
    clips = {w: [a["f"] for a in e["a"]] for w, e in sorted(words.items())}
    tpl = (HERE / "template.html").read_text(encoding="utf-8")
    html = tpl.replace("/*CLIPS*/{}", json.dumps(clips, ensure_ascii=False, separators=(",", ":")))
    # report words on the page with no recording (they fall back to speech synthesis)
    import re as _re
    shown = set(_re.findall(r'"([\u4e00-\u9fff]{2,})"', html.split("const CLIPS")[0]))
    missing = sorted(shown - set(clips))
    if missing:
        print("no recording (uses speech):", " ".join(missing))
    OUT.write_text(html, encoding="utf-8")
    n = sum(len(v) for v in clips.values())
    print(f"{len(clips)} recorded words, {n} clips -> {OUT.relative_to(ROOT)}")
    if skipped:
        print("skipped (name not recognised):", *skipped, sep="\n  ")


if __name__ == "__main__":
    main()

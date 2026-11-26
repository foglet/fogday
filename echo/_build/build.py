#!/usr/bin/env python3
"""Build echo/index.html: scan assets/echo/zh/*.mp3, group by word, inline as JSON.

Filename patterns handled:
  词,pinyin.mp3
  词,pinyin-ondoku3_YYYYMMDD-HHMMSS_Voice.mp3
  词.pinyin.ondoku3_YYYYMMDD-HHMMSS_Voice.mp3
  词-Pinyin-ondoku3_YYYYMMDD-HHMMSS_Voice.mp3
Run: python3 echo/_build/build.py
"""
import json, re, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
AUDIO = ROOT / "assets" / "echo" / "zh"
OUT = HERE.parent / "index.html"

PAT = re.compile(
    r"^(?P<word>[^.,\-]+)[.,\-](?P<py>[^.,\-]+?)"
    r"(?:[.\-]ondoku3_\d{8}-\d{6}_(?P<voice>.+))?\.mp3$",
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
    data = sorted(words.values(), key=lambda e: "".join(c for c in unicodedata.normalize("NFD", e["p"].lower()) if not unicodedata.combining(c)))
    tpl = (HERE / "template.html").read_text(encoding="utf-8")
    html = tpl.replace("/*DATA*/[]", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    OUT.write_text(html, encoding="utf-8")
    n = sum(len(e["a"]) for e in data)
    print(f"{len(data)} words, {n} clips -> {OUT.relative_to(ROOT)}")
    if skipped:
        print("skipped (name not recognised):", *skipped, sep="\n  ")


if __name__ == "__main__":
    main()

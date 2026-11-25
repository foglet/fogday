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
# Guard: a // comment pasted into the middle of a line comments out the rest of it (a lost "}" breaks the whole page).
# Count braces through the script, skipping strings and comments; they must balance, and each top-level function
# must start at the IIFE's depth (1).
js = html.split("<script>")[1].split("</script>")[0]
depth, bad = 0, []
for n, line in enumerate(js.split("\n"), 1):
    if line.startswith("function ") and depth != 1: bad.append(f"line {n}: starts at depth {depth}: {line[:60]}")
    q = None; i = 0
    while i < len(line):
        c = line[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c == "/" and line[i+1:i+2] == "/": break
        elif c in "\"'`": q = c
        elif c == "{": depth += 1
        elif c == "}": depth -= 1
        i += 1
assert depth == 0 and not bad, "brace check failed (depth %d): %s" % (depth, bad[:3])
# Guard 2: code swallowed by a comment (a // pasted mid-line leaves real code in the comment text).
import re
code_in_comment = []
for n, line in enumerate(js.split("\n"), 1):
    q = None; i = 0
    while i < len(line):
        c = line[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c == "/" and line[i+1:i+2] == "/":
            if re.search(r"\b(const|let)\s+\w+\s*=|\)\s*\{|\w+\(.*\);", line[i+2:]): code_in_comment.append(f"line {n}: {line[i:i+70]}")
            break
        elif c in "\"'`": q = c
        i += 1
assert not code_in_comment, "code inside a // comment: %s" % code_in_comment[:3]
(root.parent / "index.html").write_text(html, encoding="utf-8")
print("wrote", root.parent / "index.html", len(html), "bytes")

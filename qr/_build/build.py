"""Build qr/index.html from template.html (no data to inline; the guard catches a broken script).
Edit template.html, never ../index.html, then run: python3 build.py"""
import json, pathlib
root = pathlib.Path(__file__).parent
html = (root / "template.html").read_text(encoding="utf-8")
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
(root.parent / "index.html").write_text(html, encoding="utf-8")
print("wrote", root.parent / "index.html", len(html), "bytes")

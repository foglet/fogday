"""Find Dr. Jia's new uploads and add them to the data files.

Reads two YouTube RSS feeds for @Mandarin-Insights (each lists only the 15 newest videos):
  UUSH<id>  her Shorts       -> appended to data/shorts.txt
  UULF<id>  her long videos  -> appended to data/long.txt (duration left blank; RSS doesn't give it)

Then reruns classify.py and build.py, so ../index.html is ready to publish.
Writes a Markdown summary to the path in argv[1] (for the PR body) and prints how many were added.
Exits 0 with nothing written to the data files when there's nothing new.

Usage: python3 fetch_new.py summary.md            (live feeds)
       python3 fetch_new.py summary.md shorts.xml long.xml   (saved feeds, for testing)
"""
import json, pathlib, subprocess, sys, time, urllib.request
import xml.etree.ElementTree as ET

CHANNEL = "UCMtSKPTqIS4TOIYJk5L7mbA"   # Mandarin Insights | Dr. Jia (@Mandarin-Insights)
FEED = "https://www.youtube.com/feeds/videos.xml?playlist_id={}"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
root = pathlib.Path(__file__).parent
SHORTS, LONG = root/"data/shorts.txt", root/"data/long.txt"


def read(src):
    if src.startswith("http"):
        # The feeds sometimes return a 404 or 5xx for a moment; try three times before failing the run
        for attempt in range(3):
            try:
                req = urllib.request.Request(src, headers={"User-Agent": "fogday-cn-dr/1.0"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    return r.read()
            except Exception as e:
                if attempt == 2: sys.exit(f"Couldn't read {src}: {e}")
                time.sleep(20)
    return pathlib.Path(src).read_bytes()


def entries(xml):
    """Feed entries, newest first: (id, title, views, published)."""
    doc = ET.fromstring(xml)
    ch = doc.findtext("yt:channelId", namespaces=NS) or ""
    # The feed's channel id has no "UC" prefix on some playlist feeds; compare the 22-character tail
    if ch and ch[-22:] != CHANNEL[-22:]:
        sys.exit(f"Feed belongs to channel {ch}, expected {CHANNEL}")
    out = []
    for e in doc.findall("a:entry", NS):
        stats = e.find("media:group/media:community/media:statistics", NS)
        views = int(stats.get("views", "0")) if stats is not None else 0
        title = " ".join((e.findtext("a:title", "", NS)).split())   # no newlines or "|" surprises
        out.append((e.findtext("yt:videoId", "", NS), title.replace("|", "/"), views,
                    e.findtext("a:published", "", NS)[:10]))
    return [x for x in out if x[0]]


def short_views(n):
    """YouTube-style counts, as in shorts.txt: 339, 1.2K, 14K, 1.1M."""
    if n < 1000: return str(n)
    if n < 10_000: return f"{n/1000:.1f}".rstrip("0").rstrip(".") + "K"
    if n < 1_000_000: return f"{n//1000}K"
    return f"{n/1e6:.1f}".rstrip("0").rstrip(".") + "M"


def known_ids():
    ids = set()
    for f in (SHORTS, LONG):
        for line in f.read_text(encoding="utf-8").splitlines():
            if line.strip():
                parts = line.split("|")
                ids.add(parts[1] if f == SHORTS else parts[0])
    return ids


def main():
    summary = pathlib.Path(sys.argv[1])
    src_s = sys.argv[2] if len(sys.argv) > 3 else FEED.format("UUSH" + CHANNEL[2:])
    src_l = sys.argv[3] if len(sys.argv) > 3 else FEED.format("UULF" + CHANNEL[2:])
    shorts, longs = entries(read(src_s)), entries(read(src_l))
    if not shorts:
        sys.exit("Shorts feed came back empty; not changing anything")
    known = known_ids()
    new_s = [e for e in shorts if e[0] not in known]
    new_l = [e for e in longs if e[0] not in known]
    if not new_s and not new_l:
        print("added=0"); return

    # Shorts: next index after the highest. The feed is newest first and is appended in that order, so the oldest
    # new Short gets the highest index; build.py numbers new Shorts by descending index, so it gets the lowest No.
    lines = [l for l in SHORTS.read_text(encoding="utf-8").splitlines() if l.strip()]
    nxt = max(int(l.split("|", 1)[0]) for l in lines) + 1
    with SHORTS.open("a", encoding="utf-8") as f:
        for k, (vid, t, v, _) in enumerate(new_s):
            f.write(f"{nxt + k}|{vid}|{short_views(v)}|{t}\n")
    # Long videos: oldest first, so their 1000+n indexes keep upload order
    with LONG.open("a", encoding="utf-8") as f:
        for vid, t, v, _ in reversed(new_l):
            f.write(f"{vid}||{short_views(v)}|{t}\n")

    md = [f"New uploads from [@Mandarin-Insights](https://www.youtube.com/@Mandarin-Insights), found by the daily check.", ""]
    if new_s:
        md += [f"**{len(new_s)} new Short{'s' * (len(new_s) != 1)}** (newest first):", ""]
        md += [f"- {d} · [{t}](https://www.youtube.com/shorts/{vid})" for vid, t, _, d in new_s]
        md.append("")
    if new_l:
        md += [f"**{len(new_l)} new full-length video{'s' * (len(new_l) != 1)}** (duration is blank; add it in `data/long.txt` if you want it shown):", ""]
        md += [f"- {d} · [{t}](https://www.youtube.com/watch?v={vid})" for vid, t, _, d in new_l]
        md.append("")
    if len(new_s) == len(shorts) or (longs and len(new_l) == len(longs)):
        md += ["> ⚠️ Every video in a feed was new. The feeds only list the 15 newest, so **older uploads may be "
               "missing**. Compare with the channel page and add any gaps to `data/shorts.txt` by hand.", ""]
    py = sys.executable
    subprocess.run([py, "classify.py", "data/shorts.txt", "data/overrides.txt", "data/content.json"], cwd=root, check=True)
    subprocess.run([py, "build.py"], cwd=root, check=True)
    items = {r["id"]: r for r in json.loads((root/"data/content.json").read_text(encoding="utf-8"))["items"]}
    md += ["How the classifier filed them:", "", "| Index | Title | Level | Section | Topic |", "|---|---|---|---|---|"]
    for vid, t, _, _ in new_s + new_l:
        r = items.get(vid, {})
        md.append(f"| {r.get('n', '?')} | {t[:60]} | {r.get('lv', '?')} | {r.get('sec', '?')} | {r.get('top', '?')} |")
    md.append("")
    md += ["Check the level, section and topic the classifier gave each one in the app preview. "
           "Fix any in `data/overrides.txt` (by index), then rerun `classify.py` and `build.py`."]
    summary.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"added={len(new_s) + len(new_l)}")


main()

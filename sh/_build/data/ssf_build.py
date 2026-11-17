"""Build ssf-compact.json (Free South City Shuttle) from two sources, as the city publishes no GTFS:
  ssf-timetable.json  times from the city's 2025-2027 schedule PDF (minutes after midnight, one list per trip)
  ssf-ips.json        stop points and route lines from the city's live tracker (IPS Sentry site 19)
Run: python3 ssf_build.py  (from this folder)
"""
import json, math, pathlib, re
here = pathlib.Path(__file__).parent
tt = json.loads((here / "ssf-timetable.json").read_text())
ips = json.loads((here / "ssf-ips.json").read_text())
KX, KY = math.cos(math.radians(37.66)) * 111320, 110540

def norm(s):
    s = s.upper().replace("/", "&").replace("WES TBOROUGH", "WESTBOROUGH").replace("SSFDR.", "SSF DR.")
    s = s.replace("CENT WY TRAIL", "CENTENNIAL WAY TRAIL").replace("1ST ST (SOUTHWOOD)", "1ST STREET")
    return re.sub(r"\s+", " ", s).strip()
ALIAS = {"ECR & SOUTHWOOD": "ECR & 1ST STREET"}   # one stop: the timetable names it Southwood one way, 1st Street the other
pts = {norm(s[0]): s for s in ips["stops"]}

stops, sidx = [], {}
def stop(name):
    k = ALIAS.get(norm(name), norm(name))
    s = pts[k]   # KeyError means a timetable stop the tracker does not have
    if k not in sidx:
        sidx[k] = len(stops); stops.append([s[0].replace(" / ", " & "), round(s[1] * 1e5), round(s[2] * 1e5)])
    return sidx[k]

def along(line, seq):
    """distance (m) of each stop along the line: the first pass within 60 m, moving forward only"""
    cum = [0.0]
    for a, b in zip(line, line[1:]): cum.append(cum[-1] + math.hypot((b[1]-a[1]) * KX, (b[0]-a[0]) * KY))
    out, frm = [], 0
    for name in seq:
        s = pts[ALIAS.get(norm(name), norm(name))]; P = (s[1], s[2]); best = (1e18, cum[frm], frm)
        for i in range(frm, len(line) - 1):
            A, B = line[i], line[i+1]; ax, ay = (B[1]-A[1]) * KX, (B[0]-A[0]) * KY; px, py = (P[1]-A[1]) * KX, (P[0]-A[0]) * KY
            L = ax*ax + ay*ay; t = max(0, min(1, (px*ax + py*ay) / L)) if L else 0; d = math.hypot(px - t*ax, py - t*ay)
            if d < best[0] - 0.5: best = (d, cum[i] + t * math.sqrt(L), i)
            if best[0] < 60 and d > best[0] + 50: break   # first pass by the stop, not a later one (loops come back past it)
        assert best[0] < 120, (name, round(best[0]))   # every stop sits on its line
        out.append(round(best[1])); frm = best[2]
    return out, round(cum[-1])

ROUTE = {"BLUE": ("Blue", "South City Blue", "#1f6fd1"), "GREEN": ("Green", "South City Green", "#2e9b4f"),
         "ORANGE": ("Orange", "South City Orange", "#e8861a")}
lines = {r["n"]: r["pts"] for r in ips["routes"]}
data = {"gen": "2026-11-17", "src": "https://www.ssfca.gov/Services/Free-South-City-Shuttle (2025-2027 schedule PDF; stops and lines from the live tracker)",
        "routes": [], "stops": stops, "shapes": [], "shapeLen": [], "trips": [], "patterns": [],
        # weekdays; no service on city holidays (2026 and 2027: the PDF's list; observed dates where the day falls on a weekend)
        "services": [{"d": "1111100", "s": "20250101", "e": "20271231", "a": [],
                      "x": ["20261126", "20261127", "20261225", "20270101", "20270531", "20270705", "20270906", "20271125", "20271126", "20271224"]}]}
for k, (n, ln, c) in ROUTE.items():
    t = next(x for x in tt if x["route"] == k); line = lines[k]
    ri = len(data["routes"]); data["routes"].append({"id": "ssf:" + k.lower(), "n": n, "ln": ln, "c": c, "tc": "#ffffff",
        "u": "https://www.ssfca.gov/Services/Free-South-City-Shuttle", "ag": "ssf"})
    enc, pa, po = [], 0, 0
    for a, o in line:
        A, O = round(a * 1e5), round(o * 1e5); enc += [A - pa, O - po]; pa, po = A, O
    hi = len(data["shapes"]); dists, L = along(line, t["stops"]); data["shapes"].append(enc); data["shapeLen"].append(L)
    for trip in t["trips"]:
        t0 = trip[0] * 60
        pat = [[stop(s), m * 60 - t0, d] for s, m, d in zip(t["stops"], trip, dists)]
        assert all(b[1] >= a[1] for a, b in zip(pat, pat[1:]))
        if pat not in data["patterns"]: data["patterns"].append(pat)
        data["trips"].append([ri, 0, hi, data["patterns"].index(pat), t0])
(here / "ssf-compact.json").write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
print(len(data["routes"]), "routes", len(stops), "stops", len(data["trips"]), "trips", len(data["patterns"]), "patterns", data["shapeLen"])

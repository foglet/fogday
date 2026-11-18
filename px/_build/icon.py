"""Home-screen icons (icon-180.png, icon-512.png) for px/: one dragon from sprites.json on a day sky over grass.
Run: python3 icon.py"""
import json, colorsys, pathlib
from PIL import Image
root = pathlib.Path(__file__).parent
spr = json.loads((root / "sprites.json").read_text())["nn"][1]   # walking, wings up
def hsv(h, s, v): r, g, b = colorsys.hsv_to_rgb((h % 360) / 360, s, v); return (int(r*255), int(g*255), int(b*255))
b, w, l, sa, va = 150, 285, 50, .62, .86   # green body, violet wings, warm belly
wt = hsv(w, sa+.06, va+.02)
pal = {1:(36,22,48), 2:hsv(b,sa,va), 3:hsv(b,sa+.08,va*.7), 4:hsv(l,.3,1), 5:wt, 6:hsv(w,sa+.13,va*.72),
       7:(250,236,200), 8:(255,214,60), 9:(20,14,30), 10:wt, 11:wt}
G = 36   # art grid: 30x26 sprite centred on a 36x36 tile
im = Image.new("RGB", (G, G))
for y in range(G):
    k = y / G; top, bot = (92,150,214), (170,206,236)
    for x in range(G): im.putpixel((x, y), tuple(int(top[i] + (bot[i]-top[i])*k) for i in range(3)) if y < 27 else ((104,170,82) if y < 30 else (88,152,70)))
for i, ch in enumerate(spr):
    c = ord(ch) - 48
    if c: im.putpixel((3 + i % 30, 6 + i // 30), pal[c])
for n in (180, 512):
    im.resize((n, n), Image.NEAREST).save(root.parent / f"icon-{n}.png", optimize=True)
print("wrote icons")

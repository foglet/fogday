"""Pixel Dragons banner 2, 980 x 300: night sky (no moon), stars, mountains, ground, ten dragons at random in colours
spread round the wheel (one breathing fire, one spraying water) and the title in Silkscreen with the page's outline. Uses the page's sprites and colour rules.
usage: python3 banner.py [out.png] [--seed N] [--font path/to/Silkscreen-700.ttf]"""
import json, math, random, colorsys, argparse, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument('out', nargs='?', default='banner2.png')
ap.add_argument('--seed', type=int, default=7); ap.add_argument('--font', default='/tmp/fonts/Silkscreen-700.ttf')
A = ap.parse_args(); rnd = random.Random(A.seed)
root = pathlib.Path(__file__).parent
SPRS = {k: [[ord(c) - 48 for c in s] for s in v] for k, v in json.loads((root / 'sprites.json').read_text()).items()}
GW, GH, FOOT = 30, 26, 22
W, H, P = 980, 300, 4                       # final size; scene drawn in 4 px blocks
gw, gh = W // P, H // P
OUT = (36, 22, 48)                          # the dragons' outline colour, also the title's

def hsv(h, s, v): r, g, b = colorsys.hsv_to_rgb((h % 360) / 360, max(0, min(1, s)), max(0, min(1, v))); return (round(r*255), round(g*255), round(b*255))
def pal(h, sv, rainbow=False):              # same rules as palOf() on the page
    b, w, l = h; sa, va = sv
    p = {2: hsv(b, sa, va), 3: hsv(b, sa+.08, va*.7), 4: hsv(l, .3, 1), 5: hsv(w, sa+.06, va+.02), 6: hsv(w, sa+.13, va*.72)}
    p[10] = hsv(w+110, sa+.15, va+.04) if rainbow else p[5]; p[11] = hsv(w+220, sa+.15, va+.04) if rainbow else p[5]
    p.update({1: OUT, 7: (250, 236, 200), 8: (255, 214, 60), 9: (20, 14, 30)}); return p

# ---------- scene (art grid) ----------
art = Image.new('RGB', (gw, gh)); ap_ = art.load()
BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
STOPS = [(0, (10, 12, 36)), (.7, (26, 34, 78)), (1, (46, 56, 104))]
def lerp(u):
    for (u0, c0), (u1, c1) in zip(STOPS, STOPS[1:]):
        if u <= u1: k = (u - u0) / (u1 - u0); return tuple(round(a + (b - a)*k) for a, b in zip(c0, c1))
    return STOPS[-1][1]
gtop = 52                                    # ground starts here (art rows)
for y in range(gh):
    for x in range(gw):
        b = min(10, math.floor(min(1, y / gtop)*10 + BAYER[(y & 3)*4 + (x & 3)]/16 - .5)); ap_[x, y] = lerp(max(0, b) / 10)
for _ in range(gw*gtop // 55):              # stars; a few big ones
    x, y = rnd.randrange(gw), rnd.randrange(int(gtop*.8)); ap_[x, y] = (236, 238, 255)
    if rnd.random() < .22:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= x+dx < gw and 0 <= y+dy < gh: ap_[x+dx, y+dy] = (150, 156, 200)
for layer, col, hgt in ((0, (44, 52, 92), .5), (1, (30, 38, 64), .3)):   # mountains: far (snow caps), near
    ph = [rnd.random()*6.28 for _ in range(3)]; f = [1.4 + rnd.random(), 3 + rnd.random()*2, 7 + rnd.random()*4]; j = 0
    for x in range(gw):
        u = x / gw; j = (j + (rnd.random() - .5)*1.2)*.9
        top = gtop - gtop*hgt*(.55 + .25*math.sin(u*f[0]*6.28 + ph[0]) + .12*math.sin(u*f[1]*6.28 + ph[1]) + .06*abs(math.sin(u*f[2]*6.28 + ph[2]))) + j
        cap = gtop - gtop*hgt*.78
        for y in range(max(0, round(top)), gtop):
            c = col
            if layer == 0 and y < cap + (x*7) % 3: c = (150, 160, 196)
            elif layer == 1 and (x + y) % 5 == 0 and y > top + 2: c = tuple(round(v*.9) for v in col)
            if y == round(top): c = tuple(round(v*.86) for v in c)
            ap_[x, y] = c
GR = [(43, 74, 46), (50, 84, 52), (54, 88, 56)]; DOTS = [(40, 72, 42), (70, 100, 64), (34, 62, 36)]   # night grass
for y in range(gtop, gh):
    u = (y - gtop) / (gh - gtop)
    for x in range(gw):
        c = (36, 66, 40) if y == gtop else GR[min(2, int(u*3))]
        if y > gtop and rnd.random() < .05 + .05*u: c = DOTS[rnd.randrange(3)]
        ap_[x, y] = c
for _ in range(9):                           # rocks
    cx, by = rnd.uniform(4, gw - 4), rnd.uniform(gtop + 3, gh - 2); u = (by - gtop) / (gh - gtop); w = 1.6 + u*3 + rnd.random()*1.5; h = w*.55
    base = (70, 68, 72)
    for yy in range(-math.ceil(h), 1):
        for xx in range(-math.ceil(w), math.ceil(w) + 1):
            rx, ry = xx / w, (yy + h*.05) / h; d = math.hypot(rx, ry)
            if d > 1: continue
            c = OUT if d > .78 else tuple(v + 26 for v in base) if (rx < -.15 and ry < -.35) else tuple(round(v*.76) for v in base) if (rx > .2 or ry > -.15) else base
            X, Y = round(cx + xx), round(by + yy)
            if 0 <= X < gw and 0 <= Y < gh: ap_[X, Y] = c
img = art.resize((W, H), Image.NEAREST).convert('RGBA')
dr = ImageDraw.Draw(img)

# ---------- dragons: ten at random, colours spread round the wheel, one breathing fire, one spraying water ----------
def blit(set_, frame, x, y, s, face, p):
    spr = SPRS[set_][frame]
    for r in range(GH):
        for c in range(GW):
            v = spr[r*GW + c]
            if not v: continue
            xx = x + (c if face > 0 else GW - 1 - c)*s; dr.rectangle([xx, y + r*s, xx + s - 1, y + r*s + s - 1], fill=p[v])
def body(): return rnd.choice('nnnnppppsss') + rnd.choice('nnnnlllsss')
TITLE = (28, 28, 440, 92)                     # keep dragons off the title
hues = [(rnd.uniform(0, 36) + i*36) % 360 for i in range(10)]; rnd.shuffle(hues)
boxes, dragons = [TITLE], []
def free(b): return all(b[2] <= o[0] or b[0] >= o[2] or b[3] <= o[1] or b[1] >= o[3] for o in boxes)
for i, h0 in enumerate(hues):
    for _ in range(4000):
        fly = i < 5 if True else False
        if fly: s = rnd.choice([2, 3, 3, 4]); x = rnd.randint(4, W - GW*s - 4); y = rnd.randint(4, 205 - GH*s)
        else:
            feet = rnd.randint(222, 294); s = 2 if feet < 240 else 3 if feet < 268 else 4
            x = rnd.randint(4, W - GW*s - 4); y = feet - FOOT*s
        b = (x - 3, y - 3, x + GW*s + 3, y + GH*s + 3)
        if free(b): break
    boxes.append(b)
    h = [h0, h0 + 60 + rnd.uniform(0, 240), h0 + rnd.uniform(0, 360)]; sv = [.45 + rnd.uniform(0, .45), .7 + rnd.uniform(0, .27)]
    dragons.append(dict(x=x, y=y, s=s, face=rnd.choice([-1, 1]), fly=fly, set=body(), fr=(8 + rnd.randrange(2)) if fly else rnd.randrange(8),
                        p=pal(h, sv, rnd.random() < .3), h=h))
for d in sorted(dragons, key=lambda d: (not d['fly'], d['y'] + FOOT*d['s'])):
    blit(d['set'], d['fr'], d['x'], d['y'], d['s'], d['face'], d['p'])
# breath: the fire and the water come from the two fliers with the most open sky in front of them
def room(d):
    mx = d['x'] + (27 if d['face'] > 0 else GW - 1 - 27)*d['s']
    return (W - mx) if d['face'] > 0 else mx
fl = sorted([d for d in dragons if d['fly']], key=room, reverse=True)
FIRE = [(255, 244, 170), (255, 206, 80), (250, 140, 40), (220, 70, 30), (120, 74, 64)]
WATER = [(236, 250, 255), (170, 226, 250), (104, 182, 236), (70, 142, 212)]
STEAM = [(246, 248, 250), (226, 232, 238), (204, 212, 220)]
br = random.Random(A.seed + 3)
def snap(v): return round(v / 4)*4
def spray(d, kind):
    s = d['s']; f = d['face']; mx = d['x'] + (27*s if f > 0 else (GW - 1 - 27)*s); my = d['y'] + 6.5*s; L = 34*s
    for _ in range(60 if kind == 'fire' else 55):
        u = br.random()**.8; dist = 4 + u*L
        if kind == 'fire': y = my + (br.random() - .5)*(6 + u*12*s) - u*u*4*s; c = FIRE[min(4, int(u*5))]; z = 8 if u < .35 else 4
        else: y = my + (br.random() - .5)*(4 + u*8*s) + u*u*9*s; c = WATER[min(3, int(u*4))]; z = 8 if u < .25 else 4   # water arcs down
        if u > .85 and br.random() < .5: continue
        x = snap(mx + f*dist); y = snap(y); dr.rectangle([x, y, x + z - 1, y + z - 1], fill=c)
    if kind == 'water':
        for _ in range(14):
            u = .3 + br.random()*.7; x = snap(mx + f*(4 + u*L) + (br.random() - .5)*8); y = snap(my + u*u*9*s - 6 - br.random()*14)
            c = STEAM[br.randrange(3)]; z = br.choice([4, 8]); dr.rectangle([x, y, x + z - 1, y + z - 1], fill=c)
spray(fl[0], 'fire'); spray(fl[1], 'water')
D1, D2, D3 = sorted(dragons, key=lambda d: d['x'])[:3]     # the title takes the colours of the three leftmost dragons
# ---------- title: Silkscreen, gradient of the first dragons' body colours, hard 4 px outline ----------
font = ImageFont.truetype(A.font, 36); text = 'PIXEL DRAGONS'   # 36 px: 25% smaller than the first 48 px
tw = round(font.getlength(text)) + 16; th = 64
mask = Image.new('L', (tw, th)); md = ImageDraw.Draw(mask); md.fontmode = '1'; md.text((8, 4), text, font=font, fill=255)
bb = mask.getbbox(); mask = mask.crop((bb[0] - 4, bb[1] - 4, bb[2] + 4, bb[3] + 4)); tw, th = mask.size
cols = [d['p'][2] for d in (D1, D2, D3)]
grad = Image.new('RGBA', (tw, th)); gp = grad.load()
for x in range(tw):
    u = x / (tw - 1)*(len(cols) - 1); i = min(len(cols) - 2, int(u)); k = u - i
    c = tuple(round(a + (b - a)*k) for a, b in zip(cols[i], cols[i + 1]))
    for y in range(th): gp[x, y] = c + (255,)
outline = mask.filter(ImageFilter.MaxFilter(7))          # 3 px each way, in step with the smaller type
tx, ty = 40, 40
img.paste(Image.new('RGBA', (tw, th), OUT + (255,)), (tx, ty), outline)
img.paste(grad, (tx, ty), mask)

R10 = 10   # rounded corners: transparent outside a 10 px radius (drawn 4x larger, then reduced, for a smooth edge)
cm = Image.new('L', (W*4, H*4)); ImageDraw.Draw(cm).rounded_rectangle([0, 0, W*4 - 1, H*4 - 1], radius=R10*4, fill=255)
img.putalpha(cm.resize((W, H), Image.LANCZOS))
img.save(A.out, optimize=True)
print(A.out, img.size, 'title', (tx, ty, tw, th), 'title colours', cols)

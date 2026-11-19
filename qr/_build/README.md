# fogday.com/qr: Pixel QR

Random lo-res pixel QR codes, Website menu: fogday.com (default), ohlonesky.com, oysteratlas.com; a free-form box under it overrides the menu. Remix gives a new one; every seed is a real, different code.

Pixel level: Pixel Waves v9 (chunky hard pixels, integer colour steps, the picture about 90 to 130 px wide). 3 px per module for short addresses; long ones drop to 2 or 1 px per module, with flat or dither shapes and square or bevel corners.

- Edit `template.html`, never `../index.html`, then run `python3 build.py` (it inlines `sprites.json`: the /px dragons, flying frames 8 and 9).
- Encoder: byte mode, versions 1 to 40, levels L/M/Q/H, any mask. Bit-exact with python `qrcode` (all 560 combos for the fogday URLs, plus samples of every version 1 to 40).
- Each remix picks: URL with or without trailing slash, level M/Q/H, version (minimum or one up), mask 0 to 7, palette, module shape (flat, brick, gem, dither, round), finder (square, round, eye), frame (bands, checker, stars, plain).
- Scan margins: dark modules at or under 0.10 luminance, light at or over 0.74, 4-module quiet zone.
- No frame: past the quiet zone the code's own data texture drifts outward (wind direction, trails, value-noise clumps) and fades away over 4 to 6 modules (7 to 9 with a picture). Tested: 400 seeds (200 plain, 200 with a picture) all decode in zbar at 3x, 4x, 6x and blurred 2x.
- Add picture: the photo is pixelated to the module grid as the background (on the device, never uploaded). Inside the quiet zone it is washed light; past it the wash fades out so the photo shows at the edges. Remix keeps it.
- Text it: share sheet with the PNG (Web Share with files); where that is missing it saves the PNG to attach by hand.
- Caption: 3x5 pixel font, 22 chars, saved under `qr:caption`. URL hash holds the seed (`#572228`).
- Styles: add an entry to `STYLES`; the Style picker shows once there are two.
- Corner markers: random on every remix (no picker): square, round, eye, dot, bevel, circle, morph. Circle and morph are drawn superellipses (morph: each anchor its own shape, circle to squircle; alignment markers morph too). Round, circle and morph fail OpenCV's detector often; zbar reads circle 100%, morph about 96%.
- Link format: `#SEED`, plus `&u=site` when not fogday.com.
- Buttons: Remix; Add picture and Remove picture side by side; Text it. Save and copy buttons were removed at the owner's request.
- Minecraft look: dark modules are textured blocks from 13 coloured materials (crimson stem, purpur, amethyst, leaves, oxidized copper, dark oak and spruce logs, nether brick, dark prismarine, lapis, redstone, warped stem, mud). Never black: no grey or black materials, and the shadow edge keeps the hue, sometimes two mixed, corner markers in a third; lit north edge, shadowed south edge, a thin cast shadow on the ground below; ore specks (diamond, emerald, gold, redstone, lapis, copper) never on a module centre. Ground is snow, quartz, concrete, calcite, end stone or bone. Caption letters are textured in the code's own block material, on the light ground. Loose blocks past the quiet zone are solid (no fade).
- Flying dragons (checkbox, saved under `qr:dragons`): 2 to 4 /px dragons in random colours fly a loop around the code in a lane outside the quiet zone (the margin widens to fit a 30x26 sprite). They are in the PNG that Text it sends. Tested: 240 frames across 40 codes all decode in zbar at 2x, 3x and 5x. Reduced motion: still dragons.
- Background: the live /px scene in a fixed iframe (`/px/?bg` hides its title, buttons and controls), not interactive. Small text sits on paper chips.

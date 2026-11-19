# fogday.com/qr: Pixel QR

Random lo-res pixel QR codes, default https://fogday.com (Website field takes any address). Remix gives a new one; every seed is a real, different code.

Pixel level: Pixel Waves v9 (chunky hard pixels, integer colour steps, the picture about 90 to 130 px wide). 3 px per module for short addresses; long ones drop to 2 or 1 px per module, with flat or dither shapes and square or bevel corners.

- Edit `template.html`, never `../index.html`, then run `python3 build.py`.
- Encoder: byte mode, versions 1 to 40, levels L/M/Q/H, any mask. Bit-exact with python `qrcode` (all 560 combos for the fogday URLs, plus samples of every version 1 to 40).
- Each remix picks: URL with or without trailing slash, level M/Q/H, version (minimum or one up), mask 0 to 7, palette, module shape (flat, brick, gem, dither, round), finder (square, round, eye), frame (bands, checker, stars, plain).
- Scan margins: dark modules at or under 0.10 luminance, light at or over 0.74, 4-module quiet zone.
- No frame: past the quiet zone the code's own data texture drifts outward (wind direction, trails, value-noise clumps) and fades away over 4 to 6 modules (7 to 9 with a picture). Tested: 400 seeds (200 plain, 200 with a picture) all decode in zbar at 3x, 4x, 6x and blurred 2x.
- Add picture: the photo is pixelated to the module grid as the background (on the device, never uploaded). Inside the quiet zone it is washed light; past it the wash fades out so the photo shows at the edges. Remix keeps it.
- Text it: share sheet with the PNG (Web Share), else sms: link on phones, else copies the link.
- Caption: 3x5 pixel font, 22 chars, saved under `qr:caption`. URL hash holds the seed (`#572228`).
- Styles: add an entry to `STYLES`; the Style picker shows once there are two.
- Corner markers: Random, Morph, Circle, Square, Round, Eye, Dot, Bevel. Circle and Morph are drawn superellipses (Morph: each anchor its own shape, circle to squircle; alignment markers morph too). Diamond scanned 0%, so it was dropped from the picker (saved under `qr:finder`, and in the link as `&c=`). Round, Circle and Morph fail OpenCV's detector often; zbar reads Circle 100%, Morph about 96%.
- Save SVG: one path per colour, built from horizontal runs of art pixels, crisp edges.
- Link format: `#SEED`, plus `&u=site` and `&c=corner` when not default.

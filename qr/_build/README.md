# fogday.com/qr: Pixel QR

Random lo-res pixel QR codes for https://fogday.com. Remix gives a new one; every seed is a real, different code.

- Edit `template.html`, never `../index.html`, then run `python3 build.py`.
- Encoder: byte mode, versions 1 to 10, levels L/M/Q/H, any mask. Bit-exact with python `qrcode` for all 560 valid combos of the two URLs.
- Each remix picks: URL with or without trailing slash, level M/Q/H, version (minimum or one up), mask 0 to 7, palette, module shape (flat, brick, gem, dither, round), finder (square, round, eye), frame (bands, checker, stars, plain).
- Scan margins: dark modules at or under 0.10 luminance, light at or over 0.74; frame outside the 4-module quiet zone is dark. Tested: 400 seeds (200 plain, 200 with a picture) all decode in zbar at 3x, 4x, 6x and blurred 2x.
- Add picture: the photo is sampled into the code's colors on the device (never uploaded), clamped to the same margins. Remix keeps it.
- Text it: share sheet with the PNG (Web Share), else sms: link on phones, else copies the link.
- Caption: 3x5 pixel font, 22 chars, saved under `qr:caption`. URL hash holds the seed (`#572228`).
- Styles: add an entry to `STYLES`; the Style picker shows once there are two.

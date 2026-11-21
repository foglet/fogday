# Halftone (fogday.com/halftone)

A photo turned into a **dot matrix** (colored dots sampled from the image, with a confetti-to-image reveal) or a **halftone** (one ink, image color, or CMYK screens), plus glitch, light-leak and color-grade effects.

- Edit `template.html`, then `python3 build.py` writes `../index.html`. Never edit `index.html`.
- Settings persist in localStorage under `halftone:settings`. Images never leave the device.
- Save: PNG at 1080 to 4096 px (long edge); the reveal can be saved as a video (MP4 on Safari, WebM on Chrome) where MediaRecorder exists.
- Bento: `/assets/js/bento-anim.js`, as on /qr.

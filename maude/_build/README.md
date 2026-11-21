# Maude Mxy (fogday.com/maude)

A photo turned into a **dot matrix** (colored dots sampled from the image, with a confetti-to-image reveal) or a **halftone** (one ink, image color, or CMYK screens), plus glitch, light-leak and color-grade effects.

- Edit `template.html`, then `python3 build.py` writes `../index.html`. Never edit `index.html`.
- The reset button (round arrow, top bar) clears everything: the photo goes back to the starting picture, settings go to defaults, undo history is emptied.
- Settings start fresh on every load; only the theme (`fogday-theme`), language (`fogday-lang`) and Surprise history (`maude:surprises`) are kept in localStorage. Images never leave the device.
- Save: PNG at the photo's original size (capped at about 16.7 million pixels for phone browsers; the working copy stays 2000 px and is redrawn full size just for that file) or 1080 to 4096 px (long edge); the reveal can be saved as a video (MP4 on Safari, WebM on Chrome) where MediaRecorder exists.
- Bento: `/assets/js/bento-anim.js`, as on /qr.

## Using it
- Starting points: a row of looks at the top of each tab (Dot matrix, Halftone, Effects). One tap sets that tab; a pressed chip means the settings match it.
- Under the image: Undo and Redo (also Ctrl or Cmd+Z, Shift+Z), hold to see the original, play the reveal (dot matrix), full width.
- A dot by a panel name means its settings differ from the defaults; the round arrow resets that panel. Double click a slider to reset it.
- Drop a photo on the page or paste one to open it. Touch screens get 44 px targets.

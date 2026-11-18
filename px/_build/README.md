# fogday.com/px: Pixel Dragons

Full-screen pixel dragons (the original design from the pixel-dragons-multi skill) over a pixel landscape, with a Controls sheet that starts closed.

- Edit `template.html`, never `../index.html`, then run `python3 build.py`.
- `sprites.json`: the 9 body x tail sprite sets (10 frames of 30x26 each), copied from `cn-dr/_build/template.html`.
- Settings are saved on the device under `px:settings`. "Reset all" restores the baseline.

Dragon controls: number (1-12), what they do (mixed, walk, hop, march in step, fly), flight pattern (mixed, roam, loops, circles, swoop, zigzag), follow finger, dizzy spells, colors (any, matching, pick), wings, offspring (sometimes, every dragon, none; 1-3 babies), breath (fire and water, fire, water, none), body (normal, fat, skinny), tail, speed.

Scene controls: background (landscape or plain paper), sky (day, sunset, night), clouds, mountains, ground (grass, sand, snow, none), random rocks.

Reduced motion: a still frame until Play is pressed.

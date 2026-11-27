# fogday.com/px: Pixel Dragons

Full-screen pixel dragons (the original design from the pixel-dragons-multi skill) over a pixel landscape, with a Controls sheet that starts closed.

- Edit `template.html`, never `../index.html`, then run `python3 build.py`.
- `sprites.json`: the 9 body x tail sprite sets (10 frames of 30x26 each), copied from `cn-dr/_build/template.html`.
- Full screen: the corner button (or F) hides the browser toolbars where the browser allows it. iPhone Safari has no page full screen, so the button is hidden there; `manifest.webmanifest` and the apple-mobile-web-app tags make Add to Home Screen open with no toolbars. `icon.py` draws `icon-180.png` and `icon-512.png`.
- Settings are saved on the device under `px:settings`. "Reset all" restores the baseline.

Dragon controls: number (1-12), what they do (mixed, walk, hop, march in step, fly), flight pattern (mixed, roam, loops, circles, swoop, zigzag), follow finger, dizzy spells, colors (any, matching, pick), wings, offspring (sometimes, every dragon, none; 1-3 babies), breath (fire and water, fire, water, none), body (normal, fat, skinny), tail, speed.

Scene controls: background (landscape or plain paper), sky (day, sunset, night), clouds, mountains, ground (grass, sand, snow, none), random rocks.

Reduced motion: a still frame until Play is pressed.

Fireballs: double-tap the scene to throw one, a gradient sphere 1 cm across in flames, at the nearest dragon. Every other fireball (1st, 3rd, 5th...) explodes, knocking every dragon within about 3 cm dizzy; the rest just burst on the dragon they hit, which goes dizzy. Water: keep a finger down and a water ball grows above it from 5 s, full at 15 s; let go to throw it (the way you flick, or at the nearest dragon). Let go before 15 s and it fizzles. Single taps still make the nearest dragons fire at your finger.

Panning: tap and hold at the far right (outer 18% of the width, middle third of the height) and the view pans right; at the far left it pans left. Each screen-width is its own scene (ground, mountains, rocks, river), made on first visit and kept, so panning back finds it again; neighbours never share a ground; the sky and weather stay; on the moon it stays the moon. Walkers slide with the ground, fliers fly on. Let go and it glides to the nearest whole scene, which becomes the saved scene. Random or a resize starts a fresh strip.

Volcano (a Random ground, always at night): a volcano rises out of the sea at one side, lava running down its flanks into the ocean, with steam and a glowing sea where it pours in, and a tall black-sand beach in front (from 72% of the screen down; dragons and monkeys keep clear of the bottom labels). It smokes, and every so often (about 20 to 45 s at 1x) it rumbles (the screen shakes), then erupts: a fire fountain, lava bombs that land on the beach or hiss into the sea, and 2 to 5 fire monkeys (an original design: orange fur, flame hair, flaming tail tip) flung out to tumble down, run and hop about the beach leaving hot footprints, then leap back into the crater. Lava spots cool from white-hot to black crust; rocks near them heat until they glow, slump and run down into puddles. A bomb that hits a dragon knocks it dizzy. Panning away from a volcano leads to land scenes under the same night sky.

# Echo (fogday.com/echo)

Grid of Mandarin words. Tap a word to play its MP3 from `assets/echo/zh/`; tap again for the next voice.

- Source: `template.html`. Do not edit `../index.html`.
- After adding or removing MP3s run `python3 echo/_build/build.py`, then commit.
- Filenames: `词,pinyin.mp3`, `词,pinyin-ondoku3_DATE-TIME_Voice.mp3`, or `词.pinyin.ondoku3_DATE-TIME_Voice.mp3`. Unrecognised names are printed as skipped.
- localStorage key `echo:pos` remembers which voice plays next per word.

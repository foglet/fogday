# 發財 tones (fogday.com/zhcy/tone)

Tone Pairs: the /zh20 word card and meaning-language menu inside the /zhcy header and footer (copied from zhcy/_build/template.html at build time, so rebuild after changing zhcy). Words live in `words.json`. Tapping the word or play plays a recorded MP3 from `assets/echo/zh/`, cycling voices. In the language menu, tapping ZH again switches Simplified and Traditional.

- Source: `template.html`. Do not edit `../index.html`.
- After adding or removing MP3s run `python3 zhcy/tone/_build/build.py`, then commit.
- Filenames: `词,pinyin.mp3`, `词,pinyin-ondoku3_DATE-TIME_Voice.mp3`, or `词.pinyin.ondoku3_DATE-TIME_Voice.mp3`. Unrecognised names are printed as skipped.
- localStorage key `tone:pos` remembers which voice plays next per word.
- Linked from the 發財 button in the zhcy bottom row (right of 36).

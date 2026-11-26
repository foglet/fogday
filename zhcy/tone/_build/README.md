# 發財 tones (fogday.com/zhcy/tone)

Tone Pairs: the /zh20 word card and meaning-language menu inside the /zhcy header and footer (copied from zhcy/_build/template.html at build time, so rebuild after changing zhcy). Words live in `words.json`. Tapping the word or play plays a recorded MP3 from `assets/echo/zh/`, cycling voices. In the language menu, tapping ZH again switches Simplified and Traditional.

- Source: `template.html`. Do not edit `../index.html`.
- After adding or removing MP3s run `python3 zhcy/tone/_build/build.py`, then commit.
- Filenames: `词,pinyin.mp3`, `词,pinyin-ondoku3_DATE-TIME_Voice.mp3`, or `词.pinyin.ondoku3_DATE-TIME_Voice.mp3`. Unrecognised names are printed as skipped.
- localStorage key `tone:pos` remembers which voice plays next per word; `tone:heard` lists the recordings played per word. Once all are heard, the characters and pinyin go light grey. When every word but 自摸 is grey, all reset to unheard (voice rotation `tone:pos` carries on).
- Fonts: the chengyu page font choice (zhcy:font2) carries over. `../fonts/` subsets lack 19 tone-page characters; `fonts/lxgw-wenkai-tone.woff2` (LXGW WenKai, OFL, from the lxgw-wenkai-webfont npm package) fills them. If words.json gains characters, rebuild that subset.
- Robot button (Phosphor `robot`, in the copy slot): plays every tone pair in random order, each in a random voice, reshuffles after each full round, stops after three rounds. Tap again, tap a word or swipe to stop. The word or grid tile follows along.
- Linked from the 發財 button in the zhcy bottom row (right of 36).
- Title menu and bottom-row swipe come with the copied /zhcy header (`data-pg="tone"` here). Swipe right on the bottom row returns to the chengyu or 36 card you left (sessionStorage `zhcy:back`); `zhcy:navin` tells the arriving page to ease its end icons in.

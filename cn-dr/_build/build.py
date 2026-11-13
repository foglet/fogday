import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root/"data/content.json").read_text(encoding="utf-8"))
# drop fields the page does not use
for r in data["items"]:
    r.pop("n", None)
    if not r.get("inf"): r.pop("inf", None)
    if not r.get("lab"): r.pop("lab", None)

MAT = {
 "crawled": "13 November 2026",
 "courses": [
  {"name":"Mandarin Foundation: Beginner Course","levels":["beginner"],"feature":True,
   "desc":"Her self-paced, step-by-step beginner course: the Mandarin you need first, in order, instead of scattered resources.",
   "url":"https://www.mandarininsights.com/yes?coupon=100EARLY","cta":"See the beginner course"},
  {"name":"Precision Mandarin (small-group, live)","levels":["beginner","intermediate"],
   "desc":"Live online group course for beginner and low-intermediate learners: clearer pronunciation, stronger listening, guided speaking with direct feedback.",
   "url":"https://www.mandarininsights.com/join?coupon=EARLYENROLLMENT","cta":"Check enrollment"},
  {"name":"Private lessons (one-on-one)","levels":["beginner","intermediate","advanced"],
   "desc":"Personal feedback, after-class support and a roadmap across pronunciation, listening, reading and speaking. Apply through her form.",
   "url":"https://www.mandarininsights.com/private","cta":"Apply for private lessons"},
 ],
 "free": [
  {"name":"Free guide: Understand Pinyin Spellings","desc":"Why pinyin is spelled the way it is, and where spelling hides the real sound.",
   "url":"https://www.mandarininsights.com/pinyinspellings","cta":"Get the free guide"},
  {"name":"Weekly practical tip (newsletter)","desc":"One practical language tip by email each week. Sign up on her site.",
   "url":"https://www.mandarininsights.com/","cta":"Sign up"},
 ],
 "ig": [
  {"path":"/p/DflqIf5tjEu/","kind":"Card","day":"Nov 10","date":"10 Nov 2026","text":"Use 的 (de) to show possession"},
  {"path":"/p/DfWW8v4RhJH/","kind":"Card","day":"Nov 4","date":"4 Nov 2026","text":"到 (dào) for arriving somewhere"},
  {"path":"/reel/DfQdEhPPVja/","kind":"Reel","day":"Nov 2","date":"2 Nov 2026","text":"Practical phrases for saying goodbye"},
  {"path":"/p/DfIBCnAvBUx/","kind":"Card","day":"Oct 30","date":"30 Oct 2026","text":"Build words with 心 (xīn)"},
  {"path":"/p/DfEcnWBBV-p/","kind":"Card","day":"Oct 29","date":"29 Oct 2026","text":"一起 (yìqǐ) for doing activities together"},
  {"path":"/reel/DfBibMFBKwR/","kind":"Reel","day":"Oct 27","date":"27 Oct 2026","text":"Mandarin opposites every learner should know"},
  {"path":"/p/De7zFILPGjQ/","kind":"Card","day":"Oct 25","date":"25 Oct 2026","text":"再 (zài) for doing something again"},
  {"path":"/p/De7L-WKtQ5g/","kind":"Card","day":"Oct 25","date":"25 Oct 2026","text":"比较 (bǐjiào): relatively, fairly"},
  {"path":"/reel/De5-N0RMA0F/","kind":"Reel","day":"Oct 24","date":"24 Oct 2026","text":"Say this before you ask for something, to sound polite"},
  {"path":"/p/Deykx5PM-kA/","kind":"Card","day":"Oct 22","date":"22 Oct 2026","text":"Adjective + 一点儿 for a small adjustment"},
  {"path":"/reel/DTn0FxYj0sR/","kind":"Reel","day":"Jan 17","date":"17 Jan 2026 (pinned)","text":"Are you pronouncing rè (热, hot) correctly?"},
  {"path":"/reel/DTlQQj0AdW1/","kind":"Reel","day":"Jan 16","date":"16 Jan 2026 (pinned)","text":"Are you pronouncing xièxie (thank you) correctly?"},
 ],
 "follow": [
  {"name":"YouTube","url":"https://www.youtube.com/@Mandarin-Insights"},
  {"name":"Instagram","url":"https://www.instagram.com/mandarininsights/"},
  {"name":"TikTok","url":"https://www.tiktok.com/@mandarininsights"},
  {"name":"mandarininsights.com","url":"https://www.mandarininsights.com/"},
 ],
}
html = (root/"template.html").read_text(encoding="utf-8")
html = html.replace("/*DATA*/", json.dumps(data, ensure_ascii=False, separators=(",",":")).replace("</", "<\\/"))
html = html.replace("/*MATERIALS*/", json.dumps(MAT, ensure_ascii=False, separators=(",",":")).replace("</", "<\\/"))
out = root.parent/"index.html"
out.write_text(html, encoding="utf-8")
print(out, len(html.encode()))

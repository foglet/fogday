import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root/"data/content.json").read_text(encoding="utf-8"))
# drop fields the page does not use
for r in data["items"]:
    r.pop("n", None)
    if not r.get("inf"): r.pop("inf", None)
    if not r.get("lab"): r.pop("lab", None)

MAT = {
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

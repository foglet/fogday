import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root/"data/content.json").read_text(encoding="utf-8"))
# Stable lesson numbers, oldest first (#1 = her first Short). Frozen in data/numbers.txt so they never shift;
# new Shorts get the next number. shorts.txt lists newest first, so a higher crawl index means older.
numf = root/"data/numbers.txt"
nums = {}
if numf.exists():
    for line in numf.read_text(encoding="utf-8").splitlines():
        if line.strip(): i, no = line.split("|"); nums[i] = int(no)
new = sorted([r for r in data["items"] if r["k"]=="short" and r["id"] not in nums], key=lambda r: -r["n"])
for r in new: nums[r["id"]] = max(nums.values(), default=0) + 1
if new or not numf.exists():
    numf.write_text("".join(f"{i}|{no}\n" for i, no in sorted(nums.items(), key=lambda x: x[1])), encoding="utf-8")
for r in data["items"]:
    if r["id"] in nums: r["no"] = nums[r["id"]]
# drop fields the page does not use
for r in data["items"]:
    r.pop("n", None)
    if not r.get("inf"): r.pop("inf", None)
    if not r.get("lab"): r.pop("lab", None)

MAT = {
 # Paraphrased from mandarininsights.com (home page), 2026-11-14.
 "bio": [
  "Dr. Hanyu Jia teaches Mandarin online and holds a PhD in applied linguistics from the University of Arizona.",
  "Her lessons are built around real situations: getting something done in Chinese, with pronunciation, tones, grammar and core words taught along the way. More than 500 students have learned with her.",
  "Her goal for learners is to speak Chinese with confidence and adapt it to everyday life, not just pass a test.",
 ],
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
  {"name":"mandarininsights.com","label":"Website","url":"https://www.mandarininsights.com/"},
 ],
}
html = (root/"template.html").read_text(encoding="utf-8")
html = html.replace("/*DATA*/", json.dumps(data, ensure_ascii=False, separators=(",",":")).replace("</", "<\\/"))
html = html.replace("/*MATERIALS*/", json.dumps(MAT, ensure_ascii=False, separators=(",",":")).replace("</", "<\\/"))
out = root.parent/"index.html"
out.write_text(html, encoding="utf-8")
print(out, len(html.encode()))

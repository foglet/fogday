"""Classify Dr. Jia's 417 videos into level / section / topic / series.
Rules are keyword-based; OVERRIDES pin anything the rules get wrong."""
import json, re, sys

rows = []
for line in open(sys.argv[1], encoding="utf-8"):
    i, vid, views, title = line.rstrip("\n").split("|", 3)
    rows.append(dict(i=int(i), id=vid, v=views, t=title, kind="short"))

LONG = [
 ("Nqk-B2uWMV8","4:57","So Many of You Struggled with This: How to Pronounce “chu” vs “qu” Correctly","1.8K"),
 ("Fz_u7EjVvY8","9:29","“You Gained Weight!” Why Chinese People Say Things Americans Never Would (4 Cultural Differences)","339"),
 ("3xztZOegpr4","9:16","Applied Linguist & Chinese Teacher Breaks Down The Big Bang Theory's Chinese","260"),
 ("9GfLt5nhUPI","10:28","8 Useful Phrases (Beginner) for Describing Feeling Sick with Handwriting in ASMR","317"),
 ("MemEjBk0ojY","10:22","The Most CONFUSING Word in Chinese? Master 9 Functions of 要 (yào)","2.5K"),
 ("bIIfrJehjWc","8:06","The Complete Guide to Mid-Autumn Festival: Vocabulary, Greetings, Small Talks & Invitations","139"),
 ("DIZcFgiRSXg","8:44","A Chinese Lesson You Can't Skip | How to Call Emergency Services in China",""),
 ("alWVsizi0vc","7:31","How to Use A-Not-A Questions in Mandarin Chinese: 去不去？好不好？Finally Explained!",""),
 ("peASp0RVuBI","9:51","Ask Questions Correctly in Chinese: Question Particles 吗(ma) 呢(ne) 吧(ba) Made Easy",""),
 ("zNBn3Ho7KpY","10:19","Chinese Grammar & Phrases: 来都来了 + [Verb 都 Verb 了] Explanations, Drills & Everyday Scenarios",""),
 ("d18dKRykJ8c","15:08","Seven Small Talk Topics in Chinese: Sample Questions and Responses",""),
]
for n,(vid,d,t,v) in enumerate(LONG):
    rows.append(dict(i=1000+n, id=vid, v=v, t=t, kind="long", d=d))

def has(t, *ws): return any(w.lower() in t.lower() for w in ws)

# ---- section + topic -------------------------------------------------------
def section(r):
    t = r["t"]
    if has(t,"Precision Mandarin","masterclass","webinar","free guide","30 day plan"): return ("materials","Courses & events")
    if has(t,"tone perception","homophone","HSK","challenge","quiz","what did I say","test your","conversation test",
           "can you catch","in 5 seconds","Can you hear","Can you read","Can you answer","Can you identify","Can you names","Numbers Challenge"):
        if has(t,"tone"): return ("drills","Tone ear training")
        if has(t,"homophone"): return ("drills","Homophone listening")
        if has(t,"HSK"): return ("drills","HSK quizzes")
        return ("drills","Listening challenges")
    if has(t,"tone","pinyin","pronounc","sound","“e”","“i”","ji qi xi","yue","“yu”","sh ","humming","SINGING","Chinese ears","Shanghai","cui wrong"," ing ","an ang","chu"):
        if has(t,"tone","humming","SINGING"): return ("pron","Tones")
        if has(t,"pinyin"): return ("pron","Pinyin spelling rules")
        return ("pron","Sounds")
    if has(t,"listening","struggle","effort","stop learning","collecting","comprehensible","frustration","worries","fix ONE",
           "falls apart","fall apart","freeze when","The practice every","more fun","Breakthroughs","textbook vs","viral","authentic Chinese","professionals"):
        return ("tips","Study strategy")
    if has(t,"idiom","slang","马马虎虎","996","007","社畜","gen z","too cow","Culture","culture","dinner rule","weight","cheers","Teachers’ Day",
           "Restaurants in China and","Lucky and unlucky","Insults","Big Bang","Mid-Autumn","year end","new year","Christmas","Holidays","poetic","begged","explode","来都来了"):
        if has(t,"idiom","马马虎虎","emotions. Learn Chinese Idiom"): return ("culture","Idioms (成语)")
        if has(t,"slang","996","007","社畜","gen z","too cow","begged","explode","来都来了"): return ("culture","Slang & internet speak")
        if has(t,"new year","Christmas","Holidays","Mid-Autumn","Teachers’ Day","year end"): return ("culture","Holidays & festivals")
        return ("culture","Culture & etiquette")
    if has(t,"grammar","pattern","particle","了","要","得","都","没有","不 +","不(bù)","不会","negative","tense","Turn Statements","哪","“De”","的","再","又",
           "agains","still doing","not yet","more and more","看见","action vs result","prepositions","来 and 去","A-Not-A","everyone, someone","copy-and-paste",
           "Pronouns","can” wrong","二 er","time words","Very Busy","softer Chinese questions","yes/no in Chinese","和"):
        return ("grammar","Grammar & patterns")
    if has(t,"Words","words","Number","number","Month","Colors","measure word","Opposite","opposite","Adjectives","character","五官","hands","Tastes",
           "cook","kinship","Kinship","Uncle","country names","Job Titles","directional","compass","前qian","up” and “down","开关","brands","Pepsi","Coca","car names","Chinese” in Chinese","word structure","机","电"):
        return ("vocab","Vocabulary & word building")
    # everyday phrases buckets
    if has(t,"greet","hello","你好","goodbye","再见","walk slowly","nice to meet","how are you","name","Long time","Excuse me, coming","introduce","head out","let’s go","leave a party","excuse yourself"):
        return ("phrases","Greetings & goodbyes")
    if has(t,"sorry","apolog","thank","xie xie","xiexie","gratitude","compliment","courtesy","polite","Polite","Bother","blessings","warm phrases","impress","charm","请","wait a moment","strangers","attention"):
        return ("phrases","Politeness, thanks & apologies")
    if has(t,"understand","clarification","repeat","slowly","how to say this","I see","not sure","Don’t Know","learning Chinese","what is this","What is this","pause button"):
        return ("phrases","When you don't understand")
    if has(t,"feel","Feel","emotion","Emotion","bad news","disappointing","surprising","reaction","react","no way","agree","attitude","overthinking","calm","encourag","got this","forget it","game over","makes sense","finally","差点儿","speak of the devil","if I had known","less urgent","put down your heart","doesn’t matter","embarrassed","stronger","It Depends","nosy","decide","scam","ultimate intensifier"):
        return ("phrases","Feelings & reactions")
    if has(t,"small talk","conversation","make plans","another day","status updates","awkward","what are you doing","flowing","most useful","useful questions","tell me everything","How Long","weird"):
        return ("phrases","Conversation & small talk")
    if has(t,"eat","dinner","bill","order","Restaurant","food","Food","WiFi","seat"):
        return ("phrases","Eating out")
    if has(t,"shop","bargain","Pay","pay","checkout","check out","store","salespeople","Grocery","clothes","Looking for something"):
        return ("phrases","Shopping & money")
    if has(t,"Apartment","Rent","hotel","Household","Morning Routines","chores"):
        return ("phrases","Home & daily life")
    if has(t,"direction","taxi","airport","lost","restroom","Bathroom","flight","trip","Trip","China","travel","Travel","crowd","time is it","safe"):
        return ("phrases","Travel & getting around")
    if has(t,"emergency","police","well","Sick","help"):
        return ("phrases","Emergencies & help")
    if has(t,"Phone","phone","wrong number"):
        return ("phrases","Phone calls")
    return ("phrases","Essential phrases")

# ---- level ----------------------------------------------------------------
ADV = ["idiom","Idiom","slang","Slang","996","007","社畜","gen z","Big Bang","Insults","formal","Formal","year end","poetic","马马虎虎","speak of the devil","if I had known","Applied Linguist","professional"]
INT = ["intermediate","grammar","Grammar","particle","了","要","得","都","再","又","agains","看见","action vs result","not yet","still doing","more and more",
       "time words","tense","prepositions","pattern","不会","listening","Listening","homophone","Homophone","tone","Tone","pinyin","Pinyin","word structure",
       "literal","brands","Pepsi","Coca","car names","culture","Culture","nosy","attitude","awkward","weird","embarrassed","overthinking","explode","begged",
       "too cow","来都来了","dinner rule","cheers","charm","impress","sincere","HSK 2","flowing","pause button","decide","It Depends","Apartment","Rent",
       "Tastes in Chinese Part 3","Tastes in Chinese Part 4","measure word","Measure","ultimate intensifier","less urgent","put down your heart","game over","scam","copy-and-paste","yes/no in Chinese","authentic"]
def level(r, sec):
    t = r["t"]
    if has(t,"beginner","Beginner","HSK 1","Day","/30","(1/30)","Survival","survival","Basics","basic","Basic","Easy","easy","essential","Essential"): return "beginner"
    if sec[0]=="culture" and sec[1] in ("Idioms (成语)","Slang & internet speak"): return "advanced"
    if any(w in t for w in ADV): return "advanced"
    if any(w in t for w in INT): return "intermediate"
    return "beginner"

# ---- explicit labels Dr. Jia uses (sub-levels) ------------------------------
def labels(t):
    out=[]
    if "HSK 1" in t: out.append("HSK 1")
    if "HSK 2" in t: out.append("HSK 2")
    if re.search(r"low-intermediate", t, re.I): out.append("Low-intermediate")
    elif re.search(r"beginner and intermediate|beginners and intermediate|beginner and low", t, re.I): out.append("Beginner + intermediate")
    elif re.search(r"\bbeginner", t, re.I): out.append("Beginner")
    return out

# ---- series ---------------------------------------------------------------
DAY_INFERRED = {300:8, 298:10, 296:11, 294:12, 292:14, 290:16, 280:26, 279:27, 277:29}
SERIES = [
 ("survival30","30-Day Survival Chinese","Her November challenge: one phrase a day, Day 1 to Day 30."),
 ("apartment","Apartment Hunting in China","Four parts, from rooms to contracts."),
 ("tastes","Tastes in Chinese","Four parts on describing flavor."),
 ("help","Asking for Help","Four short parts."),
 ("kinship","Family & Kinship Terms","Uncles, aunts, parents, grandparents, siblings."),
 ("numbers","Numbers from 1 to Huge","Tens, hundreds, thousands, units, then the challenge."),
 ("yao","The 9 Functions of 要 (yào)","Her most-returned-to word, plus the long video."),
 ("opposites","Opposites","Adjective pairs, ending with an HSK 1 quiz."),
 ("wordbuild","How Chinese Words Are Built","Literal meanings: 机, 电, animals, food, brands."),
 ("smalltalk","Small Talk","Starters, topics, and why it gets personal."),
 ("jobs","Jobs & Introductions","Names, job titles, introducing your job."),
 ("countries","Countries","Two parts on country names."),
]
def series(r):
    t, i = r["t"], r["i"]
    m = re.search(r"\(?Day ?(\d+)/(?:30|10)\)?|\((\d+)/30\)", t)
    if m: return ("survival30", int(m.group(1) or m.group(2)), False)
    if i in DAY_INFERRED: return ("survival30", DAY_INFERRED[i], True)
    if "Apartment" in t or "Apartment hunting" in t:
        return ("apartment", int(re.search(r"Pt (\d)", t).group(1)), False)
    if "Tastes in Chinese" in t:
        m = re.search(r"Part (\d)", t); return ("tastes", int(m.group(1)) if m else 1, False)
    if re.search(r"ask(ing)? for help in Mandarin Chinese Part", t, re.I):
        return ("help", int(re.search(r"Part (\d)", t).group(1)), False)
    if "Uncle/Aunt" in t: return ("kinship",1,False)
    if "kinship terms part 2" in t.lower(): return ("kinship",2,False)
    if "kinship terms part 3" in t.lower(): return ("kinship",3,False)
    if "country names" in t.lower(): return ("countries", 2 if "part 2" in t.lower() else 1, False)
    if "Job Titles" in t: return ("jobs", 2 if "Part 2" in t else 1, False)
    if "introduce your job" in t: return ("jobs",3,False)
    if "introduce your name" in t: return ("jobs",0,False)
    order = {"10, 20, 30":1,"100, 200":2,"1000, 2000":3,"Number Units":4,"Huge Numbers":5,"hand gestures":0,"二 er and 两":6}
    for k,v in order.items():
        if k in t: return ("numbers",v,False)
    if re.search(r"要", t): return ("yao", -i if r["kind"]=="short" else 99, False)
    if re.search(r"[Oo]pposite", t): return ("opposites", -i, False)
    if has(t,"word structure","机","electric电","brands","Pepsi","Coca","car names","Words Make So Much Sense","words just make sense"): return ("wordbuild", -i, False)
    if has(t,"small talk"): return ("smalltalk", -i if r["kind"]=="short" else 99, False)
    return None

out=[]
for r in rows:
    sec = section(r)
    lv = level(r, sec)
    s = series(r)
    rec = dict(id=r["id"], t=r["t"], v=r["v"], k=r["kind"], lv=lv, sec=sec[0], top=sec[1], lab=labels(r["t"]), n=r["i"])
    if r["kind"]=="long": rec["d"]=r["d"]
    if s: rec["ser"], rec["ord"], rec["inf"] = s[0], s[1], s[2]
    out.append(rec)

# overrides: index -> (level, section, topic) ; None keeps the computed value
OV = {}
for line in open(sys.argv[2], encoding="utf-8"):
    line=line.strip()
    if not line or line.startswith("#"): continue
    i, lv, sec, top = (line.split("|")+[""]*4)[:4]
    for rec in out:
        if rec["n"]==int(i):
            if lv: rec["lv"]=lv
            if sec: rec["sec"]=sec
            if top: rec["top"]=top

json.dump(dict(items=out, series=[dict(id=a,name=b,blurb=c) for a,b,c in SERIES]), open(sys.argv[3],"w",encoding="utf-8"), ensure_ascii=False)
if len(sys.argv)>4:
    from collections import Counter
    for key in ("lv","sec"): print(key, Counter(r[key] for r in out))
    print("topics", Counter((r["sec"],r["top"]) for r in out))
    print("series", Counter(r.get("ser") for r in out))
    for s in sorted(out, key=lambda r:(r["sec"],r["top"],r["lv"])):
        print(f'{s["n"]:>4} {s["lv"][:3]} {s["sec"]:<8} {s["top"][:22]:<22} {s.get("ser","") or ""} {s["t"][:80]}')

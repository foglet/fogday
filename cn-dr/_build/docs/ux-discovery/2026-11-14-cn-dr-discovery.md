# UX Discovery Document: Mandarin Insights app (fogday.com/cn-dr)
**Date**: 2026-11-14
**Author**: Fogfish + UX Superpowers
**Status**: Draft, for review

> Evidence note: there is no user research and the app is not linked anywhere yet. Everything labeled *Assumption* is a hypothesis. Facts labeled *Verified* come from `template.html` and `content.json` in foglet/fogday.

---

## 1. Problem Brief
- **Problem**: A new Mandarin learner who finds Dr. Jia through one Short has no beginner path and no sense of progress. *(Assumption)*
- **Affected users**: New learners, primarily. Returning followers, secondarily.
- **Current alternatives**: The YouTube Shorts feed. Dr. Jia has **no YouTube playlists** *(Verified by Fogfish)*, so this app is the only ordered path through her lessons.
- **Why they fail**: The feed serves videos in random order, with no "start here", no "next", and no progress.
- **Scope**: Improvement to an existing, unlaunched app. The goal is to simplify its structure.

**Verified structural problems in the current app:**
1. "Courses" means two things: the Courses tab holds the free video series, while Materials has "Courses with Dr. Jia" (her paid classes).
2. The same content lives in two places: series in Learn *and* Courses, drills in Learn *and* Practice.
3. Learn opens to a level picker over collapsed accordion cards, with no entry point.
4. Search is a fifth view, reached from a header icon, outside the four tabs.
5. "Beginner" holds 292 of the 417 lessons (70%), too many to work as a path.

## 2. Personas

### Primary: The Short-Scroller Starter
- **Role & context**: An adult English speaker with zero or minimal Mandarin who found Dr. Jia through one Short.
- **Behavior**: Watches whatever comes next. Likes a lesson, can't find the one before or after it, and loses the thread.
- **Goals**: Know the next lesson to watch (functional), feel progress rather than just scrolling (emotional), say real phrases to a Chinese-speaking friend (social).
- **Frustrations**: No order, no "you are here", and no way to tell a video's level before watching it.
- **Context**: A phone, 2–10 minute sessions, often one-handed. Videos play in an embedded player inside the app.
- **Quote**: "I liked that one. What do I watch next?"
- **Evidence**: *Assumption, needs validation.*

### Secondary: The Returning Follower
- **Role & context**: Already watches Dr. Jia and wants to find or review a specific lesson.
- **Need**: Fast search by word, pinyin or English meaning.
- **Evidence**: *Assumption, added at Fogfish's request.*

## 3. Jobs to Be Done
Opportunity = Importance + (Importance − Satisfaction). The scores are my estimates.

| # | Job | Imp | Sat | Opp |
|---|---|---|---|---|
| **A (primary)** | When I've just found Dr. Jia and know no Mandarin, I want to be told the first lesson and the next one, so I can start without planning. | 9 | 2 | **16** |
| B | When I come back after a few days, I want to pick up where I left off, so I keep my momentum. | 8 | 4 | 12 |
| C | When I've watched a few lessons, I want to see how far I've come and what's ahead, so I feel I'm progressing. | 7 | 3 | 11 |
| D | *(Follower)* When I half-remember a phrase, I want to find that lesson fast, so I can review it. | 7 | 5 | 9 |

- **Emotional job**: feel guided, not overwhelmed.
- **Social job**: be able to use a phrase with someone else soon.
- **Key insight**: the app is organized like a library, and a new learner needs a guided path.

## 4. User Journey Maps

### Current state (simulated, assuming the link sits in Dr. Jia's bio)
| Phase | What happens | Feeling | Pain |
|---|---|---|---|
| Arrive | Taps the bio link and lands on Learn | Curious | A level picker and closed cards; no "start here" |
| Choose | Picks Beginner and opens a card | Confused | 292 lessons, no order |
| Watch | Taps a lesson, which plays in the in-app player | Neutral | Next lesson follows whatever list they came from, not a learning order |
| Return | Comes back and taps around | Lost | No "continue". Review is under Practice |
| Explore | Opens Courses, then Materials | Confused | Double "Courses"; duplicated series and drills |

**Moments of truth**: the first 10 seconds after arriving, and the return visit days later.
**Preserve**: Mark done, Next lesson, the drills, and the review queue (lessons marked done more than a day ago resurface, oldest first).

### Desired state (approved structure)
| Area | What it does | Replaces |
|---|---|---|
| **Home** | One card: "Day N of 30" with ▶. Shows "Start" on the first visit and "Continue" after that. Hands off to the next path after Day 30. | Learn's landing |
| **Library** | All 417 lessons by level and topic. Search sits in the header. | Learn sections, Courses tab, search view |
| **Practice** | Drills plus Review, unchanged. | Practice (drills no longer repeated in Learn) |
| **About Dr. Jia** | Paid classes, free guides, long lessons, How to Study, Follow. | Materials |

**Path spine**: *30-Day Survival Chinese* is Dr. Jia's own Day 1–30 series, all beginner. **9 of the 30 positions are inferred** by the classifier rather than read from a "Day N" title *(Verified)*. Fogfish accepted the inferred order on 2026-11-14 (Days 8, 10, 11, 12, 14, 16, 26, 27, 29).

### Gap analysis
| Gap | Priority |
|---|---|
| Home "Start here / Continue" card on the 30-day spine | High |
| One home for every item; rename Materials and drop the double "Courses" | High |
| Return visit: reopen last tab used; Continue lives on Home | Decided |
| Search moved into the header | Medium |
| Visual polish | Low |

## 5. Success Metrics & Telemetry
**Tool**: GoatCounter (cookieless, free, no consent banner). It counts events, not people, so every metric below is a ratio of event counts.

### North Star
- **Metric**: Path carry-through = Day 7 opens ÷ Day 1 opens, over a rolling 30 days.
- **Baseline**: Unknown; the path doesn't exist yet.
- **Target**: ≥ 25% at 6 months. *(Guess: replace it with the real baseline after the first 30 days.)*
- **Why**: It shows learners are following a sequence, not sampling one video.

### Input metrics (leading)
| Metric | Predicts |
|---|---|
| Home ▶ taps ÷ /cn-dr pageviews | Whether the first screen does its job |
| Share of lesson opens that come from Home | Whether the path is the main way people use the app |
| Mark-done events per path day | Engagement depth |

### Health metrics (guard rails)
| Metric | Guards against | Alert if |
|---|---|---|
| Searches with zero results ÷ all searches | The follower's search breaking | > 20% |
| About → paid-class clicks | Dr. Jia's funnel getting buried by the restructure | Drops vs. first-month level |
| Library opens | The path crowding out browsing | Near zero |

### Events (no PII, no cookies)
| Event path | Trigger | Answers |
|---|---|---|
| `cn-dr/ev/open/{home\|library\|search\|practice}/{day?}` | Lesson tapped | Where do lesson opens come from? |
| `cn-dr/ev/done/{day?}` | Mark done | Are learners finishing? |
| `cn-dr/ev/search/{hit\|miss}` | Search submitted (the query text is *not* sent) | Does search work? |
| `cn-dr/ev/about/{target}` | About link tapped | Is the business funnel healthy? |

### Qualitative
| Signal | Method | Cadence |
|---|---|---|
| Learner reactions | Comments on the Short that announces the link | First 2 weeks |
| Dr. Jia's view | Ask her to use Home for 3 days | Before launch |

### Response plan
| Metric | Improving | Flat | Declining |
|---|---|---|---|
| Carry-through | Add the next path after Day 30 | Check where the drop happens; re-order the inferred days | Rethink the spine (e.g. start with tones) |
| Home ▶ rate | Keep | Change the card copy | Test a bigger card or autoplay preview |

## 6. Design Principles
1. **One next step.** The first screen answers "what do I watch?"
   - *Because*: job A has the top opportunity score (16).
   - *Means*: a single primary ▶ on Home.
   - *Not*: a level picker or collapsed menus as the landing.
2. **Every item has one home.**
   - *Because*: series and drills are currently duplicated.
   - *Means*: each lesson appears once in the navigation, though search and Review can still point to it.
   - *Not*: the same card in two tabs.
3. **Her order beats our classifier.** Use Dr. Jia's own sequence wherever it exists.
   - *Not*: keyword-guessed ordering on the path, except the 9 days Fogfish accepted on 2026-11-14.
4. **Built for coming back.** Sessions are short and days apart. The app reopens on the last tab used (Fogfish's call, 2026-11-14), and Continue is one tap away on Home.
5. **Don't bury the business.** Her paid classes stay one tap away, under About.

## 7. Assumptions & Risks
**Validated**: no YouTube playlists exist (Fogfish). The app is not linked yet (Fogfish). Structural problems 1–5 above are verified in the code.

**Unvalidated**
| Assumption | Validate by | Risk if wrong |
|---|---|---|
| Most visitors are total beginners | YouTube Studio audience data | The spine is too basic for most |
| Phone, short sessions | GoatCounter device split | Layout priorities are wrong |
| Phrases-first beats tones-first for a start | Dr. Jia's opinion | Higher early drop-off |
| Learners come back on later days | Continue taps ÷ Home visits | The path stalls on Day 1 |

**Risks**
| Risk | L | I | Mitigation |
|---|---|---|---|
| The 9 inferred Day positions are wrong | Med | Low | Accepted as guessed (Dr. Jia not confirming). Each day is a standalone phrase, so a wrong slot costs little. Fix in `overrides.txt` if she objects |
| Progress lives only in localStorage and is lost when browser data is cleared or on a new device | Med | Low | Accept for v1; note it on Home |
| The 30-day path ends with no next step | High | Med | Define path 2 (e.g. beginner grammar) soon after launch |

## 8. Constraints & Boundaries
- **Technical**: single-file static app on GitHub Pages. Data is rebuilt via `classify.py` → `build.py`. No backend or accounts.
- **User**: mobile-first, short sessions, video plays in an embedded youtube-nocookie player.
- **Business**: Dr. Jia's content and brand; her paid classes must stay visible.
- **In scope**: the four-area restructure, the Home path card, header search, renaming, de-duplication, and GoatCounter events.
- **Out of scope**: accounts or sync, reclassifying all 417 lessons, and visual redesign.
- **Future**: paths 2 and 3, and a progress view (job C).

## 9. Research Summary
No raw research data was provided. Next steps include a light validation pass.

## 10. Recommended Next Steps
- [x] Inferred Day positions accepted as guessed (2026-11-14)
- [ ] Ask Dr. Jia: phrases-first or tones-first for the beginner spine?
- [ ] Pull YouTube Studio audience and traffic-source data (5 minutes) to test the persona
- [x] Restructure shipped 2026-11-14: Home path card, Library (absorbs Courses tab, drills only in Practice), About Dr. Jia, Classes rename
- [x] Player, 30-dot progress, Follow icons, and flat section rows that open pages (accordions removed), 2026-11-14
- [ ] Add GoatCounter with the 4 event types
- [ ] Launch the link in her bio, then set the North Star baseline after 30 days

---
# AI Literacy Week, May 2026. One Markdown file per event; the rules are in src/content.config.ts.
# Date, time and place were confirmed by Cayden Auyang ’27 on 2026-09-29. The "date", "time" and
# "place" fields below are what the pages print in their fact rows (cover, /events/, home, credits).
# "audience" is printed once, in the credits' "Run by" row.
# Some sentences repeat the place, the day or the month in words. If the place or the date ever
# changes, fix these too:
#   - the place ("VISTA Hamilton Hub"): summary, statement, cover.caption, and the four
#     ai-literacy-week-hall-* captions in src/data/media.json;
#   - the day ("Sunday"): summary, teaser, statement, challenges[2].label;
#   - the month ("May 2026"): statement, the hall-* captions in src/data/media.json, the
#     "AI Literacy Week" line in src/data/timeline.json, and "Six months after that first
#     meeting" on the About page (src/components/about/Started.astro; the first meeting was
#     November 2025).
# Photo captions name the moment or the talk, never a person. "people" stays empty until names
# are confirmed (when filled, "With …" is printed under that photo's caption). The Day 1 results
# crop is never used (see MEDIA-IDS.md).
slug: "ai-literacy-week"
title: "AI Literacy Week"
date: "2026-05-17"
time: "3:30–5 PM"
place: "VISTA Hamilton Hub"
audience: "Open to all Pomfret students and faculty."
partner:
  name: "AI Youth Alliance"
  line: "AI Youth Alliance provided some of the materials, and the club wrote its own challenges and shared its findings back with them. They will also help the club reach more local organizations."
summary: "Two AI challenges by email, then a Sunday afternoon of results, talks, a live demo and a closing game in the VISTA Hamilton Hub."
teaser: "Two challenges by email, then one Sunday afternoon for the whole school."
statement: "In May 2026 the club ran AI Literacy Week for the whole school. Two challenges went out by email, one a day. The third was a live game on Sunday afternoon, when we met in the VISTA Hamilton Hub to share what came back."
cover:
  media: "ai-literacy-week-hall-16x9"
  phone: "ai-literacy-week-hall-4x5"
  caption: "A faculty talk in the VISTA Hamilton Hub: the internet, from the mid-2000s onward."
# The home page's "Latest event" photo (no caption there: the teaser's words sit beside it).
card:
  media: "ai-literacy-week-hall-3x2"
# The /events/ list's frame: a thin 21:9 band of the same moment on laptops and landscape
# tablets, so clicking it visibly grows it into the taller 16:9 cover (phones and upright tablets
# get the 4:5 crop, like the cover).
feature:
  media: "ai-literacy-week-hall-21x9"
  phone: "ai-literacy-week-hall-4x5"
challenges:
  - label: "Challenge 1 · By email"
    title: "Describe the Faculty"
    line: "Can AI draw a real Pomfret faculty member from words alone? Part 1 used a text-only prompt. Part 2 added a reference photo and ran it again, to compare."
  - label: "Challenge 2 · By email"
    title: "Test the Reasoning"
    line: "Three short reasoning questions, run against the AI model of your choice."
  - label: "Challenge 3 · Live on Sunday"
    title: "The Final Round"
    line: "The closing game at the main event. Three categories, three rounds."
    live: true
    link: { label: "How it worked", href: "#final-round" }
challengeNote:
  label: "How the first two worked"
  text: "Each took about 5–10 minutes. Paste the club’s prompt into the AI model of your choice, then submit your answer on a Google Form."
program:
  - title: "What We Learned From You"
    speakers: [{ name: "Cayden Auyang", classYear: 2027 }]
    line: "The results from Days 1 and 2, then the three you’ve probably used: ChatGPT (OpenAI), Claude (Anthropic) and Gemini (Google). Same family, different strengths."
    link: { label: "What we learned", href: "#findings" }
  - title: "AI Tools: Beyond Chatbots"
    speakers: [{ name: "Luke Ryan", classYear: 2027 }]
    line: "NotebookLM, Cursor and Claude Design, then a live demo that built a ten-slide deck from one prompt."
    sheet:
      before:
        media: "ai-literacy-week-demo-3x2"
        phone: "ai-literacy-week-demo-1x1"
        label: "The prompt"
        caption: "“Make a slide deck for an Oyster Farm business on Block Island that focuses on sustainability. …”"
        note: "The live Claude Design demo started from one typed prompt."
      after:
        media: "ai-literacy-week-deck-3x2"
        phone: "ai-literacy-week-deck-1x1"
        label: "The deck it built"
        caption: "Ten slides from that one prompt."
        note: "AI-generated demo content: the oyster farm and every detail in the deck are invented placeholders."
  - title: "Future of AI"
    speakers: [{ name: "Jay Youm", classYear: 2026, role: "alumni advisor" }]
    line: "Where AI is heading, from Mars rovers to cancer treatment."
    plates:
      - { media: "ai-literacy-week-lectern-4x5", caption: "At the lectern for the Future of AI talk." }
      - { media: "ai-literacy-week-future-3x2", caption: "Mid-talk, under the slides." }
  - title: "The Final Round"
    role: "Challenge 3, played live"
    line: "The closing game, and the week’s third challenge. Three categories, three rounds."
    anchor: "final-round"
    game:
      categories: ["Countries with four letters", "Body parts with three letters", "Periodic-table elements of five letters or fewer"]
      rounds:
        - { title: "Pure recall", rule: "No phones, no AI." }
        - { title: "AI as coach", rule: "The AI may only give hints, never answers." }
        - { title: "Learning check", rule: "Phones away. Fresh recall." }
      question: "Did the AI actually teach you anything?"
  - title: "Awards and pizza"
    line: "Awards for the most involved participants across the week. Pizza for everyone."
  - title: "A faculty talk"
    role: "Faculty"
    numbered: false
    line: "On the internet from the mid-2000s onward: creators versus users, then social media. Pictured at the top of this page."
findings:
  - day: "Day 1"
    title: "Describe the Faculty"
    compare:
      - { label: "Part 1", text: "Words only." }
      - { label: "Part 2", text: "The same words, plus a reference photo." }
    result: "Across nearly every submission, adding a reference photo made the image noticeably more accurate."
    notes: ["One submission rated it less accurate.", "One model refused to generate a person."]
    quote: "What you give the AI matters as much as what model you pick."
  - day: "Day 2"
    title: "The question every model failed"
    question: "The car wash is 50 meters away. Should I walk or drive there?"
    result: "Every model, across three companies, advised walking."
    because: "A car wash is for the car."
    quote: "AI doesn’t actually understand context the way you do. It pattern-matches on the words you give it."
    stage: { strike: "walk", mark: "drive" }
  - day: "Day 2"
    title: "Sally’s sisters"
    question: "Sally has 3 brothers. Each of her brothers has 2 sisters. How many sisters does Sally have?"
    result: "Every model got it right."
    notes: ["Well-defined logic is where AI is sharp."]
  - day: "Day 2"
    title: "The coin puzzle"
    setup: "Three labeled boxes, and exactly one label is true."
    result: "The models disagreed, even with themselves."
    notes: ["One Claude run flagged a likely typo in the puzzle itself."]
takeaways:
  - title: "Context beats cleverness."
    line: "What you give the AI matters as much as what model you pick. Add references. Add examples. Be specific."
    from: 1
  - title: "Common sense is still on you."
    line: "AI pattern-matches on words. It doesn’t understand purpose. The car wash test proved that across every model."
    from: 2
  - title: "Same model, different answers."
    line: "Three Claude runs of the same puzzle gave three different answers. Don’t take the first response as truth."
    from: 4
closing:
  media: "ai-literacy-week-audience-3x2"
  phone: "ai-literacy-week-audience-1x1"
  caption: "Watching from the sofas, pizza boxes behind."
# More rows for the credits, after "Run by" (which is written from "audience" above).
credits:
  - { key: "Speakers", value: "Cayden Auyang ’27, Luke Ryan ’27, Jay Youm ’26 (alumni advisor) and a member of the faculty." }
public: true
order: 1
---

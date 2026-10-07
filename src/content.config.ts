// content.config.ts: the rules every case file must follow.
//
// Each club case (A to E) is one Markdown file in src/content/cases/. The part between the
// two "---" lines at the top of the file (the "frontmatter") holds the facts: the case letter,
// the client office, who built it, what the chore was, which video clips to show, and so on.
// This file describes those fields. When the site builds, Astro checks every case file against
// these rules, and stops with a clear message if something is missing or misspelled.
//
// The pages read the checked data with getCollection('cases') (see src/lib/cases.ts).
// To add a case, copy an existing file, change the facts, and follow README.md.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A person in a case's credits. The class year is the full year (2027), and the site prints
// it as ’27. "role" is only for someone whose job differs from "developer", e.g. an advisor.
const person = z.object({
  name: z.string().min(1),
  classYear: z.number().int().min(2000).max(2100).optional(),
  role: z.string().optional(),
});

// One row of "The fix" on a case page: a short label on the left and a sentence on the right.
const keyValue = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

// The ids of this case's video clips in src/data/media.json. Every id is optional, because a
// case can go live before its footage is ready; the page then shows a typed placeholder.
// Naming rule (see MEDIA-IDS.md): "<slug>-hero", "<slug>-scrub", "<slug>-docket",
// "<slug>-detail-1", "<slug>-detail-2".
const clips = z
  .object({
    hero: z.string().optional(),
    scrub: z.string().optional(),
    docket: z.string().optional(),
    detail1: z.string().optional(),
    detail2: z.string().optional(),
  })
  .default({});

// A caption that appears when the scroll-driven recording ("scroll is the playhead") reaches a
// moment in the clip. "t" is the time in seconds from the start of the scrub clip.
const beat = z.object({
  t: z.number().nonnegative(),
  text: z.string().min(1),
});

const cases = defineCollection({
  // Read every .md file in src/content/cases/.
  loader: glob({ pattern: '*.md', base: './src/content/cases' }),
  schema: z
    .object({
      // The case letter shown in huge type (A to E).
      letter: z.enum(['A', 'B', 'C', 'D', 'E']),
      // The page address: /cases/<slug>/. Lowercase letters, numbers and dashes only.
      slug: z.string().regex(/^[a-z0-9-]+$/),
      // The tool's name, e.g. "AutoPlanner".
      title: z.string().min(1),
      // The client, by office only. Never a faculty member's name.
      office: z.string().min(1),
      // How the office reads inside a sentence, for the credits ("Built by ... for the Music
      // Department."). Leave it out to get "the " + office; write it out when that reads wrong,
      // e.g. "teaching faculty".
      officeIn: z.string().optional(),
      // The students (and advisors) who built it, in credit order. This is the "Built by" credit.
      // For an open case with nothing built yet (Case E), the home page labels it "Team" instead.
      team: z.array(person).default([]),
      // This school year's case team, shown as its own labeled line ("Team this year: ...") on the
      // case page and on the home page. It is kept apart from "team" on purpose: "team" says who
      // built the tool, and new members haven't built it. Leave it out to show no line.
      currentTeam: z.array(person).default([]),
      // Where the case stands today, in a few words, e.g. "Phase 1 built".
      status: z.string().min(1),
      // True shows the crimson "in progress" dot next to the status.
      inProgress: z.boolean().default(false),
      // The chore in one or two sentences. Put [square brackets] around the one phrase that
      // gets the crimson marker.
      chore: z.string().default(''),
      // One line saying what the tool does. Used on the home page docket.
      fix: z.string().min(1),
      // "The fix" rows on the case page.
      keyValues: z.array(keyValue).default([]),
      // What the tool runs on, e.g. ["Canvas", "Google Docs"].
      runsOn: z.array(z.string()).default([]),
      clips,
      // Where to crop the wide hero clip when it is shown in a tall 4:5 frame (phones, and
      // tablets held upright), as a CSS position: "22% 50%" keeps the part 22% of the way in from
      // the left. Leave it out to keep the middle. A 4:5 copy of the clip, when there is one,
      // is used on phones as it is.
      heroFocus: z
        .string()
        .regex(/^\d{1,3}% \d{1,3}%$/)
        .optional(),
      beats: z.array(beat).default([]),
      // Screenshots of the tool as it is used today, shown under the footage on the case page
      // (CaseStills.astro). For a case whose footage shows an earlier version (AutoPlanner's was
      // recorded from the May 2026 prototype). Each item is a "kind": "image" id in
      // src/data/media.json; its caption there is printed under it, so it must end "Demo data."
      // when it shows a tool. Leave it out to show nothing.
      stills: z
        .object({
          // The heading over the screenshots, e.g. "As delivered, October 2026."
          title: z.string().min(1),
          // One short line beside the heading.
          note: z.string().optional(),
          items: z
            .array(z.object({ media: z.string().regex(/^[a-z0-9-]+$/, 'a photo id from src/data/media.json') }))
            .min(1)
            .max(2),
        })
        .optional(),
      // The GitHub repository link, or null to hide it (Case B's stays hidden for now).
      repo: z.url().nullable(),
      // A public link to the working tool, only where it is safe to share (Case C only).
      liveUrl: z.url().optional(),
      // One short line shown next to that live link, e.g. that the site now goes by a new name.
      liveNote: z.string().optional(),
      // True builds a case page at /cases/<slug>/. False lists the case on the home page only.
      public: z.boolean(),
      // The order the cases appear in (1 first).
      order: z.number().int(),
    })
    // A public case page needs a chore and at least one row for "The fix".
    .refine((c) => !c.public || (c.chore.length > 0 && c.keyValues.length > 0), {
      message: 'A public case needs a "chore" sentence and at least one "keyValues" row.',
    }),
});

// ---- Events: one Markdown file per event in src/content/events/ ----
// Each club event (AI Literacy Week, for example) is one Markdown file, with all of its facts in
// the frontmatter and nothing in the body. The event pages (src/pages/events/) read them with
// getCollection('events') through src/lib/events.ts. To add an event, copy an existing file, change
// the facts, use photo ids that are already in src/data/media.json, and set public: true.

// A photo's id in src/data/media.json (lowercase letters, numbers and dashes).
const mediaId = z.string().regex(/^[a-z0-9-]+$/, 'a photo id from src/data/media.json');
// A CSS position like "50% 55%": which part of a photo to keep when a frame crops it.
const cssPos = z.string().regex(/^\d{1,3}% \d{1,3}%$/);
// A date written "2026-05-17" that is a real day on the calendar (so "2026-02-30" is refused
// instead of quietly turning into March 2).
const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  }, 'a real calendar day, written like "2026-05-17"');

// One photo on an event page (a "plate").
const plate = z.object({
  media: mediaId,                       // a "kind": "image" id
  phone: mediaId.optional(),            // another crop for phones (and portrait tablets for the cover)
  label: z.string().optional(),         // mono line above the caption, e.g. "The prompt"
  caption: z.string().min(1),           // the moment and the talk; never who
  note: z.string().optional(),          // a second, smaller line under the caption
  // Who is in the photo: left empty until names are confirmed. When filled, "With …" is printed
  // under the caption (withPeople in src/lib/events.ts).
  people: z.array(person).default([]),
  focus: cssPos.optional(),             // object-position when a frame crops the photo
});

// One part of the event's program (a talk, the game, the awards), in the order it is listed.
const chapter = z.object({
  // The part's name, e.g. "Future of AI".
  title: z.string().min(1),
  speakers: z.array(person).default([]),   // printed after the leader line
  role: z.string().optional(),             // printed instead of a speaker, e.g. "Faculty"
  numbered: z.boolean().default(true),     // false prints "Also" in the number column
  // One or two sentences about what happened in it.
  line: z.string().min(1),
  anchor: z.string().regex(/^[a-z0-9-]+$/).optional(),     // id for deep links, e.g. final-round
  link: z.object({ label: z.string(), href: z.string() }).optional(), // ArrowLink dir="down"
  sheet: z.object({ before: plate, after: plate }).optional(),        // the demo sheet (S2)
  // A pair of photos side by side (EventPair.astro), so none or exactly two.
  plates: z
    .array(plate)
    .refine((list) => list.length === 0 || list.length === 2, 'a chapter’s "plates" is a pair: two photos, or none')
    .default([]),
  // A game played live: its categories, its rounds (a name and the rule for each) and the
  // question it asked at the end.
  game: z.object({
    categories: z.array(z.string()).min(1),
    rounds: z.array(z.object({ title: z.string(), rule: z.string() })).min(1),
    question: z.string(),
  }).optional(),
}).refine((c) => !(c.sheet && c.plates.length), { message: 'A chapter has a sheet or plates, not both.' });

// One thing the club learned from the challenges, shown as a numbered "Exhibit".
const finding = z.object({
  day: z.string().min(1),                 // "Day 1"
  title: z.string().min(1),               // "Describe the Faculty"
  question: z.string().optional(),        // the exact words put to the models
  setup: z.string().optional(),           // a description when the question is not quoted
  // Side-by-side rows to compare, e.g. "Part 1" / "Words only."
  compare: z.array(z.object({ label: z.string(), text: z.string() })).default([]),
  // What happened, in one sentence.
  result: z.string().min(1),
  because: z.string().optional(),         // the staged finding's second verdict line
  // Smaller lines under the result.
  notes: z.array(z.string()).default([]),
  // A line from the event deck, shown in quotation marks.
  quote: z.string().optional(),
  stage: z.object({ strike: z.string(), mark: z.string() }).optional(), // S1: words in `question`
});

const events = defineCollection({
  // Read every .md file in src/content/events/.
  loader: glob({ pattern: '*.md', base: './src/content/events' }),
  schema: z.object({
    // The page address: /events/<slug>/. Lowercase letters, numbers and dashes only.
    slug: z.string().regex(/^[a-z0-9-]+$/),
    // The event's name, e.g. "AI Literacy Week".
    title: z.string().min(1),
    date: isoDay,   // QUOTE IT in YAML, or YAML turns it into a Date
    // The time as printed, e.g. "3:30–5 PM" (with an en dash).
    time: z.string().min(1),
    // Where it happened, as printed, e.g. "VISTA Hamilton Hub".
    place: z.string().min(1),
    // Who it was for, in one sentence. Printed in the credits' "Run by" row, after "The Civic AI
    // Club." (EventCredits.astro).
    audience: z.string().min(1),
    // A partner organization: its name and one or two plain sentences about what it did.
    partner: z.object({ name: z.string(), line: z.string() }).optional(),
    summary: z.string().min(1),    // index, meta description
    teaser: z.string().min(1),     // home page line
    statement: z.string().min(1),  // the opening statement
    cover: plate,                  // the event page's hero ("Plate 1")
    // The home page's 3:2 photo (falls back to the cover). No caption: the teaser shows the
    // event's name and facts beside it instead.
    card: z.object({ media: mediaId, focus: cssPos.optional() }).optional(),
    // The /events/ list's frame (a 21:9 band on laptops, "phone" on phones and upright tablets).
    // Falls back to the cover. No caption: the list shows the event's name under it instead.
    feature: z.object({ media: mediaId, phone: mediaId.optional(), focus: cssPos.optional() }).optional(),
    // The challenges of the week, in order. "live: true" marks one played at the event itself.
    challenges: z.array(z.object({
      label: z.string(), title: z.string(), line: z.string(),
      live: z.boolean().default(false),
      link: z.object({ label: z.string(), href: z.string() }).optional(),
    })).default([]),
    // One labeled row under the challenges (how they worked).
    challengeNote: z.object({ label: z.string(), text: z.string() }).optional(),
    // The parts of the event, in the order they are listed.
    program: z.array(chapter).default([]),
    // What the club learned, as numbered exhibits.
    findings: z.array(finding).default([]),
    // The event deck's takeaways. "from" is the number of the exhibit each one comes from.
    takeaways: z.array(z.object({
      title: z.string(), line: z.string().optional(), from: z.number().int().positive().optional(),
    })).default([]),
    // The full-width photo near the end of the page.
    closing: plate.optional(),
    // The credits rows at the end of the page.
    credits: z.array(keyValue).default([]),
    // True builds a page at /events/<slug>/ and lists the event. False keeps it off the site.
    public: z.boolean(),
    // Sorts events that share a date (1 first).
    order: z.number().int(),
  })
  // Only one finding can play the "proofread" moment, and its two words must be in its question.
  .refine((e) => e.findings.filter((f) => f.stage).length <= 1, { message: 'Only one finding can be staged.' })
  .refine((e) => e.findings.every((f) => !f.stage || (f.question?.includes(f.stage.strike) && f.question?.includes(f.stage.mark))),
    { message: '"stage.strike" and "stage.mark" must be words in that finding’s question.' })
  // Every finding only uses the parts its place on the page can show (EventFindings.astro), so
  // nothing typed into the file is quietly left off the page:
  //   - "because" (a second verdict line) only shows on the staged finding;
  //   - the staged finding shows its question, result, because and quote (no compare, setup or
  //     notes);
  //   - the findings after the staged one show their question or setup, result and notes (no
  //     compare or quote).
  .refine((e) => {
    const staged = e.findings.findIndex((f) => f.stage);
    return e.findings.every((f, i) => {
      if (i === staged) return !f.compare.length && !f.setup && !f.notes.length;
      if (f.because) return false;
      if (staged >= 0 && i > staged) return !f.compare.length && !f.quote;
      return true;
    });
  }, { path: ['findings'], message: 'A finding has a part its place on the page doesn’t show (see the note above this check in src/content.config.ts).' })
  // A takeaway's "from" is an exhibit number, so it can't be higher than the number of findings.
  .refine((e) => e.takeaways.every((t) => !t.from || t.from <= e.findings.length),
    { path: ['takeaways'], message: 'A takeaway’s "from" points at an exhibit that doesn’t exist (it is higher than the number of findings).' }),
});

export const collections = { cases, events };

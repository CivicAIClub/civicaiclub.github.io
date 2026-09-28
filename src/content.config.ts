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
      // The students (and advisors) who built it, in credit order.
      team: z.array(person).default([]),
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
      // The GitHub repository link, or null to hide it (Case B's stays hidden for now).
      repo: z.url().nullable(),
      // A public link to the working tool, only where it is safe to share (Case C only).
      liveUrl: z.url().optional(),
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

export const collections = { cases };

# Media ids: the clips the site expects

Every video (and photo) on the site is asked for by an **id**, never by a file path. Pages and case files name the id; `src/data/media.json` says which files belong to it. When footage is ready, add one entry to `media.json` and the placeholder on the page is replaced by the video automatically. `npm run check:media` lists every id that is still missing.

Where the ids are named:
- Case pages: each case file's `clips:` block (`src/content/cases/*.md`), plus its `beats:` (the captions of the scroll-driven clip, in seconds).
- Home page: `src/data/home.json` (the reel, the showreel, the three glances). The case dockets come from the case files.
- About page: `src/data/about.json` (the club photo, the workshop clip and the two event photos under the timeline).
- Events pages: each event file (`src/content/events/*.md`): `cover`, `card`, `feature`, the program's `sheet` and `plates`, and `closing`.

## Naming rule

`<slug>-<role>`, where `<slug>` is the case's `slug` (the part after `/cases/` in its address) and `<role>` is one of:

| Role | Shape | Length | What it's for | Where it appears |
|---|---|---|---|---|
| `hero` | 16:9, 1920×1080, plus a 4:5 phone copy (1080×1350, files `<slug>-hero-mobile.*`, in its `mobile` field) | 6–10 s loop | The case at a glance, in full color with no dark layer over it. The phone copy is reframed so the tool's UI stays readable in a 4:5 frame. | Case page hero |
| `scrub` | 16:9, 1600×900 | 9–20 s, **no loop** | "Scroll is the playhead": the scroll position drives this recording frame by frame. Encode with close keyframes and no B-frames so seeking is instant (the current clips: a keyframe every 10 frames, `-g 10 -bf 0`); H.264 only is fine. Set `"scrub": true`. | Case page scroll chapter |
| `docket` | 1:1, 1600×1600 | 4–10 s loop | Seen through the huge case letter (Host Grotesk Bold) on the home page, in full color. Cropped tight on the tool's most colorful part, since the letter shows only the middle of the square. Keep the pointer outside the middle 60% where you can. | Home docket, and the "Next case" band of the case before it |
| `detail-1` | 1:1 or 16:9 | 4–8 s loop | A close-up of one thing the tool does, with a caption. | Case page footage section (columns 6–12) |
| `detail-2` | 16:9 or 4:5 | 4–8 s loop | A second close-up. | Case page footage section (columns 1–8) |

Files go in `public/media/<slug>/` and are named after the id: `<id>.av1.mp4`, `<id>.h264.mp4`, `<id>-poster.webp`.

A missing `detail-1` or `detail-2` is simply left out of the case page. A missing `hero` or `scrub` shows a typographic placeholder ("Footage in production").

## Every id

Status as of Sep 28, 2026: every id below is in `media.json` except **`roster-export-detail-2`** (not made yet).

Posters are pointer-free: where a take has the pointer baked in on the resting frame, the poster has it painted out (copied from a frame, or a spot, without it). The clip itself keeps it.

### Case A · AutoPlanner (`autoplanner`) — mocked footage only
Recorded from the fake Canvas + fake Apps Script flow (`capture/case-a.js` in the research folder). No real Google account.

| Id | Shape | Shows |
|---|---|---|
| `autoplanner-hero` | 16:9 · 7.6 s | Fetch clicked, the color-coded weekly tables land, a slow push-in on the color bands and priority labels. Phone copy: the camera pans across the tables to the Due and Priority columns. |
| `autoplanner-scrub` | 1600×900 · 10.0 s | Paste tokens, fetch every student, tables, switch student tabs, Create Google Doc, "Doc created". Beats in `a-autoplanner.md`. |
| `autoplanner-docket` | 1:1 · 3.7 s | Three students’ color-coded tables, one after another, cropped on the color bands. The app's own white fade between students is cut out (it blinked inside the dark letter); each switch is a short crossfade. |
| `autoplanner-detail-1` | 1:1 · 4.5 s | The student tabs, then the priority labels as the tables switch. |
| `autoplanner-detail-2` | 16:9 · 5.6 s | Create Google Doc, then "Doc created" with its link. |
| `autoplanner-staff-page` | Photo, 980 × 1090 | The staff page as delivered on 2026-10-05: Update all students now, the last automatic update, and the student list with invented names. Cropped so the signed-in email at the top and the page footer never show. Case A page and `/spec/` (the case file's `stills`). |
| `autoplanner-week-tab` | Photo, 1150 × 1475 | A week tab of a student's Doc as delivered: By Class, By Day, and "Added by staff". Invented assignments. Case A page and `/spec/`. |

### Case B · Music Studio (`music-studio`) — Playwright-mocked portal only
Recorded from the mocked portal (`capture/case-b*.js`). **Never** the live portal.

| Id | Shape | Shows |
|---|---|---|
| `music-studio-hero` | 16:9 · 6.1 s | Preview & schedule, the invite with its attendee chips, Create event, “Event created”. Phone copy: the whole invite dialog. |
| `music-studio-scrub` | 1600×900 · 9.6 s | Dashboard, invite preview and create, students grid, profile panel, a recap opening. Beats in `b-music-studio.md`. |
| `music-studio-docket` | 1:1 · 4.4 s | Rests on the invite’s attendee chips and the crimson Create button; the event is created, then the next preview opens. |
| `music-studio-detail-1` | 1:1 · 5.1 s | A student's profile panel opening beside the roster. |
| `music-studio-detail-2` | 16:9 · 5.7 s | The Recaps page filtered to one student, then that student's recap. |

### Case C · Pomfret Voices (`pomfret-voices`) — approved by the Office of DEI
Not tool demos with invented data, so these captions don't end "Demo data." (`"demoData": false`).
All of it was recorded from the site as built in September 2026. The live site has since been redesigned, so it can't be recorded again, and the captions say so in the past tense ("…lit up one at a time on the Pomfret Voices home page, September 2026.").

| Id | Shape | Shows |
|---|---|---|
| `pomfret-voices-hero` | 16:9 · 10.0 s | The "Six voices" quote hero of https://pomfret-dei.vercel.app as it was in September 2026, quotes 1936–1972 lighting up. Quotes only, no faces. Phone copy: the quotes column (attributions partly cut). |
| `pomfret-voices-scrub` | 1600×900 · 9.0 s | The repository build's horizontal timeline, 1894 to 2026. Beats in `c-pomfret-voices.md`. |
| `pomfret-voices-docket` | 1:1 · 8.2 s | The serif quotes of the hero, close up, lighting up one at a time. |
| `pomfret-voices-detail-1` | 1:1 · 6.5 s | The 1975 timeline card lifting and opening into its story (no photos). |
| `pomfret-voices-detail-2` | 16:9 · 8.0 s | Three of the five Signature Exhibits on the home page as it was in September 2026, drifting past. Framed so the exhibits with photos of people never enter. |

Never: the slide of a teacher with students (the Tim Richards slide) or any magazine cover with faces.

### Case D · Roster Export (`roster-export`) — mocked footage only
Recorded from the mocked `CourseSelector.html` dialog (`capture/case-d.js`). No real Google account or roster.

| Id | Shape | Shows |
|---|---|---|
| `roster-export-hero` | 16:9 · 8.7 s | The whole dialog: three classes ticked, Generate, “Created 3 document(s)”. Phone copy: the whole dialog, framed 4:5. |
| `roster-export-scrub` | 1600×900 · 9.1 s | Classes load, three ticked, "Generating…", the results with links, "Open Drive folder". Beats in `d-roster-export.md`. |
| `roster-export-docket` | 1:1 · 3.7 s | The checked class list, “Generating…”, then “Created 3 document(s)” and the dialog scrolling to its links. |
| `roster-export-detail-1` | 1:1 · 4.7 s | The results list: one comment Doc per class with its student count, and the Drive folder link. |
| `roster-export-detail-2` | — | **Not made yet.** Suggested: the "Canvas Tools" class picker. The case page leaves it out until it exists. |

### Case E · College counseling (`college-counseling`)
No footage. The home page shows an outlined letter E with no link.

### Home (`src/data/home.json`)
| Id | Shape | Shows | Notes |
|---|---|---|---|
| `home-reel` | 16:9 · 12 s loop | Opens and settles on AutoPlanner’s color bands (its top rows are what peeks in under the home hero); hard cuts through Music Studio sending an invite, the Voices quotes, Roster Export’s “Created 3 document(s)” and the Voices timeline cards; starts and ends on the same frame. No pointer in the opening or closing shot. | Has a 4:5 phone copy (1080×1350) in its `mobile` field, used under 768 px wide, whose top half is the color bands. The page enlarges it only 1.04–1.08× for its drift. |
| `home-showreel` | 16:9 · 35 s, not a loop | The full reel, one tool at a time, no titles. | For the reel's pop-up player. Load it only when the player opens; `usedOn: ["home-player"]` keeps it out of the 8 MB home budget. |
| `glance-1` | 1:1 · 4.0 s | AutoPlanner tabs switching between three students. | "At a glance" strip. |
| `glance-2` | 1:1 · 3.2 s | Music Studio: View recap, then the recap. | "At a glance" strip. |
| `glance-3` | 1:1 · 3.7 s | Pomfret Voices: rests on the timeline, then the 1975 card lifts and opens. | "At a glance" strip. |

### About (`src/data/about.json`)
| Id | Kind | Shows |
|---|---|---|
| `about-workshop` | 16:9 · 9.7 s loop | The club's public GitHub: the 50 merged pull requests, then one pull request's changes. Avatars hidden. |
| `about-club-photo` | Photo, 4:3 | The club around a conference table (approved for About). Color and black-and-white sets. Show it with `<Photo id="about-club-photo" />`. |

### Events · AI Literacy Week (`ai-literacy-week`): photos from the main event, May 2026
Photos, not clips. The event pages show them with `EventPicture` (`src/components/events/EventPicture.astro`, which can switch to a phone crop); Home and About show them with `<Photo id="…" />`. On the event pages a phone crop keeps the main crop's alt text, so a main crop with a phone crop has alt text that is true of both. The last part of each id is its shape (`16x9`, `4x5`, `1x1`, …). Files are in `public/media/events/ai-literacy-week/`. All come from Cayden's camera originals (not in the repository) with a light grade: a little cooler and less saturated, since the camera ran warm. Cayden asked for these photos, faces included, to be published; captions and alt text never name anyone (who is in which photo isn't confirmed).

| Id | Shape | Shows | Where it's used | Notes |
|---|---|---|---|---|
| `ai-literacy-week-hall-3x2` | Photo, 3:2 | The whole room during a faculty talk: presenter, the screen ("The internet."), students on sofas. | Home: the "Latest event" teaser (the event's `card`). | The establishing shot. |
| `ai-literacy-week-hall-16x9` | Photo, 16:9 | The same, framed wide. | Event page: the cover, Plate 1 (the event's `cover`). | The Home and `/events/` frames grow into it (the photo hand-off). |
| `ai-literacy-week-hall-21x9` | Photo, 21:9 | The same, as a thin band. | `/events/`: the latest event's band on laptops (the event's `feature`). | |
| `ai-literacy-week-hall-4x5` | Photo, 4:5 | Presenter, screen and the "Hamilton Hub" sign. | Event page cover and `/events/` band on phones and upright tablets. | |
| `ai-literacy-week-results-4x5` | Photo, 4:5 · 1600 px max | A student presenting at the lectern. | **Never placed.** | **Presenter only.** The original shows a slide with a real teacher's photo and AI images of that teacher; the slide must never appear, so this crop stops well short of the screen. Never re-crop it wider, and don't place it without the lead's say-so. |
| `ai-literacy-week-demo-3x2`, `-demo-1x1` | Photo, 3:2 and 1:1 | The live demo: a student speaking beside the screen with the typed prompt (an oyster farm deck). | Event page: Plate 2, the demo sheet (the 1:1 on phones). | The browser's tab strip and address bar (a project URL) are blurred. |
| `ai-literacy-week-deck-3x2`, `-deck-1x1` | Photo, 3:2 and 1:1 | The finished demo deck on screen, "James Lake Oyster Farm" (the 3:2 also shows a student at the laptop; the 1:1 leaves the student out, so the 3:2's alt text describes only the screen and the laptop). | Event page: Plate 3, the demo sheet (the 1:1 on phones). | The deck is AI-generated demo content; its caption must say the business and every detail in it are invented. Blurred: the tab strip and address bar, the deck's speaker notes (they were readable and were written in the first person next to a real club member's name) and slide thumbnails 2 to 8. The slide title stays sharp (approved by Cayden). |
| `ai-literacy-week-audience-3x2`, `-1x1` | Photo, 3:2 and 1:1 | Two students on a sofa watching, pizza boxes behind. | Event page: Plate 6 (the 1:1 on phones). About: the small photo under the timeline (black and white). | The 3:2 has a black-and-white set. |
| `ai-literacy-week-audience-4x5` | Photo, 4:5 | The same, without the pizza. | Not placed. | |
| `ai-literacy-week-lectern-4x5` | Photo, 4:5 | A student at the lectern mid-sentence ("Future of AI" talk). | Event page: Plate 4. | |
| `ai-literacy-week-lectern-2x3`, `-1x1` | Photo | The same moment, other shapes. | Not placed. | |
| `ai-literacy-week-future-3x2` | Photo, 3:2 | The same talk: the screen shows a Mars rover and a cancer-drug illustration. | Event page: Plate 5. About: the large photo under the timeline (black and white). | Has a black-and-white set. |
| `ai-literacy-week-future-4x5`, `-1x1` | Photo | The same talk, the Mars rover only. | Not placed. | |

A photo marked "Not placed" is built and served but no page shows it; `usedOn` in `media.json` is `[]` for it. When you place one, fill in `usedOn` and this table.

### Style guide
| Id | Shape | Shows |
|---|---|---|
| `styleguide-demo` | 16:9 | A synthetic test clip (a crimson bar sweeping across the grid). Lives in `src/data/media-demo.json`. `/styleguide/` only. |

## Privacy rules for every clip
- Demo data only: fictional names, `@example.org` emails at most.
- Never tokens, `/exec` URLs, Sheet/Form/Drive IDs, real emails, avatars, URL bars or browser chrome.
- Tool recordings end their caption with **"Demo data."**

## The `media.json` entry

`src/data/media.json` is a list (`[ ... ]`) of entries like this one. The rules are enforced by `src/lib/media.ts` (the build fails on a mistake) and `scripts/check-media.mjs`.

```json
{
  "id": "autoplanner-hero",
  "case": "autoplanner",
  "usedOn": ["autoplanner"],
  "av1": "/media/autoplanner/autoplanner-hero.av1.mp4",
  "h264": "/media/autoplanner/autoplanner-hero.h264.mp4",
  "poster": "/media/autoplanner/autoplanner-hero-poster.webp",
  "width": 1920,
  "height": 1080,
  "duration": 7.6,
  "caption": "AutoPlanner fetches three students’ Canvas assignments and lays them out as color-coded weekly tables with priority labels. Demo data.",
  "demoData": true
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | The name pages ask for. Lowercase letters, numbers, dashes. |
| `case` | no | The case slug (or `home`, `about`, `styleguide`). |
| `usedOn` | no | Pages that show it. Anything listing `home` counts toward the 8 MB home budget. |
| `av1` | yes, except scrub clips | AV1 in MP4, listed first so modern browsers pick it. |
| `h264` | yes | H.264 in MP4, the fallback every browser plays. |
| `poster` | yes | WebP still, ≤ 100 KB, that looks finished on its own (iOS Low Power Mode shows only this). Use the clip's first frame so nothing jumps at play. |
| `width`, `height` | yes | Pixel size of the video. |
| `duration` | yes | Length in seconds. |
| `caption` | yes | What the clip shows, in words. Ends "Demo data." when `demoData` is true. |
| `demoData` | no (default `true`) | Set `false` only for footage that isn't a tool recording with invented data (Pomfret Voices, GitHub, a reel that mixes both). |
| `scrub` | no (default `false`) | `true` for the scroll-driven clips. They never autoplay. |
| `mobile` | no | `{ "av1", "h264", "poster", "width", "height" }`: a copy framed for phones, used under 768 px wide. `poster` is optional; when set, phones show it instead of the main poster. |

### A photo entry
A photo has `"kind": "image"`, its full `width` and `height`, `alt` text (what it shows, for people who can't see it), an optional `caption`, and `files`: one path per format and width. A black-and-white set, if any, goes under `files.bw` in the same shape.

```json
{
  "id": "about-club-photo",
  "kind": "image",
  "width": 2400,
  "height": 1800,
  "alt": "About a dozen students seated around a long dark conference table, …",
  "files": {
    "avif": { "800": "/media/about/about-club-photo-800.avif", "1600": "…", "2400": "…" },
    "webp": { "800": "…", "1600": "…", "2400": "…" },
    "jpg":  { "800": "…", "1600": "…" },
    "bw":   { "avif": { … }, "webp": { … }, "jpg": { … } }
  }
}
```
The JPEG set stops at 1600 px: only browsers without AVIF and WebP ever load it, and a 2400 px JPEG can't stay under the photo budget without visible damage.

## Budgets
Any file ≤ 10 MB · home page video ≤ 8 MB in total · posters ≤ 100 KB · every photo file (each size and format of a `"kind": "image"` entry) ≤ 300 KB · `public/media` ≤ 150 MB. `npm run check:media` decides which budget a picture gets from `media.json` (a clip's `poster` or an image entry's `files`) and checks that every listed file exists. Suggested (not enforced): each docket loop ≤ 500 KB, the reel ≤ 1.5 MB, each case page ≤ 4 MB. The AV1 files mostly meet these; several H.264 fallbacks are larger.

## Encoding (ffmpeg 8.1)
```sh
# H.264 (plays everywhere)
ffmpeg -i master.mov -an -vf "scale=1920:-2:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -preset slow -crf 23 -profile:v high -level:v 4.1 -movflags +faststart <id>.h264.mp4
# AV1 (about 60% smaller)
ffmpeg -i master.mov -an -vf "scale=1920:-2:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libsvtav1 -preset 6 -crf 35 -g 150 -movflags +faststart <id>.av1.mp4
# Scrub clip: close keyframes and no B-frames so seeking is instant
ffmpeg -i master.mov -an -vf "scale=1600:-2:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -preset slow -crf 22 -g 10 -bf 0 -movflags +faststart <id>.h264.mp4
# Poster: the first frame, so nothing jumps when playback starts
ffmpeg -i <id>.h264.mp4 -frames:v 1 poster.png && cwebp -q 78 poster.png -o <id>-poster.webp
```

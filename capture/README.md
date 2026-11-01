# capture/: recording footage for the case pages

This folder holds the scripts that record a case's footage from a practice version of its tool, so the clips can be made again the same way. Right now it records Case F (Project: Pomfret sorting).

Only practice demos with invented data are ever recorded. For Case F that is the browser demo in the `case-f-project-pomfret` repo, whose students are "Practice Student 001" to "253". Never the real Google Sheet, the real groups or any real student.

## What you need

- Both repos cloned side by side, for example `~/civicai/civicaiclub.github.io` and `~/civicai/case-f-project-pomfret`.
- Node 24 for this repo (`nvm use`), then `npm ci`. Node 22 or newer for case-f.
- The browser this repo already uses: `npx playwright-core install chromium`.
- ffmpeg with libx264 and an AV1 encoder (libsvtav1 or libaom-av1). On a Mac, `brew install ffmpeg` has both. On Windows, use the "full" build from gyan.dev.

## Recording (Case F)

Terminal 1, in `case-f-project-pomfret`, starts the demo and leaves it running:

```sh
npm run build:demo
npm run preview
```

The demo is now at http://127.0.0.1:3000. Every reload starts it fresh, and the same steps always give the same result.

Terminal 2, in this repo:

```sh
node capture/case-f.mjs all
```

That records the five takes one after another (about a minute and a half). One take can be recorded on its own by name: `flow`, `hero`, `docket`, `detail1` or `detail2`.

| Take | Length | What it shows |
|---|---|---|
| `flow` | about 19 s | The interest table, a slow scroll, "Next: place students", "Create draft placements", the numbers, "Weak interest matches", "By project" and one student's "Why this placement". |
| `hero` | about 10 s | "Create draft placements", then the numbers and the Needs review list land and hold still. |
| `docket` | about 9 s | The interest table's bars and "Suggested" choices drifting down and back up. |
| `detail1` | about 7 s | A student's "Why this placement" panel with its "Checked / Type match / Goal match" tags. |
| `detail2` | about 6 s | "By project", switching Week 1 to Week 2 and back. |

Each take writes two files into `capture/out/`:

- `<take>-master.mp4`: a sharp 30 fps master at 3200 × 1800.
- `<take>-cuts.json`: when each step of the take started, in seconds. The case page's beats and the clip cuts are set from these times.

## How the recording works

- The browser runs headless, so there is no address bar and no tabs in any frame. It draws the page at twice the size (1600 × 900 at scale 2, so 3200 × 1800 pixels) so the clips can be cropped without blurry text.
- Chrome's screencast sends a picture each time the screen changes, with the time it was drawn. ffmpeg turns those pictures into a steady 30 fps video.
- A headless browser has no mouse pointer, so the script draws one (a small black arrow) and moves the mouse along smooth, eased paths, the way a person would. Scrolling happens in many small steps.
- Before each take the script opens the demo fresh and clicks "Skip walkthrough". That part isn't recorded.

## The name guard

The demo names the program's director in a few places (the line at the bottom of "Choose projects", the walkthrough, "About this tool" and "View placement rules"). The site names the client by office only, and never the club's student leaders either.

So while a take records, the script checks the screen about five times a second. If any text in view contains "Litowitz", "Cayden" or "Luke", the take stops with an error naming the take and the text, and no master is written for it. A take that trips the guard is never used: change the take so it stays away from that part of the demo, and record it again.

## What is never committed

`capture/out/` (masters, cut lists, stills) is in `.gitignore`. Only the finished clips in `public/media/project-pomfret/` go into the repo.

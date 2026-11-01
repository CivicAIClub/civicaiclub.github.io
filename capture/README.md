# capture/: recording footage for the case pages

This folder holds the scripts that record a case's footage from a practice version of its tool, so the clips can be made again the same way. Right now it records Case F (Project: Pomfret sorting).

Only practice demos with invented data are ever recorded. For Case F that is the browser demo in the `case-f-project-pomfret` repo, whose students are "Practice Student 001" to "253". Never the real Google Sheet, the real groups or any real student.

## What you need

- Both repos cloned side by side, for example `~/civicai/civicaiclub.github.io` and `~/civicai/case-f-project-pomfret`.
- Node 24 for this repo (`nvm use`), then `npm ci`. Node 22 or newer for case-f.
- The browser this repo already uses: `npx playwright-core install chromium`.
- ffmpeg with libx264 and an AV1 encoder (libsvtav1 or libaom-av1). On a Mac, `brew install ffmpeg` has both. On Windows, use the "full" build from gyan.dev.
- For the posters, ffmpeg's libwebp (in the gyan.dev "full" build) or the `cwebp` tool. Homebrew's ffmpeg has no libwebp, so on a Mac also run `brew install webp`.

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
| `docket` | about 9 s | The interest table's bars and "Suggested" choices drifting down and back up. This take uses a wider 2000 × 1500 window, so the bars and the choices both fit in the middle of the square that the home page's giant F shows. |
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

## Encoding the clips

With the five masters in `capture/out/`, in this repo:

```sh
node capture/encode.mjs
```

That cuts, crops and encodes the six clips the site uses into `public/media/project-pomfret/` (about a minute). One clip can be made on its own by id, for example `node capture/encode.mjs project-pomfret-docket`.

| Clip id | Size | From | What the script does |
|---|---|---|---|
| `project-pomfret-hero` | 1920 × 1080 | `hero` | A slow push-in (1.00× to 1.06×). The last 0.6 s fades back to the first frame, so the loop has no jump. |
| `project-pomfret-hero-mobile` | 1080 × 1350 | `hero` | The phone copy: a 4:5 frame on the title, the first two numbers and the Needs review list, with the same push-in and fade. |
| `project-pomfret-scrub` | 1600 × 900 | `flow` | The whole flow, H.264 only, with a keyframe every 10 frames and no B-frames so scrolling the page can jump to any frame. |
| `project-pomfret-docket` | 1600 × 1600 | `docket` | A square around the interest bars and the "Suggested" choices. |
| `project-pomfret-detail-1` | 1080 × 1080 | `detail1` | A square on the "Why this placement" panel. |
| `project-pomfret-detail-2` | 1920 × 1080 | `detail2` | The project cards and the week menu. |

For each clip it writes `<id>.h264.mp4`, `<id>.av1.mp4` (not for the scrub) and `<id>-poster.webp`. The poster is the clip's first frame, where the pointer is always outside the picture. It also saves three stills of each clip (start, middle and end) to `capture/out/check/` and prints every file's size and the clip's exact length.

Then:

1. Look at the stills in `capture/out/check/`. Check that the text is sharp, that no name of a faculty member or student leader shows, that the posters have no pointer, and that each loop's first and last frames look alike.
2. Copy the printed lengths into the clips' `duration` in `src/data/media.json`.
3. If a take was recorded again, update the beats in `src/content/cases/f-project-pomfret.md` from the new `capture/out/flow-cuts.json`: the beats are the times of `scroll-end`, `create`, `review` and `why`.
4. Run `npm run check:media`.

The script needs ffmpeg with libx264 and libsvtav1 (or libaom-av1), and for the posters either ffmpeg's libwebp or the `cwebp` tool (`brew install webp`; Homebrew's ffmpeg has no libwebp). The hero, its phone copy and the docket are squeezed a little harder than the others (a higher CRF) because their movement changes every pixel, which made them several times bigger than Case D's clips.

## What is never committed

`capture/out/` (masters, cut lists, stills) is in `.gitignore`. Only the finished clips in `public/media/project-pomfret/` go into the repo.

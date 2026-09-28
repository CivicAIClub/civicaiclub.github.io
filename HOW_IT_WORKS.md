# How the Civic AI Club site works

This is a plain-English tour of the site for anyone in the club, whether or not you've written code before. Read it top to bottom once and you'll know where everything is and why.

## 1. What the site is made of

The site is a set of ordinary web pages (HTML files) plus one style file and one script file, all made ahead of time by a tool called **Astro**. There's no server running code when someone visits: GitHub Pages just hands out the finished files. That makes the site fast, cheap (free) and hard to break.

When you run `npm run build`, Astro:
1. reads every page in `src/pages/`,
2. fills each one with facts from `src/content/` and `src/data/`,
3. wraps it in the shared frame (`src/layouts/Base.astro`: header, footer, fonts, scripts),
4. writes the finished pages into `dist/`.

## 2. Where the words and facts come from

We keep facts in one place each, so a change happens once.

| Facts | File |
|---|---|
| The five cases: letter, office, team, chore, what the tool does, status, clips | `src/content/cases/*.md` (one per case) |
| The rules those files must follow | `src/content.config.ts` |
| Every member's name and class year | `src/data/members.json` |
| The numbers ("50 pull requests merged") and the date they were checked | `src/data/numbers.json` |
| The two local businesses | `src/data/clients.json` |
| The club's timeline | `src/data/timeline.json` |
| Site-wide links (the intake form, GitHub) and the main lines of copy | `src/data/site.json` |
| Which video files belong to which clip id | `src/data/media.json` |

If a case file is missing a field or has a typo in one, the build stops with a message naming the file and the field. That's on purpose: it's better to find out on your computer than on the live site.

## 3. How a page is put together

Pages are built from **components**, small reusable pieces in `src/components/`:

- `Header` — the thin bar at the top (griffin, name, links) and the phone menu.
- `Footer` — the ink footer with the big CIVIC and the Motion switch.
- `Wordmark` — the CIVIC logo, drawn as five shapes (made by `npm run wordmark`).
- `Statement` — a big paragraph with its first line indented.
- `KeyValue` — a label on the left, a value on the right, a line above.
- `Divider` — a thin line.
- `ArrowLink`, `RollLink`, `BigLink` — the three kinds of links.
- `Video` — a looping clip, asked for by id, with a caption and a Pause button.
- `MarkedText` — a sentence with its one crimson-marked phrase.
- `Cursor`, `Preloader` — the mouse label and the home page's opening sheet.

A page is mostly a list of these, for example: `<Statement>Teachers and staff bring us a chore…</Statement>`. Open `/styleguide/` to see every one.

## 4. How it looks: the design tokens

`src/styles/tokens.css` holds every design decision as a named value: the colors (ink `#0D0D0C`, paper `#F4F3EF`, Pomfret crimson `#A8172B`), the text sizes, the grid (12 columns on laptops, 8 on tablets, 6 on phones), the two animation curves, and which layers sit on top of which. Everything else uses those names. `base.css` sets the page defaults, and `transitions.css` describes the page-change animation.

The text sizes are few on purpose (nine on a laptop). A few with a name worth knowing: `--fs-statement` for the big sentences, `--fs-case-hero` for a case's name (and the club lead's), `--fs-figure` for big figures (the numbers at a glance, the months on About's timeline), `--fs-name` for people's names in lists (40px on a laptop, smaller on tablets and phones), and `--fs-mono` (11px everywhere, phones too) for the small capitals. Footage is never dimmed with a dark layer: where text sits near footage, it sits on plain ink.

The paper grain behind every section is a tiny picture written straight into the style file (`astro.config.mjs` asks for that), so phones draw it with the first paint instead of waiting for one more download.

The only color the site adds is crimson, used for one marked phrase per page, keyboard focus rings, thin progress lines and the "in progress" dot. All other color comes from the tools themselves, in the footage.

## 5. How it moves

All animation lives in `src/scripts/motion/`, and only there. Components ask for motion by adding a **data attribute**, a label in the HTML such as `data-reveal="lines"` ("make these lines rise in"). The motion scripts look for those labels and animate what they find. `MOTION.md` lists every label.

The pieces:
- `index.js` switches motion on (if allowed), starts smooth scrolling, waits for the fonts, and then starts every file in `modules/`.
- `core.js` is the shared toolbox: the animation library (GSAP), the two speed curves, "is motion allowed?", and so on.
- `modules/` has one file per kind of motion: text rising, lines drawing, media opening, parallax, the marker, rolling links, the cursor label, the header, the footer, the preloader, the big CIVIC, and the video player.

**Motion is optional, content is not.** If a visitor's device asks for less motion, or they press **Motion: Off** in the footer, nothing moves, videos wait for a Play press, and every word is still there. If JavaScript is off or a script fails, the page shows everything, just without animation (and the footer hides its Motion switch, which would do nothing). You can see both versions on `/styleguide/` by pressing **Motion: Off** in its footer.

**Page changes.** Moving between pages plays a short "new sheet" animation, done by the browser itself (`transitions.css`). Its on switch is written inside every page by `Base.astro` rather than in the style file, because the browser decides at the very start of a page change, sometimes before the style file has arrived. Going back with the Back button plays the sheet the other way. With Motion off the switch is turned off. When a visitor points at a link that zooms into a case (the home page's case letters, a case's "Next case" band), Chrome quietly prepares that case page in the background, so it is ready the moment the zoom ends.

**The header** hides when you scroll down (once the name has swapped for the small CIVIC) and comes back as soon as you scroll up, when you reach the top or the footer, or when you tab into it. It stays put while the home page's docket and About's Frame are stuck to the top of the window (and hides again as they scroll away), and with motion off. Without JavaScript it sits at the top of the page and scrolls away with it.

## 6. How videos work

Each clip has an id (like `autoplanner-hero`). A page asks for `<Video id="autoplanner-hero" />`. The `Video` component looks the id up in `src/data/media.json` and writes a video with two files (a small modern AV1 file and a universal H.264 file), a still poster picture and a written caption. If the id isn't listed yet, a quiet placeholder with the same shape appears instead, so pages can be built before the footage is ready.

The video player script plays a clip only while it's on screen and motion is allowed, pauses it when it scrolls away, and always shows a Pause/Play button. Phones in Low Power Mode may refuse to play; then the poster stays, which is why every poster must look finished.

Photos work the same way: `<Photo id="about-club-photo" />` looks up an entry marked `"kind": "image"` and offers the browser the photo in several sizes and formats (AVIF, WebP, JPEG), so each visitor downloads only the one that fits their screen.

`npm run check:media` keeps file sizes in check, because videos stay in the repository's history forever.

## 7. How it gets online

When a pull request is merged into `main`, GitHub runs `.github/workflows/deploy.yml`: it builds the site and publishes `dist/` to GitHub Pages at https://civicaiclub.github.io. Every pull request also runs `.github/workflows/ci.yml`, which builds the site and runs the two checks; a red cross means something needs fixing before merging.

## 8. Accessibility, built in

- A **Skip to content** link for keyboard users.
- Clear crimson focus rings (lighter crimson on dark sections).
- The phone menu keeps the keyboard inside it and closes with Esc. Opened from the keyboard, focus lands on its first link; opened by a tap, on the menu itself. The page behind it can't scroll.
- Links whose letters roll on hover are given a plain name for screen readers ("Cases", not "C a s e s"); `npm run check:a11y` checks this on every page.
- On touch screens, the header links, the Menu button and the video Pause/Play buttons have tap areas at least 44px tall, and every other text link at least 24px.
- Every video has a text caption and a Pause button; nothing autoplays when motion is off.
- The mouse label is decoration only: it never hides the real pointer and screen readers skip it.
- Text colors meet contrast rules (paper on ink is 17.5:1; the marker's text on crimson is 7.1:1).
- The header's letters blend with whatever is under them (dark over paper, light over ink). Over edge-to-edge footage (the home reel, the case heroes), where that blend would give grey on grey, a plain ink strip is shown behind the header (`src/scripts/site/header-backdrop.js`, asked for with `data-header-solid`).

## 9. Privacy

This repository is public. Footage uses invented demo data only; no real student names, rosters, emails, IDs or account screens ever go in. Faculty clients are named by office. Local businesses appear by name, one plain line and "In progress", nothing more. See `.cursor/rules/civicaiclub-site.mdc`.

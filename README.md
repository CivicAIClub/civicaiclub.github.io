# civicaiclub.github.io

The showcase site for the **Civic AI Club**, a student-run club at Pomfret School. Teachers and staff bring the club a chore that eats their week; student developers build the tool and hand it over. This site shows those cases.

Live at **https://civicaiclub.github.io** (once this repository is published). Built with [Astro](https://astro.build) as a static site and deployed to GitHub Pages.

- How the site works, in plain English: [HOW_IT_WORKS.md](HOW_IT_WORKS.md)
- Every animation and how to ask for one: [MOTION.md](MOTION.md)
- The video clips the pages expect: [MEDIA-IDS.md](MEDIA-IDS.md)
- The club's Git walkthrough: https://github.com/CivicAIClub/docs/blob/main/developer-onboarding.md

## Set up from a fresh clone

You need **Node.js 24** (the version in `.nvmrc`). If you use [nvm](https://github.com/nvm-sh/nvm):

```sh
git clone https://github.com/CivicAIClub/civicaiclub.github.io.git
cd civicaiclub.github.io
nvm install        # reads .nvmrc and installs Node 24
nvm use
npm ci             # installs the exact versions in package-lock.json
npm run dev        # starts the site at http://localhost:4321
```

The first `npm run dev` or `npm run build` downloads the fonts from Fontsource, so it needs an internet connection.

✅ You're done with this step when http://localhost:4321 shows the big CIVIC and http://localhost:4321/styleguide/ shows every component.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site locally with live reload. |
| `npm run build` | Builds the finished site into `dist/`. |
| `npm run preview` | Serves `dist/` locally, to check a build. In this Astro version it runs in the background; stop it with `npx astro preview stop`. |
| `npm run check:media` | Checks video, poster and photo sizes and the clip list (`src/data/media.json`). Lists clips that are still missing. |
| `npm run check:gsap` | Checks that GSAP and Lenis are only imported inside `src/scripts/motion/`. |
| `npm run check:a11y` | Runs the axe accessibility checker on every page (laptop and phone size, motion on and off) against a running `npm run preview`. The first time, run `npx playwright-core install chromium` to download the browser it uses. Fails on any serious or critical problem. |
| `npm run wordmark` | Rebuilds the CIVIC logo outlines (`src/components/Wordmark.astro`) from the Host Grotesk font. |
| `npm run brand` | Rebuilds the favicon, share image (`public/og.png`) and paper grain texture. |

CI runs `check:gsap`, `check:media` and `build` on every pull request. Run `check:a11y` yourself before merging a change to a page or component.

## Project layout

```
astro.config.mjs          site address, fonts, prefetch
src/
  content.config.ts       the rules every case file follows
  content/cases/          one Markdown file per case (A–E)
  data/                   members, numbers, clients, timeline, site links, media (videos + photos), home/about footage ids
  layouts/Base.astro      the frame of every page: head, header, footer, scripts
  components/             Header, Footer, Wordmark, Video, Photo, Statement, KeyValue, links, …
  pages/                  /, /about/, /cases/[slug]/, /404, /styleguide/, /sitemap.xml
  scripts/motion/         ALL animation code (GSAP + Lenis): index.js, core.js, modules/
  scripts/site/           the phone menu and the Motion On/Off switch (no animation library)
  styles/                 tokens.css (design values), base.css, transitions.css
  assets/brand/           the Pomfret griffin and the CIVIC outlines
public/
  media/<slug>/           encoded videos, posters and web-sized photos only (no raw recordings)
  og.png, favicon.*       share image and tab icons (made by npm run brand)
scripts/                  wordmark, brand images, media check, import check
```

## Common jobs

**Change a number.** Edit `src/data/numbers.json`, and update `checked` and `checkedLabel` to today. Never add a number you haven't checked.

**Add or edit a case.** Copy a file in `src/content/cases/`, change the facts, and set `public: true` when it should get its own page. Put the one marked phrase of the chore in `[square brackets]`. Name the client by office only. The build checks every field (`src/content.config.ts`).

**Add footage.** Encode it (commands in `MEDIA-IDS.md`), put the files in `public/media/<slug>/`, and add an entry to `src/data/media.json` using the id the page already asks for. Run `npm run check:media`.

**Add motion.** Use a data attribute from `MOTION.md`. For something new, add a module file in `src/scripts/motion/modules/`.

## Deploying

Merging into `main` runs `.github/workflows/deploy.yml`, which builds with `withastro/action@v6` and publishes with `actions/deploy-pages@v5`. One-time setup when the repository is created:

1. Settings → Pages → Source: **GitHub Actions**.
2. Add the club's `protect-main` ruleset and the Developers team, as for every club repository.
3. There is no `base` path: this is the organization's main Pages site.

## Rules that keep the site safe to publish

- No real student data in footage, code or copy. Demo data only.
- Faculty clients are named by office, never by person.
- Never link Case B's live portal (and, for now, its repository).
- No emails anywhere. Names appear as `Name ’YY`.
- The details are in `.cursor/rules/civicaiclub-site.mdc`.

## Known issues

- None right now. (The form behind "Bring us a problem" and "Join the club", `intakeFormUrl` and `joinFormUrl` in `src/data/site.json`, opens without a Google sign-in, so outside businesses can use it. If it's ever replaced, check the new link in a signed-out browser window.)

## Credits

- **Pomfret School griffin:** the school's own artwork, used with the school's approval. Source: https://www.pomfret.org/uploaded/themes/default_24/images/griffin-red.svg (downloaded 2026-09-27; fill color changed to `currentColor`). The school's site also serves a 990×838 PNG at https://resources.finalsite.net/images/v1709834051/pomfret/iuvlhfag540p2f2yqkd6/griffin_black1.png.
- **Fonts:** [Host Grotesk](https://fonts.google.com/specimen/Host+Grotesk) and [Martian Mono](https://fonts.google.com/specimen/Martian+Mono), SIL Open Font License 1.1, loaded through [Fontsource](https://fontsource.org). The CIVIC wordmark is Host Grotesk Light converted to outlines, which the OFL allows.
- **Libraries:** [Astro](https://astro.build) (MIT), [GSAP](https://gsap.com) (GreenSock standard "no charge" license), [Lenis](https://github.com/darkroomengineering/lenis) (MIT), [opentype.js](https://opentype.js.org) (MIT, development only), [axe-core](https://github.com/dequelabs/axe-core) with `@axe-core/playwright` (MPL-2.0, development only) and `playwright-core` (Apache-2.0, development only).
- **Design reference:** the motion vocabulary was studied from rejouice.com for inspiration only. No code, text, fonts, images or video from that site are used here.
- Built by the members of the Civic AI Club. President: Cayden Auyang ’27. Vice President: Luke Ryan ’27. Faculty advisor: Josh Lake.

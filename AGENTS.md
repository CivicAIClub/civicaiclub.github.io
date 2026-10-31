# Civic AI Club showcase site

This standalone repo holds the public Civic AI Club showcase site at Pomfret School. Teachers and staff bring time-consuming chores, student developers build tools, and this site shows those cases at https://civicaiclub.github.io.

## Beginner quick start

Full guide: https://github.com/CivicAIClub/docs/blob/main/developer-onboarding.md

1. First time: check Git with `git --version`, set your Git name and GitHub email, accept the club invite, and sign in with GitHub Desktop or `gh auth login`. Clone only your project's repo, open its folder, and read its README setup steps.
2. Start each work session from the latest main, then make a branch:

```sh
git checkout main
git pull origin main
git checkout -b feature/short-description
# Make and check your changes before continuing.
git status
git add .
git commit -m "Describe your change"
git push --set-upstream origin feature/short-description
```

Use `feature/`, `fix/`, or `chore/` as appropriate, with lowercase names and hyphens. Commit small working pieces; do not edit or push main directly.
3. Open a PR on GitHub, fill in the template, and get someone else's approval and passing checks where CI exists. Push review fixes to the same branch. After it is merged, pull main again before starting another branch.
4. If stuck, ask in the case chat, then Keke, then Luke or Cayden. Ask before doing anything drastic.

## Shared workflow

- All paths below start at this repo's root. Club projects have separate repos; the old `Civic-AI-Github-Repository` monorepo is archived and must not be edited.
- Prefer clear code over clever code for high school developers learning collaboration. If you generate code the developer cannot explain, say so and explain it in plain English.
- Never push to `main`; use a branch and PR with one approving review. Use lowercase `feature/`, `fix/`, or `chore/` names with hyphens and no spaces.
- Make small, frequent commits with plain-English messages. Use `.github/pull_request_template.md` for PRs.
- Never commit API keys, tokens, or `.env` files. If someone pastes a real credential into a file, stop and tell them. Every environment variable needs a placeholder in `.env.example`.
- Never add Co-authored-by, Generated with, Made-with, Claude-Session or any other AI attribution line to a commit message or pull request description. When squash merging, delete any such lines GitHub puts in the merge message.
- Use the onboarding guide above for Git, branching, PR, and merge-conflict questions. Read `README.md`, `HOW_IT_WORKS.md`, `MOTION.md`, and the site rule for project context.

## Stack and files

- Keep exact versions, installed with `--save-exact`: Astro 7.3.5 (static output), Node 24 (`.nvmrc`), GSAP 3.15.0 (ScrollTrigger and SplitText), and Lenis 1.3.26.
- Register `civic` easing in `core.js` without CustomEase. Use native cross-document View Transitions with CSS only.
- Plain CSS uses `src/styles/tokens.css`. No Tailwind, UI kit, WebGL, or icon library. Astro's Fonts API loads Fontsource Host Grotesk 300/400 and Martian Mono 400.
- Cases: `src/content/cases/*.md`; events: one file each in `src/content/events/*.md`; both follow `src/content.config.ts`. Site data: `src/data/*.json`.
- Media list: `src/data/media.json`; schema: `src/lib/media.ts`; IDs: `MEDIA-IDS.md`; files: `public/media/<slug>/`. No raw recordings there.
- Components: `src/components/`; layout: `src/layouts/Base.astro`; pages: `src/pages/`; menu and Motion switch: `src/scripts/site/`; styles: `src/styles/`.
- All GSAP and Lenis code must stay in `src/scripts/motion/`; CI rejects imports elsewhere. Components request motion through data attributes: `data-reveal="lines"`, `data-draw`, `data-media-open`, `data-parallax`, `data-parallax-y`, `data-mark`, `data-roll`, `data-letter-roll`, `data-cursor`, `data-header-swap`, `data-video`.
- Follow `MOTION.md`; put new page motion in a new `src/scripts/motion/modules/` file. Never edit another person's module.

## Design, motion, and media

- Follow the "Casework" direction: black and white, huge Host Grotesk Light, full-bleed tool footage, and sparing Pomfret crimson `#A8172B`.
- Content must be readable with JavaScript off and motion off. Hide-before-animate styles belong only under `html.js-motion`; the module must release `is-split`, `is-drawn`, `is-open`, and `is-ready` states.
- Reduced motion, from the device or footer switch, means no preloader, smooth scroll, pinning/scrub, or page-change animation. Videos show a poster and Play button.
- Videos have no `autoplay` attribute. Use AV1 first, H.264 fallback, a finished-looking WebP poster, a visible Pause button for every loop, and tool-recording captions ending "Demo data."
- Media limits: any file <= 10 MB; home video <= 8 MB; posters <= 100 KB; each photo <= 300 KB; all `public/media` <= 150 MB. Check with `npm run check:media`. Photos use `<Photo id>` and a `"kind": "image"` media entry.
- Only use `expo.out` and `civic` easing (`M0,0 C0.7,0 0.3,1 1,1`, CSS `--ease-civic`). No bounce/elastic, count-up numbers, gradients, shadows, rounded cards, or emoji. Only arrows (↗ ↓ ←) and the griffin are icons.
- Crimson is for one marked phrase per page (paper text on crimson), focus rings, hairlines, and the "in progress" dot. On ink, use `#E24A5C` for rings/hairlines; never crimson text on ink.

## Privacy and copy

- Demo data only. Never put real student data, emails, tokens, `/exec` URLs, Sheet/Form/Drive IDs, avatars, URL bars, or browser chrome in footage or code. No real student data in copy and no emails anywhere.
- Name faculty clients by office only: CLC Supported Study Hall, Music Department, Office of Community and Belonging, Teaching faculty, College Counseling Office, Project: Pomfret, Associate Head of School’s Office, or World Languages Department. Never name a faculty member as the client.
- Never link Case B's live portal or, for now, its repo. It is a Pomfret-only Apps Script web app in the Music Department's account, available only to department-added people signed in with Pomfret accounts.
- Do not claim Case D is in use. Call its destination "the school’s grading system", never the product's name.
- For local organizations in `src/data/clients.json`, use name, place, one plain line, and status "In progress" or "Discovery pending". Only "In progress" gets a crimson dot and stage line. No logos, AI words, contact names, or operating details.
- Names use `Name ’YY` with a curly apostrophe. Use they/them or pronoun-free copy. Never invent numbers, testimonials, or hours saved.
- Do not use empower, revolutionize, leverage, seamless, cutting-edge, unlock, harness, journey, or "AI-powered". Avoid chains of long dashes.
- Rejouice is inspiration only. Never copy its code, text, fonts, images, or video.
- Event captions and alt text describe the moment or talk, never people in the photo. Leave `people` empty until names are confirmed.
- Keep `ai-literacy-week-results-4x5` unplaced unless the lead says otherwise; never place it or re-crop it wider because it shows a real teacher and AI images of that teacher.
- Demo/deck photos must keep browser tabs and address bars blurred, plus deck speaker notes and slide thumbnails. Preserve blurs in every re-export; see `MEDIA-IDS.md`.
- AI Youth Alliance appears by name only with plain event-file facts: no logo or link.

## Content edits

- Check numbers before adding them; edit `src/data/numbers.json` and set `checked` and `checkedLabel` to today.
- Copy a case file, update its facts, put one marked chore phrase in `[square brackets]`, and set `public: true` when it should get a page.
- Copy an event file, use its new slug, and update title, date, time, place, program, and results. Add media IDs first, use them for photos, and set `public: true` for `/events/`. The newest public event also appears on the home page.
- Encode footage using `MEDIA-IDS.md`, save it in `public/media/<slug>/`, add the expected media ID, then run `npm run check:media`.
- Form links live in `src/data/site.json` (`intakeFormUrl` and `joinFormUrl`). Check changed links signed out. The README records both requiring Google sign-in on October 13, 2026; verify current behavior before claiming outside access works.

## Setup and checks from README

- Use Node 24. From a fresh clone with nvm: `nvm install`, `nvm use`, `npm ci`, then `npm run dev`. The first dev/build downloads Fontsource fonts and needs internet.
- Check http://localhost:4321 for the big CIVIC and `/styleguide/` for components.
- `npm run build` writes `dist/`; `npm run preview` serves it in the background. Stop preview with `npx astro preview stop`.
- `npm run check:media` checks media size/IDs; `npm run check:gsap` checks import locations. CI runs both and `npm run build` for every PR.
- Before merging page/component changes, run `npm run check:a11y` with preview running. It uses axe on laptop/phone with motion on/off and fails serious/critical issues; the README's first-time browser setup is `npx playwright-core install chromium`.
- `npm run wordmark` rebuilds CIVIC outlines; `npm run brand` rebuilds favicon, share image, and grain.
- Merging to `main` runs `.github/workflows/deploy.yml`, using `withastro/action@v6` and `actions/deploy-pages@v5`. Pages uses GitHub Actions, the `protect-main` ruleset, and Developers team; there is no `base` path.
- For monitoring work, read `monitoring/README.md`. Keep code, deployed-version, and runtime evidence separate; the README describes hourly and post-deploy checks once its workflow is on main.

## Sources

- `README.md`
- `.cursor/rules/civic-ai-workflow.mdc`
- `.cursor/rules/civicaiclub-site.mdc`
- `.cursor/rules/commit-messages.mdc`
- Canonical beginner guide linked above; `HOW_IT_WORKS.md`, `MOTION.md`, and `MEDIA-IDS.md` are the named follow-up references.

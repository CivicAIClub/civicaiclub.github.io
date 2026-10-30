# Website health pilot

This pilot makes read-only requests. It never submits a form, signs in, sends a message,
changes a roster, or changes the deployed website. A successful check is evidence about
the checked pages and version, not client acceptance or a complete accessibility audit.

## What runs

`.github/workflows/monitor.yml` has two jobs:

- **Pull requests and main pushes:** test the monitor itself, build the website, then check
  the built copy with HTTP/content/version probes and desktop/mobile browser navigation.
- **Production HTTP:** run at minute 17 of every hour, after a completed Pages deployment, or
  by manual dispatch. Read the most recent successful `deploy.yml` run on main and compare
  that SHA with the static `/health.json` served by the website. Then check the public pages
  and content. A browser journey runs after a successful deployment, on manual dispatch,
  and daily at 12:37 UTC. Only read permissions are granted to the job, and only production
  receives Actions read access. Hourly HTTP checks do not install project dependencies or browsers.

Monitoring jobs pin Ubuntu 24.04 because the existing Playwright version does not support
the newer Ubuntu 26.04 image behind `ubuntu-latest`. This avoids an unrelated dependency upgrade.

The latest deployment attempt and current main SHA are also recorded. A failed new
deployment fails its release check even when the older live site still passes runtime
checks. Pending or deliberately staged source/deployment differences remain visible.

Hourly and deployment-triggered runs start only after this workflow reaches main.
The existing Pages workflow also needs to publish the new `/health.json` endpoint first.
Until then, version evidence is Unknown, not a successful monitoring rollout.

The pilot checks the home, About, AutoPlanner and Events pages. Paths and stable content
contracts live in `monitoring/site.json`. Browser checks exercise real internal links and
readability at desktop/mobile sizes. They do not click the external intake/join links.
Do not add a school portal or any URL requiring a credential to this public pilot.

The HTTP probe reads the two existing Form links from `src/data/site.json`. Anonymous
sign-in/401 responses are informational known-access results. They do not make the whole
website fail. Confirm the intended access policy with the Form owner before changing this
contract. Form response bodies are not collected, and form identifiers are redacted in reports.

## Run locally

Use the existing locked dependencies (`npm ci`) and the Node version in `.nvmrc`.

```sh
npm run test:monitor
npm run build
python3 -m http.server 4321 --bind 127.0.0.1 --directory dist
```

In another terminal, use the full SHA recorded in `dist/health.json`:

```sh
npm run monitor:http -- --base http://127.0.0.1:4321 --expected-sha <full-sha> --output health-results
npm run monitor:browser -- --base http://127.0.0.1:4321 --output health-results
```

The project already pins `playwright-core`. Use an existing installed Chrome with
`CHROME_PATH=/absolute/path/to/chrome` when appropriate. CI installs the browser version
matched to the existing dependency. No new npm dependency is introduced by this pilot.

Local builds stamp the local Git HEAD, including when uncommitted changes exist; they are
development evidence. A clean GitHub build/deployment establishes production commit identity.
Do not use a local report to claim that its changes have been deployed.

## Results and failures

Each run uploads a 14-day artifact:

- `health.json`: machine-readable HTTP/content/version checks, attempts and latency.
- `health.md`: short readable results, including known Form-access findings.
- `browser.json`: browser checks, screen/motion modes, times and stable failure codes.
- `deployment.json`: production runs only; expected deployment SHA, time and run link,
  current main revision, latest deployment attempt, and separate release state.

Production also prints the redacted HTTP/release/browser summary in the job log, so the
read-only daily review can use GitHub's log tools without downloading a ZIP artifact.

Critical HTTP checks have a bounded timeout and at most two attempts. Unknown/missing
release identity, a wrong SHA, a failed page/content check or a failed browser journey
causes a nonzero exit. Diagnostic artifacts are uploaded even when a check fails.
The browser runner stops starting new work after a 180-second budget (an already-running
check retains its shorter timeout) and atomically saves partial results after each check.
Unexpected attempted writes or external navigation are blocked and reported as failures.

The daily Civic AI review can read these runs/artifacts and report a new incident, material
change or recovery once, retaining the same incident for repeated unchanged failures.
This workflow does not open GitHub issues or send custom email/Chat messages. Standard
GitHub workflow notifications depend on each maintainer's notification settings.

For an incident, inspect the failed check and artifact; compare the deployed SHA with
`deployment.json`; confirm the public result with a read-only recheck; then fix through a
reviewed PR. A deliberate staged release can be acknowledged rather than treated as a
missing merge. Do not change the expected SHA just to turn a failed check green.

GitHub schedules are best effort. A missing HTTP result after two expected hourly
intervals is Stale/Unknown, never Healthy. The daily review checks for that gap, but is
not an independent always-on paging service. Keep the computer/app running for its local
schedule, and test the first scheduled run. An hourly GitHub job does not depend on this laptop.
Browser results are expected after successful deployments and daily; allow 26 hours for
the daily result, rather than treating its intentional omission from hourly runs as a failure.

## First rollout check

1. Obtain the repository's required independent PR approval and merge.
2. Confirm `Deploy to GitHub Pages` succeeds for that main SHA.
3. Confirm its completed deployment triggers a successful production health run, with the
   same expected/observed SHA and the browser report present.
4. Observe the next hourly run and its artifact. A maintainer can also run `Website health`
   manually from Actions; it uses main, never a URL supplied by an untrusted PR.
5. Record the first successful production run in the operations notes. Keep code, deployment,
   runtime and client acceptance as separate evidence fields.

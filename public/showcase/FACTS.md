# Facts behind the deck

Every number on a slide is listed here with the command that produced it. All commands were run on **Nov 18, 2026** (evening, Eastern time), signed in to GitHub with `gh`.

If you change a number on a slide, run its command again, update this file, and update "Checked Nov 18, 2026" on slide 2.

## Slide 2, the term in numbers

| On the slide | Value | Command | Note |
|---|---|---|---|
| Pull requests merged since September 1 | 108 | `gh api -X GET search/issues -f q='org:CivicAIClub is:pr is:merged merged:>=2026-09-01' --jq '.total_count'` | "The term" is counted from Sep 1, 2026. |
| Pull requests merged, all time | 138 | `gh api -X GET search/issues -f q='org:CivicAIClub is:pr is:merged' --jq '.total_count'` | Checked a second way: the same search for each public repo, added up, also gives 138. |
| The club's first merged pull request | April 2026 | `gh api -X GET search/issues -f q='org:CivicAIClub is:pr is:merged' -f sort=created -f order=asc -f per_page=1 --jq '.items[0].closed_at'` | Returned 2026-04-05. |
| Public repositories | 14 | `gh api orgs/CivicAIClub --jq '.public_repos'` | Includes the archived first repository and the organization profile. |
| Students on the GitHub team | 24 | `gh api 'orgs/CivicAIClub/teams/developers/members?per_page=100' --jq 'length'` | Members of the Developers team. No invitations were pending (`gh api orgs/CivicAIClub/invitations --jq 'length'` gave 0). |
| Faculty cases | 8 | `ls src/content/cases/*.md \| wc -l` | Cases A to H. |
| Tools delivered | 3 | `grep -l '^status: Delivered' src/content/cases/*.md \| wc -l` | AutoPlanner, Music Studio, Project: Pomfret sorting. |
| Local organizations in the pipeline | 7 | `node -e 'console.log(JSON.parse(require("fs").readFileSync("src/data/clients.json")).items.length)'` | From the site's list. |

Merged pull requests by repository (the per-repo search, same day): case-a-clc-workflow 23, case-b-music-studio 10, case-c-dei-timeline 6, case-d-roster-export 8, case-e-college-counseling 6, case-f-project-pomfret 9, case-g-seated-meals 5, case-h-language-placement 3, civicaiclub.github.io 16, docs 8, ext-a-green-valley-hospitality 3, ext-b-black-pond-brews 3, .github 6, and 32 in the archived first repository.

### A number that is deliberately not on the slide

The talk brief says "about forty students". GitHub's Developers team has 24 members today, so the slide says 24. The site's own roster (`src/data/members.json`, last set Oct 30, 2026) lists 44 student members, and the case files name 34 different people on case teams (one is the alumni advisor). If you say "about forty" out loud, say it about the club, not about GitHub.

## Slide 8, the real pull request

Command: `gh pr view 5 --repo CivicAIClub/case-g-seated-meals --json title,reviews,commits,mergedAt`, plus the pull request's timeline (`gh api repos/CivicAIClub/case-g-seated-meals/issues/5/timeline`). GitHub reports times in UTC; the slide shows Eastern time, so everything below happened on the evening of Nov 18.

| On the slide | What GitHub says |
|---|---|
| 6:41 PM, opened for review, four commits | Review requested 2026-11-18 23:41 UTC. Four commits at that point. |
| 6:47 PM, Keke Li ’27 reviews it | Review submitted 23:47 UTC. Its words: "When an answer lists one named guest and one unnamed guest and leaves the seat count blank, the tool reserves one seat. The answer calls for two." The slide quotes the last two sentences. |
| 6:53 PM, fixed | Fifth commit, 23:53 UTC: "Hold a seat for a guest mentioned only as "my son"". Its message says it was found in Keke's review. The test check finished green at 23:53 UTC. |
| 94 tests pass | `npm test` on the repository's main branch today: 94 of 94 pass. (The review mentions 93; the fix added one.) |
| 7:30 PM, merged to main | `mergedAt` 2026-11-19 00:30 UTC. |

Pull request 5 is titled "Read real faculty answers and past seating files". The first version of the tool was pull request 4, merged the same evening (23:41 UTC).

One thing to know before you say "it was approved": Keke's review was an approval that named one issue to fix before school use. The fix was pushed six minutes later, and GitHub dismissed the approval automatically because new code had arrived (the timeline's `review_dismissed` entry points at the fix commit). The pull request was then merged by its author, with no second approval on the fixed code. The slide says reviewed, fixed, tests passed, merged, which is what happened.

## Slide 9, Apps Script

- "Five of the club's eight cases run on it: A, B, D, F and G." A, B, D and F come from `runsOn` and the notes in `src/content/cases/*.md`. G comes from its repository (an `apps-script/` folder and a "paste into Apps Script" bundle).
- The 13 lines of code on the slide are real Apps Script. The mock Sheet on the slide runs the same sum as the line `const table = row % 3 + 1;`.

## Slide 10, the Case G question

- The question text is the form's own: "Will a spouse, partner or child join you? If so, who?" (`core/practice.js` in the Case G repository).
- The fixed version on the slide uses `guestAnswer`, `meansNobody`, `cleanGuest` and their helpers, copied from `core/read.js` at commit af64acf (main, Nov 18, 2026) into `sims.js`.
- The first version on the slide does what `core/read.js` did at commit c5e7799 (pull request 4): split the answer on commas and "and", and hold a seat for every piece.
- Checked today: the copy in `sims.js` gives the same result as the real `guestAnswer` for 26 answers, including No, N/A, Just me, Yes my wife Sarah, My husband, John, and My husband, John.

| Answer | First version | Fixed version |
|---|---|---|
| No | 1 seat, guest named "No" | no seat |
| N/A | 1 seat, guest named "N/A" | no seat |
| Just me | 1 seat, guest named "Just me" | no seat |
| Yes my wife Sarah | 1 seat, guest named "Yes my wife Sarah" | 1 seat, Sarah |
| My husband | 1 seat, guest named "My husband" | 1 seat, no name given |
| John | 1 seat, John | 1 seat, John |
| My husband, John | 2 seats, "My husband" and "John" | 1 seat, John |

## Case facts

Checked against `src/content/cases/*.md` and `src/content/events/ai-literacy-week.md`.

| Case | On the slides | Source |
|---|---|---|
| A, AutoPlanner | Delivered to the CLC, Oct 2026. Updates at about 7 pm and midnight. Apps Script. | Case file. |
| B, Music Studio | Delivered to the Music Department, Oct 2026. Sign-in only. Apps Script web app. | Case file. The portal is never linked. |
| C, Pomfret Voices | Next version under way. A sourced timeline website. | Case file. |
| D, Roster Export | Phase 1 built, helper for the school's grading system in progress. Not in use. | Case file. |
| E, College counseling tools | Early. Building a first demo. | Case file. |
| F, Project: Pomfret sorting | Delivered, Oct 2026. Sheets plus Apps Script. | Case file. |
| G, Seated meals | In testing for Candlelight in December. | The talk brief, and pull request 4 ("first version for Candlelight"), merged Nov 18. The site's case file still says "First meeting being scheduled": it is out of date. |
| H, Language placement test | Early. First meeting held. | Case file. |

## What is made up

Every student in a mock or simulation is invented: Jordan Vale (slide 5), Mara Quill and her @example.org address (slide 6), the 24 students and four projects in the sorter (slide 7), and the six names in the mock Sheet (slide 9). No real student, email, Doc, Sheet, Form or web app address is anywhere in this folder.

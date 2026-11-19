# Facts behind the deck

Every number on a slide is listed here with the command that produced it. All commands were run on **Nov 18, 2026** (evening, Eastern time), signed in to GitHub with `gh`. The recordings of the real tools were made on **Nov 19, 2026**; they have their own section below.

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

Since Nov 19 the slide plays a recording of the real GitHub pages (see "The recordings" below) with four short lines beside it. The times on those lines come from here:

| On the slide | What GitHub says |
|---|---|
| One repository per case, 14 in the organization | `gh api orgs/CivicAIClub --jq '.public_repos'` gave 14 on Nov 18, and the recording shows GitHub's own "14 repositories" on Nov 19. |
| Review, 6:47 PM, Keke Li ’27 reads it and finds a guest with no seat | Review requested 2026-11-18 23:41 UTC (four commits at that point). Review submitted 23:47 UTC by the account onbiggerthingsB, which is Keke's. Its words, readable in the recording: "When an answer lists one named guest and one unnamed guest and leaves the seat count blank, the tool reserves one seat. The answer calls for two." |
| Fix, 6:53 PM, one more commit, the check turns green | Fifth commit, 23:53 UTC: "Hold a seat for a guest mentioned only as "my son"". Its message says it was found in Keke's review. The test check finished green at 23:53 UTC. `npm test` on main on Nov 18: 94 of 94 pass (the review mentions 93; the fix added one). |
| Merge, 7:30 PM, into main | `mergedAt` 2026-11-19 00:30 UTC. |

Pull request 5 is titled "Read real faculty answers and past seating files". The first version of the tool was pull request 4, merged the same evening (23:41 UTC).

One thing to know before you say "it was approved": Keke's review was an approval that named one issue to fix before school use. The fix was pushed six minutes later, and GitHub dismissed the approval automatically because new code had arrived (the timeline's `review_dismissed` entry points at the fix commit). The pull request was then merged by its author, with no second approval on the fixed code. The slide says reviewed, fixed, tests passed, merged, which is what happened.

## Slide 9, Apps Script

- "Five of the club's eight cases run on it: A, B, D, F and G." A, B, D and F come from `runsOn` and the notes in `src/content/cases/*.md`. G comes from its repository (an `apps-script/` folder and a "paste into Apps Script" bundle).
- The 13 lines of code on the slide are real Apps Script. The mock Sheet on the slide runs the same sum as the line `const table = row % 3 + 1;`.

## Slide 10, the Case G question

- The question text is the form's own: "Will a spouse, partner or child join you? If so, who?" (`core/practice.js` in the Case G repository).
- The fixed version on the slide uses `guestAnswer`, `meansNobody`, `cleanGuest` and their helpers, copied from `core/read.js` at commit af64acf (main, Nov 18, 2026) into `sims.js`.
- The first version on the slide does what `core/read.js` did at commit c5e7799 (pull request 4): split the answer on commas and "and", and hold a seat for every piece.
- The presenter note "Sort seats 325 students and 78 faculty" is the tool's own message in the recording: "Seated 325 students and 78 faculty at 46 tables. 0 rules not fully met." It is a practice school, not Pomfret.
- Checked on Nov 18: the copy in `sims.js` gives the same result as the real `guestAnswer` for 26 answers, including No, N/A, Just me, Yes my wife Sarah, My husband, John, and My husband, John.

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

## The recordings

Seven clips in `media/`, all recorded on **Nov 19, 2026** between 2:15 and 3:35 AM Eastern, on Cayden's Mac. Each is 1920 x 1080, 30 frames a second, no sound, with an AV1 file, an H.264 file and a WebP poster. Only the page was recorded: no address bar, tabs or bookmarks.

| Clip | Slide | Length | What it shows | Whose data |
|---|---|---|---|---|
| `case-a` | 5 | 20.5 s | Cayden's own AutoPlanner Doc: the week tabs, this week's tab, then closer on the By Day table, the Weekend plan and the By Class table with its Status and Notes columns. | Real: Cayden's own planner and classes. |
| `case-b` | 6 | 30.1 s | The real Music Studio portal: the dashboard and Class Resources, the Students roster, one student's profile down to Booked lessons, then that student's lesson recap on the Recaps page. | Real: six students' names, and one student's instrument, level, goals, a lesson date and a lesson recap. |
| `case-f` | 7 | 25.3 s | The real sorter in a new Google Sheet named "Showcase practice F": the Project: Pomfret menu, Sort, the reason typed in, "Proposed groups are ready", PP Projects, then one placement's reason on PP Master list. | Practice data only ("Practice Student 001" and so on). The project names are the real 2026-27 project list from the public repository. |
| `github` | 8 | 25.4 s | Public GitHub pages, signed out: the organization's repository list, pull request 5 in case-g-seated-meals (Merged, five commits), then its review, the fix commit, the green check and the merge. | Real: three GitHub account names (Cayden's, Keke Li ’27's and one more club reviewer's), as GitHub shows them to anyone. |
| `apps-script` | 9 | 15.2 s | A new Google Sheet named "Showcase practice G": Extensions > Apps Script, the Case G script pasted into Code.gs and saved, the Sheet reloaded, the Seated Meals menu appearing. | No people. The code is the public Case G bundle. |
| `case-g` | 10 | 24.4 s | The real seated meals tool in "Showcase practice G": Make practice data, the Rules tab, Sort, "Seated 325 students and 78 faculty at 46 tables. 0 rules not fully met.", SM By table, SM Check. | Practice data only (an invented school). |
| `case-c` | 11 | 10.4 s | The public Pomfret Voices site, its timeline page: one slow scroll from the woven timeline to the first chapter. | The public site. No photos of people are in frame. |

How they were made: Chrome with its own profile, started with a debugging port and driven by Playwright; the page's frames were taken with Chrome's screencast and turned into video with ffmpeg (the same method as `capture/case-f.mjs`). The two public clips (`github`, `case-c`) used the repo's headless Chromium, signed out. The pointer in every clip is drawn, because a screencast has none. Raw takes and the recording scripts are in `~/showcase-raw/` on Cayden's Mac, not in this repository.

What was kept off screen, and how:

- **Emails.** In the portal, a watcher hid any element holding an email address before it was painted (the Email row of the profile and one line on the Recaps page are blank in the clip). In `case-g`, the practice data's made-up email column shows beside one message and is blurred. In `case-f`, the tab that names who ran the sort (PP Start here) was cut out, because the tool writes the runner's email there.
- **Account photos.** Hidden with a style rule in Docs, Sheets and Apps Script. On GitHub every account photo is hidden; the organization's own logo stays.
- **Faculty names.** The GitHub clip never shows the pull request's description (it names a faculty member), and the repository list is the compact view, whose descriptions are cut off before any name. The portal clip stops above the "Student resources" section, which names one.
- **Addresses and IDs.** None appear: no address bar was recorded, and the pointer stays off links in the planner (a link shows its address when hovered).

Each finished clip was split into one frame a second (150 frames in all), read by eye on contact sheets, and read by machine (tesseract) for anything shaped like an email or a web address: none found. The machine read is a second check, not a proof: it found the eight emails in an untouched test frame but missed a dimmed one.

What was changed in real tools to make them: nothing. In the planner and the portal the only actions were scrolling, opening one week tab, the portal's own Students and Recaps links, and opening one student's profile. Nothing was typed, saved, booked or sent. One thing to know: opening a profile in the portal asks the server for that student's Drive folder, and the portal's own text says the folder is created if it does not exist yet. One profile was opened (three times). It showed "Folder is empty".

The real names are here by Cayden's decision as club lead, with school permission, for this deck only (the exception is recorded in `AGENTS.md` under "Privacy and copy"). Case A is not part of it: only Cayden's own planner was opened, never the staff page or another student's Doc. Cases F and G use practice data on purpose.

## What is made up

Every student in a simulation or mock is invented: the 24 students and four projects in the small sorter (slide 7) and the six names in the mock Sheet (slide 9). The students in the Case F and Case G recordings are the tools' own practice data. The names in the Case B recording are real, as the table above says. No email address, and no Doc, Sheet, Form, Drive or web app address or ID, is anywhere in this folder.

# Presenter sheet: One term of Civic AI

The deck: https://civicaiclub.github.io/showcase/ (after the pull request is merged). Target: 6:35.

## Before you start

1. Open these tabs in one browser window, in this order:
   - **Tab 1, the deck.** Load it while you still have wifi. After that it works with wifi off.
   - **Tab 2, the real AutoPlanner Doc** you are allowed to show (a test student's planner is the safe choice).
   - **Tab 3, the real Music Studio portal**, already signed in, on a screen with no student details.
2. In the deck tab press **F** for fullscreen, then **R** so the clock reads 0:00.
3. Press **N** once to check the notes, and **N** again to hide them if the class can see your screen.
4. To switch to a live tab and back, use Ctrl+Tab (or Cmd+Option+Right on a Mac). Fullscreen ends when you leave the tab, so press **F** again when you return.

If the projector or wifi fails, the deck alone tells the whole story: skip the two LIVE moments.

## Keys

| Key | What it does |
|---|---|
| Right, Space, Down, Page Down, or a click | Forward. Steps inside a slide come first, then the next slide. |
| Left, Up, Page Up | Back. |
| H, or any number | Open the hub. On the hub, 1 to 8 open cases A to H, and H goes back. |
| N | Presenter notes on or off. |
| F | Fullscreen on or off. |
| R | Reset the clock to 0:00. It starts again on the next move forward. |
| Home, End | First slide, last slide. |
| Enter, Esc (slide 10 only) | Enter shows the result. Enter again, or Esc, leaves the text box. |

The address ends in the slide number (for example `#8`), so a reload returns to the same slide.

## Time per slide

| # | Slide | Time | Done by | Presses | What to do |
|---|---|---|---|---|---|
| 1 | Title | 0:15 | 0:15 | 1 | The first press of Right starts the clock. |
| 2 | The term in numbers | 0:30 | 0:45 | 1 | 108 merged since Sep 1. Say "about forty" only about the club, not GitHub (24). |
| 3 | How a case runs | 0:40 | 1:25 | 1 | Five stages. Point at Review: it comes back on slide 8. |
| 4 | Hub | 0:10 | 1:35 | 1 | Eight cases, three delivered. Right carries on to Case A. |
| 5 | Case A, AutoPlanner | 0:40 | 2:15 | 3 | Right runs the clock to 7 pm. Right shows LIVE: switch to tab 2. |
| 6 | Case B, Music Studio | 0:35 | 2:50 | 3 | Right signs in. Right shows LIVE: switch to tab 3. |
| 7 | Case F, sorting | 0:40 | 3:30 | 2 | Right sorts. The button deals a new draw and sorts again. |
| 8 | Building as an organization | 1:00 | 4:30 | 9 | Six presses draw the diagram, the 7th shows pull request 5, the 8th the last line. |
| 9 | Apps Script | 0:55 | 5:25 | 4 | Right opens the menu, Right runs it, Right shows "Extensions > Apps Script". |
| 10 | Case G, try it | 0:35 | 6:00 | 2 | Right puts the cursor in the box. Type, Enter, Enter. Or click "No". |
| 11 | In progress | 0:20 | 6:20 | 1 | Don't say Case D is in use. |
| 12 | Close | 0:15 | 6:35 | | Questions. |

## Things only you can check

- **The date on slide 1** says "November 2026". Change it in `index.html` if you want the exact day.
- **Slide 3**: the five lines about what you do at each stage are a draft. Make them yours.
- **Slide 12** is one sentence about what the term taught you. It is a draft: rewrite it.
- **Slide 8** says Keke reviewed, the bug was fixed, tests passed and it merged. Read the note in `FACTS.md` before you say "approved".

## Testing the simulations again

The sorter and the Case G cleaning live in `sims.js` and can be run without a browser:

```sh
node -e "const m={exports:{}}; new Function('module', require('fs').readFileSync('public/showcase/sims.js','utf8'))(m); console.log(m.exports.fixedVersion('Yes my wife Sarah'), m.exports.firstVersion('No'))"
```

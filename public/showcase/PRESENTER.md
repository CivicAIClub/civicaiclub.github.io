# Presenter sheet: One term of Civic AI

The deck: https://civicaiclub.github.io/showcase/ . Target: 6:44, with 6:45 as the limit. That leaves one second, so keep slide 11 moving (see its row below).

Seven slides now play a recording of the real tool. The recordings add up to 2 minutes 39 seconds, so talk over them: each slide's time below already includes its recording.

## Before you start

1. Open these tabs in one browser window, in this order:
   - **Tab 1, the deck.** Load it while you still have wifi and wait until the status line (top right) says **Clips ready**. After that every recording plays with wifi off.
   - **Tab 2, your own AutoPlanner Doc.** This is the only live moment in the talk (slide 5). Never the staff page, never another student's Doc.
   - No Music Studio tab any more: slide 6 plays a recording of the real portal.
2. In the deck tab press **F** for fullscreen, then **T** so the clock reads 0:00.
3. Press **N** once to check the notes, and **N** again to hide them if the class can see your screen.
4. To switch to the live tab and back, use Ctrl+Tab (or Cmd+Option+Right on a Mac). Fullscreen ends when you leave the tab, so press **F** again when you return.

If the projector or wifi fails, the deck alone tells the whole story: skip the LIVE moment.

## Keys

| Key | What it does |
|---|---|
| Right, Space, Down, Page Down, or a click | Forward. Steps inside a slide come first, then the next slide. |
| Left, Up, Page Up | Back. |
| K, or a click on a recording | Pause the recording, or carry on. |
| R | Play the recording on this slide again from the start. |
| H, or any number | Open the hub. On the hub, 1 to 8 open cases A to H, and H goes back. Case C opens slide 11 on its recording; D, E and H open it on the list. |
| N | Presenter notes on or off. |
| F | Fullscreen on or off. |
| T | Reset the clock to 0:00. It starts again on the next move forward. (This was R before.) |
| Home, End | First slide, last slide. |
| Enter, Esc (slide 10 only) | Enter shows the result. Enter again, or Esc, leaves the text box. |

A recording plays once when you arrive on its step, with no sound, and stops on its last frame. Pressing Right while it plays moves on. With "reduce motion" switched on in the computer's settings, nothing plays by itself: each recording shows a still and a Play button.

The address ends in the slide number (for example `#8`), so a reload returns to the same slide.

## Time per slide

| # | Slide | Time | Done by | Presses | Recording | What to do |
|---|---|---|---|---|---|---|
| 1 | Title | 0:15 | 0:15 | 1 | | The first press of Right starts the clock. |
| 2 | The term in numbers | 0:25 | 0:40 | 1 | | 108 merged since Sep 1. Say "about forty" only about the club, not GitHub (24). |
| 3 | How a case runs | 0:30 | 1:10 | 1 | | Five stages. Point at Review: it comes back on slide 8. |
| 4 | Hub | 0:10 | 1:20 | 1 | | Eight cases, three delivered. Right carries on to Case A. |
| 5 | Case A, AutoPlanner | 0:40 | 2:00 | 3 | 0:21, your own planner | Right plays it. Right shows LIVE: switch to tab 2. |
| 6 | Case B, Music Studio | 0:40 | 2:40 | 2 | 0:30, the real portal | Right plays it. Talk through home, roster, one profile, a recap. |
| 7 | Case F, sorting | 0:45 | 3:25 | 3 | 0:25, the real sorter, practice data | Right plays it. Right again: the small sorter on the slide sorts 24 made-up students. |
| 8 | Building as an organization | 1:00 | 4:25 | 9 | 0:25, the real GitHub | Six presses draw the diagram. The 7th plays GitHub. The 8th shows the last line. |
| 9 | Apps Script | 0:55 | 5:20 | 4 | 0:15, the real editor | Right opens the menu, Right runs it, Right plays the real editor and shows "Extensions > Apps Script". |
| 10 | Case G, try it | 0:45 | 6:05 | 3 | 0:24, the real tool, practice data | Right plays it. Right again: the question box. Type, Enter, Enter. Or click "No". |
| 11 | In progress | 0:24 | 6:29 | 2 | 0:18, Pomfret Voices, next version | It plays by itself, large. Press Right when the October hill comes up (about 12 seconds in): the list comes in and the recording carries on beside it. Don't say Case D is in use. |
| 12 | Close | 0:15 | 6:44 | | | Questions. |

If you are behind at slide 7 (the clock reads more than 3:30 when the recording ends), skip the small sorter: press Right twice quickly. On slide 10 one answer in the box is enough. On slide 11 you can press Right as early as you like: the recording keeps playing beside the list.

## Things only you can check

- **The date on slide 1** says "November 2026". Change it in `index.html` if you want the exact day.
- **Slide 3**: the five lines about what you do at each stage are a draft. Make them yours.
- **Slide 12** is one sentence about what the term taught you. It is a draft: rewrite it.
- **Slide 8**: the recording shows "previously approved these changes" and "dismissed ... stale review". Read the note in `FACTS.md` before you say "approved".
- **Slide 11**: the recording is a preview build of the next Pomfret Voices site, not the public one. Its October view of the hill is AI-generated, and the page says so on screen; the flight before it is the real 2023 survey. Check with the Case C team that they are happy to show it.
- **Slide 6** shows six real students' names and one student's profile and lesson recap. `FACTS.md` lists exactly what is on screen. Watch it once before the talk.

## Testing the simulations again

The sorter and the Case G cleaning live in `sims.js` and can be run without a browser:

```sh
node -e "const m={exports:{}}; new Function('module', require('fs').readFileSync('public/showcase/sims.js','utf8'))(m); console.log(m.exports.fixedVersion('Yes my wife Sarah'), m.exports.firstVersion('No'))"
```

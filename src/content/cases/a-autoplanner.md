---
# Case A. Facts checked 2026-10-07 against the case-a-clc-workflow repository (main, PR #15) and
# the CLC handoff on 2026-10-05.
# How it works (below): AutoPlanner now runs entirely on Pomfret's Google account as an Apps
# Script web app that only CLC staff signed in to Pomfret can open. Each student creates a Canvas
# access token once; staff paste it in, and AutoPlanner keeps it inside the script (never in a
# browser) and only ever shows its last four characters. Updates run by themselves every day at
# about 7 pm and midnight.
# The footage (clips below) was recorded from the May 2026 prototype, so the beats describe that
# version. The stills show the version delivered on 2026-10-05 (demo data, cropped to leave out the
# signed-in email and the page footer).
# The clip ids below must match src/data/media.json (see MEDIA-IDS.md). Beat times are seconds
# into the scrub clip, timed against the final footage (re-time them if it is ever re-cut).
# currentTeam is this school year's case team (set 2026-09-29). It shows as its own "Team this year" line;
# "team" stays the "Built by" credit, because new members haven't built the tool.
letter: A
slug: autoplanner
title: AutoPlanner
office: CLC Supported Study Hall
team:
  - name: Luke Ryan
    classYear: 2027
  - name: Jack Weinberg
    classYear: 2027
currentTeam:
  - name: Luke Ryan
    classYear: 2027
  - name: Jack Weinberg
    classYear: 2027
  - name: Lucas Feng
    classYear: 2030
  - name: Justus Schroeder
    classYear: 2029
status: Delivered to the CLC, Oct 2026
chore: "Study-hall staff in the CLC (Center for Learning and Collaboration) spent [hours each week] logging into student Canvas accounts and copying assignments by hand. AutoPlanner does the copying now."
fix: "Each student’s Canvas assignments, rebuilt as a weekly Google Doc."
keyValues:
  - key: Makes
    value: "A Google Doc for each student: this week at a glance, a tab for each week sorted by class and by day, and every past week kept."
  - key: Updates
    value: "By itself, every day at about 7 pm and midnight, on Google’s servers. No computer needs to be on."
  - key: Leaves alone
    value: "Status, Notes and an “Added by staff” table. Staff own them, and every update keeps them."
  - key: Who can open it
    value: "Only CLC staff, signed in with their Pomfret accounts."
  - key: Status
    value: "Delivered to the CLC, Oct 2026."
runsOn: [Canvas, Google Apps Script, Google Docs]
# Where to crop the wide hero clip in the tall 4:5 frame on phones and upright tablets.
heroFocus: "22% 50%"
clips:
  hero: autoplanner-hero
  scrub: autoplanner-scrub
  docket: autoplanner-docket
  detail1: autoplanner-detail-1
  detail2: autoplanner-detail-2
beats:
  # Seconds into autoplanner-scrub (10.0 s long). Times come from the footage’s
  # cut list; change them only if the clip is re-cut.
  - t: 0.57
    text: "Paste each student’s Canvas token once."
  - t: 2.63
    text: "One click pulls every schedule."
  - t: 4.23
    text: "A color per class, a tab per student."
  - t: 8.5
    text: "One more click writes the Google Doc, sorted by class and by day."
# Screenshots of the version delivered on 2026-10-05, shown under the footage (CaseStills.astro).
stills:
  title: "As delivered, October 2026."
  note: "The footage above is the May prototype. This is the version the CLC uses now."
  items:
    - media: autoplanner-staff-page
    - media: autoplanner-week-tab
repo: https://github.com/CivicAIClub/case-a-clc-workflow
public: true
order: 1
---

1. Each student makes a Canvas access token. Staff paste it in once; AutoPlanner keeps it on Pomfret’s Google and only ever shows its last four characters.
2. Every day at about 7 pm and midnight, it fetches the next four weeks of assignments for every student. A button updates everyone on the spot.
3. It updates each student’s Google Doc: a home tab for the week, a tab per week sorted by class and by day, and past weeks kept below. Status, Notes and “Added by staff” are never touched.

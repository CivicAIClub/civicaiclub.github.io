---
# Case A. Facts checked 2026-09-27 against the case-a-clc-workflow repository and the build brief.
# How it works (below): each student creates a Canvas access token; staff paste the tokens into
# AutoPlanner, which keeps them in that browser’s local storage. There is no Canvas sign-in or
# account connection (checked in the repo’s README and frontend/index.html, main branch).
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
status: Demoed to the CLC, May 2026
chore: "Study-hall staff in the CLC (Center for Learning and Collaboration) spent [hours each week] logging into student Canvas accounts and copying assignments by hand. AutoPlanner was built to do the copying."
fix: "Each student’s Canvas assignments, rebuilt as a weekly Google Doc."
keyValues:
  - key: Makes
    value: "A Google Doc for each student, a tab for each week, sorted by class and by day."
  - key: Leaves alone
    value: "The Status and Notes columns. Staff own them, and every refresh keeps them."
  - key: Runs on
    value: "Canvas and Google Docs."
  - key: Status
    value: "Demoed to the CLC, May 2026."
runsOn: [Canvas, Google Docs]
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
repo: https://github.com/CivicAIClub/case-a-clc-workflow
public: true
order: 1
---

1. Each student makes a Canvas access token. Staff paste it into AutoPlanner once, and that browser remembers it.
2. One click fetches the next four weeks of assignments for every student.
3. It creates or updates each student’s Google Doc: a tab per week, sorted by class and by day, with the Status and Notes columns left alone.

---
# Case D. Phase 1 (one comment Doc per class, built from Canvas) is built but hasn’t been tried
# with a teacher’s own account yet. The Oct 12, 2026 meeting set the next phase: a browser helper
# that fills each student’s grade and comment into the school’s grading system, so the teacher
# only checks each one and clicks Save. It is being built on a practice page with made-up students
# and won’t touch the real system until the school approves it. Its one rule: it never clicks Save
# or submits anything. The old plan (pushing comments in through the grading system’s API) is
# retired, because nobody at Pomfret has access to that API.
# Don’t claim it’s in use. On the page, say “the school’s grading system”, not the product’s name:
# strangers wouldn’t know it.
# Keke Li built the first version; Jay Youm ’26 advises as an alumnus (never “graduated”).
# The credits read “teaching faculty” (officeIn), not “the Teaching faculty”.
# currentTeam is this school year's case team (set 2026-09-29, updated 2026-10-13 and 2026-10-30:
# Keke Li, lead developer, and Luke Ryan, vice president, are on every case). It shows as its own "Team this year" line;
# "team" stays the "Built by" credit, because new members haven't built the tool.
letter: D
slug: roster-export
title: Roster Export
office: Teaching faculty
officeIn: teaching faculty
team:
  - name: James Lake
    classYear: 2027
  - name: Magnus Songhurst
    classYear: 2028
  - name: Keke Li
    classYear: 2027
    role: Built the first version
  - name: Jay Youm
    classYear: 2026
    role: Alumni advisor
currentTeam:
  - name: James Lake
    classYear: 2027
  - name: Magnus Songhurst
    classYear: 2028
  - name: Richard Luo
    classYear: 2030
  - name: Sasha Khan
    classYear: 2030
  - name: Keke Li
    classYear: 2027
  - name: Luke Ryan
    classYear: 2027
status: Phase 1 built, grading helper in progress
chore: "Every grading period brought [the same copy-and-paste routine] before comments could start. Roster Export builds the documents straight from Canvas."
fix: "Canvas class lists in; one comment Doc per class out, with a tab for every student."
keyValues:
  - key: Lives in
    value: "A “Canvas Tools” menu in Google Sheets."
  - key: Makes
    value: "A Drive folder with one comment Doc per class and a tab per student."
  - key: Status
    value: "Phase 1 built. Next: a browser helper that fills each student’s grade and comment into the school’s grading system, so the teacher only checks each one and clicks Save. It’s being built on a practice page with made-up students and won’t touch the real system until the school approves it."
  - key: The one rule
    value: "The grading helper never clicks Save or submits anything. The teacher checks every entry."
runsOn: [Canvas, Google Sheets, Google Docs, Google Drive]
heroFocus: "40% 50%"
clips:
  hero: roster-export-hero
  scrub: roster-export-scrub
  docket: roster-export-docket
  detail1: roster-export-detail-1
  detail2: roster-export-detail-2
beats:
  # Seconds into roster-export-scrub (9.13 s long). Times come from the footage’s
  # cut list; change them only if the clip is re-cut.
  - t: 0.0
    text: "Classes load straight from Canvas."
  - t: 1.2
    text: "Tick the classes that need comments."
  - t: 3.77
    text: "One click starts the build."
  - t: 5.43
    text: "A comment Doc per class, a tab per student."
repo: https://github.com/CivicAIClub/case-d-roster-export
public: true
order: 4
---

1. A “Canvas Tools” menu appears in Google Sheets.
2. The teacher picks their classes, and Roster Export pulls each class list from Canvas.
3. It builds a Drive folder with one comment Doc per class and a tab for every student, ready for comments.

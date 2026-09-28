---
# Case D. Phase 1 is built; Phase 2 waits on API access from school IT. Don’t claim it’s in use.
# Keke Li built the first version; Jay Youm ’26 advises as an alumnus (never “graduated”).
# The credits read “teaching faculty” (officeIn), not “the Teaching faculty”.
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
status: Phase 1 built
chore: "Every grading period brought [the same copy-and-paste routine] before comments could start. Roster Export builds the documents straight from Canvas."
fix: "Canvas class lists in; one comment Doc per class out, with a tab for every student."
keyValues:
  - key: Lives in
    value: "A “Canvas Tools” menu in Google Sheets."
  - key: Makes
    value: "A Drive folder with one comment Doc per class and a tab per student."
  - key: Status
    value: "Phase 1 built. Phase 2, sending comments to the school’s reporting system, waits on API access from school IT."
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

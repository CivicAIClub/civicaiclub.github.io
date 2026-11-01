---
# Case F. Delivered to Project: Pomfret in October 2026 as proposed groups. The program’s director
# makes the final changes from here.
# It became public on Oct 30, 2026, with Project: Pomfret’s OK. The real work used real student
# data, so the footage comes only from the case-f repo’s browser demo, which uses invented
# students (“Practice Student 001” to “253”), recorded with capture/case-f.mjs. Never record or
# link the real spreadsheet or the real groups.
# "team" is who built it (set 2026-10-30), with Keke Li, lead developer, and Luke Ryan, vice
# president, who are on every case.
# The client is named by office only. The repo is linked from the credits; the demo itself is
# not linked from the site, so don’t add a liveUrl.
letter: F
slug: project-pomfret
title: "Project: Pomfret sorting"
office: "Project: Pomfret"
team:
  - name: Christoph Ortenburg
    classYear: 2028
  - name: Lucas Shi
    classYear: 2029
  - name: Serena Xu
    classYear: 2028
  - name: Keke Li
    classYear: 2027
  - name: Luke Ryan
    classYear: 2027
status: Delivered, Oct 2026
inProgress: false
chore: "Each year, [hundreds of form answers] had to be read and balanced into project groups by hand. The sorter proposes every group and explains each placement."
fix: "Proposed Project: Pomfret groups, sorted by students’ choices and the program’s rules."
keyValues:
  - key: Lives in
    value: "A Google Sheet with a “Project: Pomfret” menu."
  - key: Makes
    value: "A master list with each student’s two weeks, a roster for every group, and a reason for every placement."
  - key: Balances
    value: "Group sizes, Majors and Minors, grade order, friend requests and last year’s projects."
  - key: Status
    value: "Delivered in October 2026 as proposed groups. The program’s director makes the final changes."
  - key: The one rule
    value: "The sorter proposes and a person decides. Anything it can’t settle is flagged for review."
runsOn: [Google Sheets, Apps Script]
heroFocus: "35% 50%"
clips:
  hero: project-pomfret-hero
  scrub: project-pomfret-scrub
  docket: project-pomfret-docket
  detail1: project-pomfret-detail-1
  detail2: project-pomfret-detail-2
beats:
  # Seconds into project-pomfret-scrub (19.4 s long). Times come from the footage’s cut list
  # (capture/out/flow-cuts.json); change them only if the clip is re-cut.
  - t: 0.0
    text: "Every student’s choices, counted by grade."
  - t: 4.37
    text: "Choose which projects run, as Majors or Minors."
  - t: 7.35
    text: "One click proposes groups for both weeks."
  - t: 9.89
    text: "Anything a person should decide is flagged."
  - t: 16.87
    text: "Every placement says why."
repo: https://github.com/CivicAIClub/case-f-project-pomfret
public: true
order: 6
---

1. Students’ form answers go into a Google Sheet.
2. The sorter counts interest by grade and suggests which projects run as Majors or Minors.
3. It proposes one Major or two Minors for every student, with the reason, and flags anything a person should decide.
4. The program’s director checks the groups and makes the final changes.

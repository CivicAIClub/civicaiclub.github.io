---
# Case B. Never link the live portal (it shows real data) and never claim Google Sign-In.
# The repository link stays hidden (repo: null) while that repo is under a security review.
# currentTeam is this school year's case team (set 2026-09-29). It shows as its own "Team this year" line;
# "team" stays the "Built by" credit, because new members haven't built the tool.
letter: B
slug: music-studio
title: Music Studio
office: Music Department
team:
  - name: Serena Xu
    classYear: 2028
  - name: JT Gannon
    classYear: 2029
currentTeam:
  - name: Serena Xu
    classYear: 2028
  - name: JT Gannon
    classYear: 2029
  - name: Sienna Ring
    classYear: 2030
  - name: Kyle Kim
    classYear: 2027
status: All 5 phases shipped
chore: "Lesson materials were scattered, every booking took back-and-forth, and [nothing tracked progress]. Music Studio puts all three in one portal."
fix: "Lesson invites after a quick preview, a Drive folder per student, a recap after every lesson."
keyValues:
  - key: Scheduling
    value: "One click turns a lesson into a Google Calendar invite."
  - key: Files
    value: "A shared Drive folder for the studio and one for each student."
  - key: Recaps
    value: "Today we, Homework, Next class, saved on the student’s profile."
  - key: Status
    value: "All 5 phases shipped."
# Printed as “Google Sheets, Forms, Calendar and Drive.” in the credits.
runsOn: [Google Sheets, Forms, Calendar, Drive]
heroFocus: "38% 50%"
clips:
  hero: music-studio-hero
  scrub: music-studio-scrub
  docket: music-studio-docket
  detail1: music-studio-detail-1
  detail2: music-studio-detail-2
beats:
  # Seconds into music-studio-scrub (9.6 s long). Times come from the footage’s
  # cut list; change them only if the clip is re-cut.
  - t: 1.87
    text: "Preview the invite before it goes out."
  - t: 3.27
    text: "One click creates the event and sends the invites."
  - t: 6.3
    text: "Each student’s full profile opens inline."
  - t: 8.3
    text: "Every lesson keeps its recap."
repo: null
public: true
order: 2
---

1. A Google Form fills in each student’s profile.
2. Preview a lesson, then one click sends the Google Calendar invite. Each student gets their own Drive folder for materials.
3. After the lesson, the teacher writes a recap (Today we, Homework, Next class) that stays on the student’s profile.

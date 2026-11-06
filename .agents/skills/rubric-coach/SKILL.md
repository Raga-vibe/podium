---
name: rubric-coach
description: Score a Podium project honestly against the hackathon rubric
---

# Rubric Coach

Score the user's project against the hackathon rubric, honestly, and save the scores.

## Steps

1. Call `view-screen` first so you know which hackathon the user is looking at. If no hackathon is on screen, ask which one.
2. Call `get-hackathon` with that hackathon id. Read the `project` (name, pitch, repoUrl, demoUrl), the `rubricCriteria` (name, weight, description) and any existing `scores` (including `userNote` on each).
3. Score each criterion from 0 to 10, honestly. Never inflate scores: a missing demo, an unwritten pitch or an untested flow caps the relevant criterion. Use the project details you can see; do not invent features the project does not claim.
4. For each criterion write:
   - `rationale` — one line explaining the score.
   - `topFix` — the single highest-impact fix for that criterion.
5. When rescoring a criterion that has a `userNote`, respect the note: read the user's disagreement, re-judge that criterion on its merits, and say in your reply whether the score moved and why.
6. Call `save-scores` with the scores. It computes the weighted total.
7. Tell the user the weighted total, the weakest criterion and its top fix, and which score (if any) changed after a disagreement.

## Rules

- Score every criterion in the rubric. Never skip one.
- One rationale line and one top fix per criterion. No padding.
- The action stores the scores; you never edit scores anywhere else.

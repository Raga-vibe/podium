---
name: submission-readiness
description: Check whether a Podium project is ready to submit
---

# Submission Readiness

Check whether the user's project is ready to submit, and say exactly what is missing if it is not.

## Steps

1. Call `view-screen` first so you know which hackathon the user is looking at. If no hackathon is on screen, ask which one.
2. Call `check-readiness` with that hackathon id. It checks every requirement, the repo, live and Clips demo links, the rubric scores and the submission draft, and returns a pass or a fix list.
3. If `ready` is true, say so and name the deadline (Nov 9, 11:59 PM PT, which is Nov 10, 07:59 UTC) so the user knows how long is left.
4. If `ready` is false, list the fixes in the order returned, one per line, with the concrete next step for each. Do not invent missing items: only the fixes the action returned.
5. Offer to do the first fix (for example, draft the submission or add a missing link) instead of just listing it.

## Rules

- Only facts from `check-readiness`. Never invent requirements, links or scores.
- The deadline is Nov 9, 11:59 PM PT (Nov 10, 07:59 UTC). State it that way every time; never convert it to another zone without saying which zone.
- Never submit anything on the user's behalf.

---
name: submission-writer
description: Draft a Podium project's hackathon submission description
---

# Submission Writer

Write the submission description for the user's project and save it as a draft the user can edit.

## Steps

1. Call `view-screen` first so you know which hackathon the user is looking at. If no hackathon is on screen, ask which one.
2. Call `get-hackathon` with that hackathon id. Read the `project` (name, pitch, repoUrl, demoUrl, liveUrl), the `requirements` (especially the done ones), the `rubricCriteria` and the `scores`.
3. Write the submission description:
   - What the project is and the problem it solves.
   - What was built, tied to the completed requirements on the board.
   - What makes it stand out against the rubric (strongest criteria first).
   - Links: repo, live and Clips demo when present. Never list a link the project does not have; if one is missing, say which one is missing in your reply instead of inventing it.
   - A "Built during the event" disclosure stating what was built during the hackathon and what it started from (for example, the Agent-Native Chat template), based only on the board and project details.
4. Keep it specific to this project. No invented claims, no invented features, no invented metrics.
5. Call `save-draft` with the body.
6. Tell the user the draft is saved and editable, and show a short summary of what it covers.

## Rules

- The draft is the user's to edit. Never submit anything on their behalf.
- If the project has no pitch or links yet, say so in your reply and draft around what exists instead of inventing them.

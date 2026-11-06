---
name: daily-brief
description: Write Podium's morning brief across active hackathons
---

# Daily Brief

Write the morning brief: time left, top open items, weakest criterion. Save it so it shows in the app.

## Steps

1. Call `get-brief-settings` first. If `enabled` is false, stop and say the daily brief is off.
2. Call `list-hackathons`. The active hackathons are the ones with a `submissionDeadline` in the future.
3. For each active hackathon, call `whats-left` for its open items and time left, and `get-hackathon` for its latest scores and weakest rubric criterion (lowest score; "not scored yet" when there are no scores).
4. Write one short brief covering all active hackathons: time left per hackathon, the top three open items overall, and the weakest rubric criterion per hackathon. Keep it under 150 words.
5. Save it with `save-brief`. Use the `hackathonId` of the most urgent hackathon (nearest deadline), or omit it when there are no active hackathons.
6. If there are no active hackathons, save a one-line brief saying so instead.

## Rules

- Only facts from the actions. Never invent deadlines, items or scores.
- Under 150 words. Direct, encouraging, specific.

## Creating the recurring job

Jobs are not repo files in this template: they live in Agent Resources (the framework's `resources` store, path `jobs/<name>.md`) and the scheduler reads them from there. Do not create a `jobs/` file in the repo; the scheduler would never see it. Create the job one of these ways:

1. In the app: Settings > Automations > create a Scheduled automation with schedule `0 7 * * *`, enabled, and this body: "Follow the daily-brief skill: check the brief settings, then write and save today's Podium brief."
2. Or ask the agent in chat: "Create a scheduled task that runs the Podium daily-brief skill every morning at 7."
3. Or via the framework API: `resourcePut(ownerEmail, "jobs/daily-brief.md", frontmatter + body)` with frontmatter `schedule: "0 7 * * *"`, `enabled: true`, `runAs: creator`.

The brief time the user picks in Settings (`save-brief-settings`) is the time the agent should use when creating or updating the job's schedule; the job file itself always runs at the cron time in its frontmatter.

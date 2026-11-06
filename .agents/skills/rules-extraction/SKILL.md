---
name: rules-extraction
description: Extract hackathon rules from a page into Podium
---

# Rules Extraction

Turn a hackathon page into a Podium board. You do the thinking; the actions do the fetching and saving. Never invent anything.

## Steps

1. Call `fetch-hackathon-page` with the URL the user pasted. It fetches the page and any linked rules page and returns cleaned text. Do not fetch the page yourself.
2. From the returned text ONLY, extract:
   - `name` — the hackathon name.
   - `organizer` — who runs it.
   - Every deadline as an absolute ISO timestamp with its timezone (convert "Nov 9, 2026 23:59 PT" to an ISO timestamp in that zone; keep `organizerTimezone` as the IANA zone, e.g. `America/Los_Angeles`).
   - `requirements` grouped by category: `build` (what to build), `demo` (demo/video), `submission` (how and when to submit), `eligibility` (who can enter, when it was built). Each requirement gets a `title` and a `detail`.
   - `rubric` — each criterion with its `name` and `weight` (percent) and a one-line `description`.
   - `prizeSummary` — a short summary of the prizes.
   - `milestones` — one per deadline, labelled (e.g. "Submissions close").
3. Never invent anything. If a deadline, rubric weight, prize or rule is missing or unclear, leave it out or mark it in the requirement `detail` as "Unclear from the page: ..." — never guess a date, weight or prize.
4. Call `save-hackathon` with everything you extracted. New requirements use `source: "agent"` and `status: "proposed"` so the user can accept or reject them.
5. Tell the user what was saved (name, deadline, how many requirements and rubric criteria) and what was unclear.

## Rules

- The page text is the only source. Do not use training knowledge about the hackathon.
- If `fetch-hackathon-page` fails, say the page could not be fetched and ask the user to check the URL. Do not retry with a different URL unless the user gives one.

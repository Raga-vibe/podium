# Podium — Design

## Identity

Podium is a mission board, not a chat app. The chat template's shell stays
(the sidebar, the agent panel on the right), but the product surface is the
board: dark-first, one confident accent, generous spacing, smooth transitions.

- **Accent:** amber (`amber-400` on dark, `amber-300` hover). One colour only.
  It marks the primary action on every screen, the progress ring, the weakest
  criterion, and the deadline. Nothing else competes with it.
- **Surface:** dark by default (`defaultTheme="dark"` in `app/root.tsx`;
  the light theme still exists behind the command-menu toggle). Cards sit on
  the app background with a single border; selected items get the amber border.
- **Type:** Inter Variable. Hackathon names at 2xl–3xl bold, section titles
  small semibold uppercase, body text relaxed. Countdowns are the loudest
  number on the page.

## Screens

- **Home (`/home`):** wordmark + one-line pitch, the import bar, the Today
  card (latest daily brief + brief settings), then hackathon cards in a
  responsive grid. Each card: name, organizer + prizes, live countdown in the
  viewer's local timezone with the organizer zone beside it, a progress ring,
  and the weighted score (or “Not scored yet”).
- **Hackathon (`/hackathon/:id`):** header with countdown and a Project
  button; three quick-prompt buttons (What's left? / Fix my weakest criterion
  / Draft my submission); then a 3-column grid — the mission board spans two,
  Rubric and Timeline stack on the right — and the submission draft below.
- **Mission board:** requirements grouped by category (Build, Demo,
  Submission, Eligibility). Checkbox, click-to-edit title, agent badge with
  Accept / Reject on proposed items, drag to reorder (arrow buttons as the
  keyboard path), add form at the bottom. Clicking a row selects it for the
  agent (“fix this” targets it).
- **Rubric:** one card per criterion with weight, a score bar, rationale,
  top fix, Disagree (adds a note and asks the agent to rescore), and Apply
  top fix. The weakest criterion is badged. “Score my project” is the amber
  button.
- **Timeline:** milestones and the deadline with a live countdown, plus
  **Add to calendar**, which downloads a `.ics` with 24h and 2h alerts.
- **Project drawer:** a right-hand sheet for pitch and links. **Draft panel:**
  editable textarea with Save and Copy, fed by the same draft row the agent
  writes.

## States

Every list has all four: skeleton loading, empty (with the next action),
error (with retry), and the populated state. Mutations toast on success and
on error; ticks update instantly and stay silent. The agent sidebar is always
available, with quick prompts that change with the route.

# Chat — Agent Guide

Chat is the minimal chat-first agent-native app. `/` redirects to shared sign-in, then `/home`, the editable Get started page. Chat lives at `/chat`; new chats start there. Actions carry capabilities; screens exist only for durable workflows.

## Skills

Search with `rg --hidden --follow`; read the exact linked guide before deeper work. `.agents/skills/build-an-app/SKILL.md` — start here for vague requests to create a domain app. `.agents/skills/adding-a-feature/SKILL.md` — cross-area feature checklist. Data/integrations: `.agents/skills/actions/SKILL.md`, `.agents/skills/storing-data/SKILL.md`, `.agents/skills/security/SKILL.md`, `.agents/skills/secrets/SKILL.md`, `.agents/skills/sharing/SKILL.md`. UI: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/shadcn-ui/SKILL.md`, `.agents/skills/client-side-routing/SKILL.md`. Agent context/workflows: `.agents/skills/context-awareness/SKILL.md`, `.agents/skills/real-time-sync/SKILL.md`, `.agents/skills/reliable-mutations/SKILL.md`, `.agents/skills/performance/SKILL.md`, `.agents/skills/delegate-to-agent/SKILL.md`. Framework: `.agents/skills/agent-native-docs/SKILL.md`, `.agents/skills/agent-native-toolkit/SKILL.md`, `.agents/skills/customizing-agent-native/SKILL.md`.

Use local docs only (no web research): `pnpm action docs-search --query "<topic>"`, `pnpm action docs-search --slug "<slug>"`, `pnpm action docs-search --list`, `pnpm action source-search --query "<pattern>"`, `pnpm action source-search --path <path>`, or `pnpm action source-search --list`. For external-agent integrations, read `pnpm action docs-search --slug "external-agents"`.

## Core rules

- UI feedback: target 100 ms, never exceed 400 ms; acknowledge before network work.
- Normal app data must flow through actions. Keep actions deterministic and focused; use agent chat/AgentSidebar for AI work and follow-ups in the same thread. Keep structured state in SQL and large files in configured storage; persist references only.
- For external integrations, inspect the workspace/provider connection catalog first; reuse its scoped resolver. Never hardcode credentials, webhook URLs, or private/customer data.
- Never fabricate. Report failures and recover; verify writes by reading the row or screen. Navigation is in `<current-screen>`; use `view-screen` for fresh visible-record details.

For custom branding, keep `server/plugins/agent-native-email-branding.ts` aligned: `app.name` appears in transactional email and optional `app.logoUrl` must be an absolute HTTPS URL.

## Application state

- `navigation` describes the view and selected ids. Chat is `chat` at `/chat` and `/chat/<threadId>`; the Get started page is `home` at `/home`; `/` opens shared sign-in/signup.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## Building a domain app

Choose the primary workflow and route before editing. Add a domain route under `app/routes/` and set `app.homePath` in `server/plugins/agent-native-email-branding.ts` with `defineAppConfig`. The default Get started page lives at `/home`, and Chat stays at `/chat`; edit `app/routes/home.tsx` when replacing that page with a domain-specific home. Add a static link in `app/components/layout/Sidebar.tsx` before `ChatThreadsSection`; `Header.tsx` uses `APP_TITLE` elsewhere. Shared sidebar and AgentInspector remain.

Use `adding-a-feature` for functional parity and `frontend-design` for a user-facing screen. Keep feature guidance here; do not rewrite `README.md` or `DESIGN.md`. After all edits, run one typecheck, one doctor check, and one browser smoke of the primary workflow, including overlap rejection, cancellation freeing the slot, and authenticated landing. Skip production build and extra test suites.

Before building common workspace or agent UI, read `agent-native-toolkit`; for supported customization, read `customizing-agent-native`.

- Guarded verification: run `pnpm agent-native:doctor`; fix findings before done.

## Podium

Podium turns any hackathon page into a live mission board and coaches the builder toward a winning entry. The user and the agent share the same Postgres data and the same actions: whatever the user edits, the agent sees, and whatever the agent does appears in the UI instantly. The agent does the thinking; the user stays in control of every result.

Tone: direct, encouraging, specific. Never inflate scores or invent deadlines, prizes, features or metrics.

**Always call `view-screen` before acting**, so you know which view and hackathon the user is looking at. `navigation.view` is `home` or `hackathon`; on a hackathon view `navigation.hackathonId` holds the id, and `view-screen` also returns that hackathon's name, deadline and requirement counts under `screen.hackathon`.

### Tables (server/db/schema.ts, migrated by server/plugins/db.ts)

- `hackathons` — name, url (unique), organizer, organizerTimezone, submissionDeadline, prizeSummary
- `requirements` — hackathonId, title, detail, category (build|demo|submission|eligibility), done, source (agent|user), status (proposed|accepted), order
- `milestones` — hackathonId, label, at
- `rubricCriteria` — hackathonId, name, weight (percent), description
- `projects` — one per hackathon: name, pitch, repoUrl, demoUrl
- `scores` — hackathonId, criterionId, score 0-10, rationale, topFix, userNote
- `drafts` — one per hackathon: body
- `briefs` — hackathonId (nullable), body

### Action index (all deterministic; no AI in actions)

- `fetch-hackathon-page` — fetch a hackathon page plus any linked rules page, return cleaned text only.
- `save-hackathon` — validate and upsert a hackathon with requirements, milestones and rubric.
- `list-hackathons` / `get-hackathon` — list with counts and weighted total; full board detail.
- `add-requirement` / `update-requirement` / `toggle-requirement` / `accept-requirement` / `delete-requirement` / `reorder-requirements` — mission board edits.
- `save-project` — upsert the one project per hackathon.
- `save-scores` — store per-criterion scores, compute the weighted total in code.
- `add-score-note` — record the user's disagreement on a score, for rescoring.
- `save-draft` / `get-draft` — submission draft.
- `whats-left` — open requirements, deadline and time left, counts.
- `export-calendar` — build a .ics file (milestones + deadline, 24h and 2h alerts) in code.
- `save-brief` / `get-briefs` — daily briefs.
- `get-brief-settings` / `save-brief-settings` — daily brief on/off and time (HH:MM).
- `seed-podium` — idempotent seed of the Builder.io Agent-Native Hackathon.
- `view-screen` — current navigation, plus the on-screen hackathon summary.

### Skills (.agents/skills/)

- `rules-extraction` — fetch a page, extract rules only from its text, save via `save-hackathon`.
- `rubric-coach` — score the project 0-10 per criterion with a rationale and one top fix, save via `save-scores`.
- `submission-writer` — draft the submission plus a "Built during the event" disclosure, save via `save-draft`.
- `daily-brief` — check settings, summarise active hackathons, save via `save-brief`.

### Daily brief job

The daily brief runs as a scheduled automation (Agent Resources path `jobs/daily-brief.md`, schedule `0 7 * * *`, runAs creator) that follows the `daily-brief` skill. Jobs are DB-backed resources in this template, not repo files: create it from Settings > Automations, by asking the agent, or via `resourcePut` — see the `daily-brief` skill for the exact steps. Email sending and Google Calendar OAuth sync are explicitly deferred stretch work: do not attempt them.

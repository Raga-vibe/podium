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

- `navigation` describes the view and selected ids. Chat is `chat` at `/chat` and `/chat/<threadId>`; the Get started page is `home` at `/home`; `/` is the public Podium landing page (signed-in visitors redirect to `/home`); `/sign-in` is the shared sign-in/signup page.
- Use `navigate` when supported and `view-screen` for a fresh read of visible details; basic navigation is already in `<current-screen>`.

## Environment (this VM, Nov 6 2026)

- The overlay filesystem intermittently fails writes with `EPERM: operation not permitted` (open succeeds, the write fails, leaving 0-byte files). It comes and goes; a write that fails one minute works the next. Never trust a single failed write as proof of a real problem, and never run a write probe against a real file (a failed `writeFile` truncates it first). If a probe truncates a tracked file, restore it with `git --no-optional-locks show HEAD:<path>` (read-only) plus `muse.write`.
- `muse.write` / `muse.edit` keep working when shell writes fail, so use the file tools for all writes. For read-only git, use `git --no-optional-locks` (plain git tries to refresh the index and fails on the lock write).
- Dev server: `pnpm dev` can fail at startup two ways from the same flap: Vite config bundling writes a temp file under `node_modules/.vite-temp/`, and React Router typegen writes under `.react-router/types/`. Start with `pnpm exec agent-native dev --configLoader native` (native loader skips the temp file); if typegen still fails, retry with `~/workspace/pwtest/start-dev-retry.sh` until the server stays up. Do not `pkill -f "agent-native dev"` from a shell whose own command line contains that string; run the retry loop from a script file instead.

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
- `whats-left` — open requirements (any status, each with its status), deadline and time left, weakest criterion, counts. One call answers "what's left?": call it directly, never chain `get-hackathon` for the weakest criterion. Open means not done, whatever the status, so it always agrees with the board's open count. Items come back in board order (Build, Demo, Submission, Eligibility). Present what the actions returned; never blame your tools in your answer.
- `export-calendar` — build a .ics file (milestones + deadline, 24h and 2h alerts) in code; a milestone that lands on the submission deadline is exported once, not twice.
- `save-brief` / `get-briefs` — daily briefs.
- `get-brief-settings` / `save-brief-settings` — daily brief on/off and time (HH:MM).
- `seed-podium` — idempotent seed of the Builder.io Agent-Native Hackathon (fixed id, see `server/db/seed.ts`).
- `reset-demo` — restore the demo board to its fresh state (requirements open and accepted, scores/draft/briefs cleared, project restored to Podium, rubric restored to the official Builder.io criteria). Finds the board by its hackathon URL (normalized, so a trailing slash or a missing www still matches), so it works on the live database whose board predates the fixed seed id; the board's own requirements are kept. Also stamps the last-reset time in app-state.
- `view-screen` — current navigation, plus the on-screen hackathon summary.

### Skills (.agents/skills/)

- `rules-extraction` — fetch a page, extract rules only from its text, save via `save-hackathon`.
- `rubric-coach` — score the project 0-10 per criterion with a rationale and one top fix, save via `save-scores`.
- `submission-writer` — draft the submission plus a "Built during the event" disclosure, save via `save-draft`.
- `daily-brief` — check settings, summarise active hackathons, save via `save-brief`.

### Daily brief job

The daily brief runs as a scheduled automation (Agent Resources path `jobs/daily-brief.md`, schedule `0 7 * * *`, runAs creator) that follows the `daily-brief` skill. Jobs are DB-backed resources in this template, not repo files: create it from Settings > Automations, by asking the agent, or via `resourcePut` — see the `daily-brief` skill for the exact steps. Email sending and Google Calendar OAuth sync are explicitly deferred stretch work: do not attempt them.

### Landing page and engine recommendation

- `/` is a public landing page (`app/components/landing/LandingPage.tsx`, route `app/routes/_index.tsx`). It renders without the app shell: `app/root.tsx` passes `isPublicPath` to `AppProviders` for `/` so the session gate does not redirect signed-out visitors, and skips `AppLayout` there. Signed-in visitors are redirected to `/home` via `useSession`. The hero shows the real board screenshot (`public/board.png`, with the old mock board as a fallback while the file is missing) and the How it works section shows `public/home.png`. Binary assets cannot be pushed via the snapshot flow, so both PNGs must be uploaded to `public/` on GitHub web.
- Guest access: the landing page hero and bottom CTA link to `/guest` (`server/routes/guest.get.ts`), a public server route that mints a real Better Auth session for the shared demo account (`demo@podium.app`, created once by signing up on the live app) and redirects to `/home`. The sign-in page has a matching "Continue as guest" link via a custom `renderSignInPage` in `server/plugins/auth.ts` (which also lists `/guest` in `publicPaths`). Guests share the demo board; guest entry resets it automatically when the last reset (kept in app-state under the demo account's email, via `appStateGet`/`appStatePut` from `@agent-native/core/application-state`) is more than 10 minutes old, so each judge starts fresh, and a visitor who already has a session is never reset mid-demo. The board page has a **Reset demo** button (only on the seeded board) that calls `reset-demo`, which also stamps the reset time. Normal sign-up is untouched. No secret or deployment key ever reaches the client: the route mints the session server-side with the framework's `createBetterAuthSessionForEmail` / `setBetterAuthSessionCookie`.
- The landing page ALSO needs `rootAuth: false` in `server/plugins/auth.ts`. The template ships `rootAuth: true` there, and with it the framework's server auth guard serves the sign-in page at `/` (HTTP 200, no redirect) before React Router ever runs, so no client-side change can make `/` public. `workspaceAppPublicPaths: ["/"]` alone does not fix it: the guard checks rootAuth first. Verified Nov 6 by reading the live HTML (standalone auth page, no React markers) and the guard source (`@agent-native/core/dist/server/auth.js`, `createAuthGuardFn`).
- `app/components/layout/EngineRecommendation.tsx` shows one line at the bottom of chat when the active engine is not Builder.io ("Powered by Gemini. Podium is built for Builder.io, switch to Builder.io for the full experience."), linking to Settings > Model. Dismissal is stored in localStorage (`podium.builder-hint.dismissed`).

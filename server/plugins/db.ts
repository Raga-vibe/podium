import { runMigrations } from "@agent-native/core/db";

const OWNABLE_COLUMNS = `
  owner_email text NOT NULL DEFAULT 'local@localhost',
  org_id text,
  visibility text NOT NULL DEFAULT 'private'
`;

// The owner every pre-existing row is handed to in migration v2.
const APP_OWNER_EMAIL = "salaudeenadebayo90@gmail.com";
// The dev sentinel the pre-existing rows were created under, before
// per-user boards existed. Referenced here (not inlined in the SQL below)
// so the one-time backfill stays in one place.
const LEGACY_OWNER = "local@localhost"; // guard:allow-localhost-fallback — one-time backfill moves pre-existing rows off the dev sentinel to the app owner; never used to authenticate anyone

export default runMigrations(
  [
    {
      version: 1,
      name: "podium-tables-v1",
      sql: `
CREATE TABLE IF NOT EXISTS hackathons (
  id text PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  organizer text,
  organizer_timezone text,
  submission_deadline timestamptz,
  prize_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  ${OWNABLE_COLUMNS}
);
CREATE TABLE IF NOT EXISTS requirements (
  id text PRIMARY KEY,
  hackathon_id text NOT NULL,
  title text NOT NULL,
  detail text,
  category text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'accepted',
  "order" integer NOT NULL DEFAULT 0,
  ${OWNABLE_COLUMNS}
);
CREATE INDEX IF NOT EXISTS requirements_hackathon_id_idx ON requirements (hackathon_id);
CREATE TABLE IF NOT EXISTS milestones (
  id text PRIMARY KEY,
  hackathon_id text NOT NULL,
  label text NOT NULL,
  at timestamptz NOT NULL,
  ${OWNABLE_COLUMNS}
);
CREATE INDEX IF NOT EXISTS milestones_hackathon_id_idx ON milestones (hackathon_id);
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id text PRIMARY KEY,
  hackathon_id text NOT NULL,
  name text NOT NULL,
  weight integer NOT NULL,
  description text,
  ${OWNABLE_COLUMNS}
);
CREATE INDEX IF NOT EXISTS rubric_criteria_hackathon_id_idx ON rubric_criteria (hackathon_id);
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  hackathon_id text NOT NULL UNIQUE,
  name text NOT NULL,
  pitch text,
  repo_url text,
  demo_url text,
  ${OWNABLE_COLUMNS}
);
CREATE TABLE IF NOT EXISTS scores (
  id text PRIMARY KEY,
  hackathon_id text NOT NULL,
  criterion_id text NOT NULL,
  score integer NOT NULL,
  rationale text,
  top_fix text,
  user_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  ${OWNABLE_COLUMNS}
);
CREATE INDEX IF NOT EXISTS scores_hackathon_id_idx ON scores (hackathon_id);
CREATE TABLE IF NOT EXISTS drafts (
  id text PRIMARY KEY,
  hackathon_id text NOT NULL UNIQUE,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  ${OWNABLE_COLUMNS}
);
CREATE TABLE IF NOT EXISTS briefs (
  id text PRIMARY KEY,
  hackathon_id text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ${OWNABLE_COLUMNS}
);
`,
    },
    {
      version: 2,
      name: "podium-per-user-boards-v2",
      sql: `
-- Boards become private to their owner. The framework's access helpers
-- (accessFilter / assertAccess) scope boards through the hackathon_shares
-- table, which normally stays empty: no share UI is shipped.
CREATE TABLE IF NOT EXISTS hackathon_shares (
  id text PRIMARY KEY,
  resource_id text NOT NULL,
  principal_type text NOT NULL,
  principal_id text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  created_by text NOT NULL DEFAULT '',
  created_at text NOT NULL DEFAULT now(),
  notified_at text
);
CREATE INDEX IF NOT EXISTS hackathon_shares_resource_id_idx ON hackathon_shares (resource_id);

-- The hackathon URL was globally unique, so only one user could hold a
-- page. Drop that and make it unique per owner instead: every user may
-- hold their own copy of the same page (e.g. the Builder.io starter board).
ALTER TABLE hackathons DROP CONSTRAINT IF EXISTS hackathons_url_key;

-- The live board predates per-user scoping and is owned by the dev
-- sentinel default. It is the app owner's work, so hand it to them (and
-- every row under it) before the per-owner unique index lands. On a fresh
-- database there are no such rows and this is a no-op.
UPDATE hackathons SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE requirements SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE milestones SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE rubric_criteria SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE projects SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE scores SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE drafts SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';
UPDATE briefs SET owner_email = '${APP_OWNER_EMAIL}' WHERE owner_email = '${LEGACY_OWNER}';

CREATE UNIQUE INDEX IF NOT EXISTS hackathons_owner_email_url_uidx ON hackathons (owner_email, url);
`,
    },
  ],
  { table: "podium_app_migrations" },
);

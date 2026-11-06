import { runMigrations } from "@agent-native/core/db";

const OWNABLE_COLUMNS = `
  owner_email text NOT NULL DEFAULT 'local@localhost',
  org_id text,
  visibility text NOT NULL DEFAULT 'private'
`;

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
  ],
  { table: "podium_app_migrations" },
);

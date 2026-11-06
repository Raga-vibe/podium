import { ownableColumns } from "@agent-native/core/db/schema";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const hackathons = pgTable(
  "hackathons",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull().unique(),
    organizer: text("organizer"),
    organizerTimezone: text("organizer_timezone"),
    submissionDeadline: timestamp("submission_deadline", {
      withTimezone: true,
    }),
    prizeSummary: text("prize_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...ownableColumns(),
  },
);

export const requirements = pgTable(
  "requirements",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    category: text("category").notNull(),
    done: boolean("done").notNull().default(false),
    source: text("source").notNull().default("user"),
    status: text("status").notNull().default("accepted"),
    order: integer("order").notNull().default(0),
    ...ownableColumns(),
  },
  (t) => [index("requirements_hackathon_id_idx").on(t.hackathonId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id").notNull(),
    label: text("label").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    ...ownableColumns(),
  },
  (t) => [index("milestones_hackathon_id_idx").on(t.hackathonId)],
);

export const rubricCriteria = pgTable(
  "rubric_criteria",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id").notNull(),
    name: text("name").notNull(),
    weight: integer("weight").notNull(),
    description: text("description"),
    ...ownableColumns(),
  },
  (t) => [index("rubric_criteria_hackathon_id_idx").on(t.hackathonId)],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id").notNull().unique(),
    name: text("name").notNull(),
    pitch: text("pitch"),
    repoUrl: text("repo_url"),
    demoUrl: text("demo_url"),
    ...ownableColumns(),
  },
  (t) => [uniqueIndex("projects_hackathon_id_uidx").on(t.hackathonId)],
);

export const scores = pgTable(
  "scores",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id").notNull(),
    criterionId: text("criterion_id").notNull(),
    score: integer("score").notNull(),
    rationale: text("rationale"),
    topFix: text("top_fix"),
    userNote: text("user_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...ownableColumns(),
  },
  (t) => [index("scores_hackathon_id_idx").on(t.hackathonId)],
);

export const drafts = pgTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id").notNull().unique(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...ownableColumns(),
  },
  (t) => [uniqueIndex("drafts_hackathon_id_uidx").on(t.hackathonId)],
);

export const briefs = pgTable(
  "briefs",
  {
    id: text("id").primaryKey(),
    hackathonId: text("hackathon_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...ownableColumns(),
  },
);

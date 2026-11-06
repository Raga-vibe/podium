import { appStateGet, appStatePut } from "@agent-native/core/application-state";
import { eq } from "drizzle-orm";

import { getDb } from "./index.js";
import {
  briefs,
  drafts,
  hackathons,
  milestones,
  projects,
  requirements,
  rubricCriteria,
  scores,
} from "./schema.js";

/** Transaction client type, derived from the db handle. */
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Stable id of the seeded Builder.io Agent-Native Hackathon board, used when
 * seeding a fresh database. The live board predates it (it was seeded with a
 * random id), so reset-demo finds the board by its URL instead, never by id.
 */
export const SEED_HACKATHON_ID = "00000000-0000-4000-8000-000000000001";

/** The hackathon page the demo board comes from. Its url is unique, so it identifies the demo board on any database. */
export const SEED_HACKATHON_URL = "https://www.builder.io/hackathon";

/** Compare hackathon URLs ignoring scheme, a leading www., casing and a trailing slash. */
function sameHackathonUrl(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  return normalize(a) === normalize(b);
}

const DEADLINE = "2026-11-10T07:59:00Z";

const SEED_REQUIREMENTS: Array<{
  title: string;
  detail: string;
  category: "build" | "demo" | "submission" | "eligibility";
}> = [
  {
    title: "Build on the Agent-Native framework",
    detail: "Use actions, skills and app-state; no LLM calls in actions or UI",
    category: "build",
  },
  {
    title: "Ship a working app, not just a chat demo",
    detail: "A real product surface with UI, actions and data",
    category: "build",
  },
  {
    title: "Record a demo under 2 minutes",
    detail: "Show the full flow: import, board, score, draft",
    category: "demo",
  },
  {
    title: "Submit before the deadline",
    detail: "Nov 9, 2026 23:59 PT",
    category: "submission",
  },
  {
    title: "Built during the hackathon",
    detail: "Started from the Agent-Native Chat template on Nov 5, 2026",
    category: "eligibility",
  },
];

/** The official Builder.io Agent-Native Hackathon judging criteria and weights (total 100). */
const SEED_RUBRIC: Array<{ name: string; weight: number; description: string }> = [
  {
    name: "Usefulness & Execution",
    weight: 40,
    description: "Does the app solve a real problem, and does it work well end to end?",
  },
  {
    name: "Creativity & Design",
    weight: 20,
    description: "How original is the idea, and how polished is the experience?",
  },
  {
    name: "Innovation",
    weight: 20,
    description: "Does it do something new, or use the agent-native pattern in a fresh way?",
  },
  {
    name: "Use of Agent-Native",
    weight: 20,
    description:
      "How well does it use actions, skills and app-state, with the agent as a first-class user?",
  },
];

const SEED_PROJECT = {
  name: "Podium",
  pitch:
    "Turns any hackathon page into a live mission board and coaches the builder toward a winning entry.",
};

async function insertRequirements(tx: Tx, hackathonId: string): Promise<void> {
  await tx.insert(requirements).values(
    SEED_REQUIREMENTS.map((r, i) => ({
      id: crypto.randomUUID(),
      hackathonId,
      title: r.title,
      detail: r.detail,
      category: r.category,
      done: false,
      source: "agent",
      status: "accepted",
      order: i,
    })),
  );
}

async function insertRubric(tx: Tx, hackathonId: string): Promise<void> {
  await tx.insert(rubricCriteria).values(
    SEED_RUBRIC.map((c) => ({
      id: crypto.randomUUID(),
      hackathonId,
      name: c.name,
      weight: c.weight,
      description: c.description,
    })),
  );
}

async function insertSeedRows(tx: Tx, hackathonId: string): Promise<void> {
  await tx.insert(hackathons).values({
    id: hackathonId,
    name: "Builder.io Agent-Native Hackathon",
    url: SEED_HACKATHON_URL,
    organizer: "Builder.io",
    organizerTimezone: "America/Los_Angeles",
    submissionDeadline: new Date(DEADLINE),
    prizeSummary:
      "Prizes for the top agent-native apps built on the Agent-Native framework (see hackathon page for details)",
  });
  await insertRequirements(tx, hackathonId);
  await tx.insert(milestones).values({
    id: crypto.randomUUID(),
    hackathonId,
    label: "Submissions close",
    at: new Date(DEADLINE),
  });
  await insertRubric(tx, hackathonId);
  await tx.insert(projects).values({
    id: crypto.randomUUID(),
    hackathonId,
    name: SEED_PROJECT.name,
    pitch: SEED_PROJECT.pitch,
    repoUrl: null,
    demoUrl: null,
  });
}

/** Create the seeded board when it is missing. Does nothing when it already exists. */
export async function seedBuilderHackathon(): Promise<{
  seeded: boolean;
  reason?: string;
  hackathonId?: string;
}> {
  const db = getDb();
  const existing = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.id, SEED_HACKATHON_ID))
    .limit(1);
  if (existing.length > 0) {
    return { seeded: false, reason: "seeded hackathon already exists" };
  }
  await db.transaction(async (tx) => {
    await insertSeedRows(tx, SEED_HACKATHON_ID);
  });
  return { seeded: true, hackathonId: SEED_HACKATHON_ID };
}

/**
 * Restore the demo board to its fresh state, in place. The board is found by
 * its hackathon URL, so it works on the live database (whose board predates
 * the fixed seed id) as well as on a fresh one.
 *
 * The board's own requirements are kept: on the live board they are the
 * seven real rules imported from the hackathon page, which are better demo
 * content than the five generic seed rows. They are set back to open and
 * accepted; scores, draft and briefs are cleared; the project is restored to
 * Podium and the rubric is restored to the official judging criteria.
 * Milestones are the hackathon's facts, so they stay. If the board has no
 * requirements at all, the seed set is inserted instead. Other hackathons
 * are never touched. The reset time is stamped so guest entry can throttle
 * its automatic reset.
 */
export async function resetSeededHackathon(): Promise<{ hackathonId: string }> {
  const db = getDb();
  const all = await db.select({ id: hackathons.id, url: hackathons.url }).from(hackathons);
  const found = all.find((h) => sameHackathonUrl(h.url, SEED_HACKATHON_URL));
  if (!found) {
    const seeded = await seedBuilderHackathon();
    await stampDemoBoardReset();
    return { hackathonId: seeded.hackathonId ?? SEED_HACKATHON_ID };
  }
  const hackathonId = found.id;
  await db.transaction(async (tx) => {
    await tx
      .update(requirements)
      .set({ done: false, status: "accepted" })
      .where(eq(requirements.hackathonId, hackathonId));
    const remaining = await tx
      .select({ id: requirements.id })
      .from(requirements)
      .where(eq(requirements.hackathonId, hackathonId))
      .limit(1);
    if (remaining.length === 0) {
      await insertRequirements(tx, hackathonId);
    }
    await tx.delete(scores).where(eq(scores.hackathonId, hackathonId));
    await tx.delete(drafts).where(eq(drafts.hackathonId, hackathonId));
    await tx.delete(briefs).where(eq(briefs.hackathonId, hackathonId));
    await tx.delete(projects).where(eq(projects.hackathonId, hackathonId));
    await tx.insert(projects).values({
      id: crypto.randomUUID(),
      hackathonId,
      name: SEED_PROJECT.name,
      pitch: SEED_PROJECT.pitch,
      repoUrl: null,
      demoUrl: null,
    });
    await tx.delete(rubricCriteria).where(eq(rubricCriteria.hackathonId, hackathonId));
    await insertRubric(tx, hackathonId);
  });
  await stampDemoBoardReset();
  return { hackathonId };
}

/**
 * The demo board's last reset, kept in the framework's app-state store under
 * the demo account's email (the framework keys app-state by user email).
 * Guests share the demo account, so this one timestamp is shared by every
 * guest entry. A missing or unreadable value means "never reset".
 */
const DEMO_APP_STATE_SESSION_ID = "demo@podium.app";
const DEMO_LAST_RESET_KEY = "demo-board-last-reset";

export async function getDemoBoardLastReset(): Promise<Date | null> {
  try {
    const value = await appStateGet(DEMO_APP_STATE_SESSION_ID, DEMO_LAST_RESET_KEY);
    const at = typeof value?.at === "string" ? new Date(value.at) : null;
    return at && !Number.isNaN(at.getTime()) ? at : null;
  } catch {
    return null;
  }
}

/** Record that the demo board was just reset. A failed stamp never fails the reset itself. */
export async function stampDemoBoardReset(): Promise<void> {
  try {
    await appStatePut(DEMO_APP_STATE_SESSION_ID, DEMO_LAST_RESET_KEY, {
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Could not stamp the demo board reset time", error);
  }
}

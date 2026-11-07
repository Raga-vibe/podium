import { eq } from "drizzle-orm";

import { getOwner } from "./access.js";
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

/** The signed-in user, for stamping ownership on seeded rows. */
type Owner = { ownerEmail: string; orgId: string | null };

/** The hackathon page the starter board comes from. Its url identifies a user's Builder.io board. */
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

async function insertRequirements(tx: Tx, hackathonId: string, owner: Owner): Promise<void> {
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
      ownerEmail: owner.ownerEmail,
      orgId: owner.orgId,
    })),
  );
}

async function insertRubric(tx: Tx, hackathonId: string, owner: Owner): Promise<void> {
  await tx.insert(rubricCriteria).values(
    SEED_RUBRIC.map((c) => ({
      id: crypto.randomUUID(),
      hackathonId,
      name: c.name,
      weight: c.weight,
      description: c.description,
      ownerEmail: owner.ownerEmail,
      orgId: owner.orgId,
    })),
  );
}

async function insertSeedRows(tx: Tx, hackathonId: string, owner: Owner): Promise<void> {
  await tx.insert(hackathons).values({
    id: hackathonId,
    name: "Builder.io Agent-Native Hackathon",
    url: SEED_HACKATHON_URL,
    organizer: "Builder.io",
    organizerTimezone: "America/Los_Angeles",
    submissionDeadline: new Date(DEADLINE),
    prizeSummary:
      "Prizes for the top agent-native apps built on the Agent-Native framework (see hackathon page for details)",
    ownerEmail: owner.ownerEmail,
    orgId: owner.orgId,
  });
  await insertRequirements(tx, hackathonId, owner);
  await tx.insert(milestones).values({
    id: crypto.randomUUID(),
    hackathonId,
    label: "Submissions close",
    at: new Date(DEADLINE),
    ownerEmail: owner.ownerEmail,
    orgId: owner.orgId,
  });
  await insertRubric(tx, hackathonId, owner);
  await tx.insert(projects).values({
    id: crypto.randomUUID(),
    hackathonId,
    name: SEED_PROJECT.name,
    pitch: SEED_PROJECT.pitch,
    repoUrl: null,
    demoUrl: null,
    ownerEmail: owner.ownerEmail,
    orgId: owner.orgId,
  });
}

/** The current user's own Builder.io starter board, if they have one. */
async function findMyStarterBoard(ownerEmail: string): Promise<{ id: string } | null> {
  const db = getDb();
  const mine = await db
    .select({ id: hackathons.id, url: hackathons.url })
    .from(hackathons)
    .where(eq(hackathons.ownerEmail, ownerEmail));
  return mine.find((h) => sameHackathonUrl(h.url, SEED_HACKATHON_URL)) ?? null;
}

/**
 * Ensure the current user has their own Builder.io starter board. Creates
 * it (fresh id, owned by them) when they don't have one; does nothing when
 * they already do. Boards are never shared: every user gets their own copy.
 */
export async function seedBuilderHackathon(): Promise<{
  seeded: boolean;
  reason?: string;
  hackathonId?: string;
}> {
  const owner = getOwner();
  const existing = await findMyStarterBoard(owner.ownerEmail);
  if (existing) {
    return {
      seeded: false,
      reason: "you already have the Builder.io board",
      hackathonId: existing.id,
    };
  }
  const hackathonId = crypto.randomUUID();
  const db = getDb();
  await db.transaction(async (tx) => {
    await insertSeedRows(tx, hackathonId, owner);
  });
  return { seeded: true, hackathonId };
}

/**
 * Restore the current user's demo board to its fresh state, in place. The
 * board is their own Builder.io starter board, found by its hackathon URL;
 * other users' boards are never touched. If they don't have one yet, one
 * is seeded for them first.
 *
 * The board's own requirements are kept: on the live board they are the
 * seven real rules imported from the hackathon page, which are better demo
 * content than the five generic seed rows. They are set back to open and
 * accepted; scores, draft and briefs are cleared; the project is restored to
 * Podium and the rubric is restored to the official judging criteria.
 * Milestones are the hackathon's facts, so they stay. If the board has no
 * requirements at all, the seed set is inserted instead. Other hackathons
 * are never touched.
 */
export async function resetSeededHackathon(): Promise<{ hackathonId: string }> {
  const owner = getOwner();
  const db = getDb();
  const found = await findMyStarterBoard(owner.ownerEmail);
  if (!found) {
    const seeded = await seedBuilderHackathon();
    if (!seeded.hackathonId) {
      throw new Error("Could not seed the demo board");
    }
    return { hackathonId: seeded.hackathonId };
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
      await insertRequirements(tx, hackathonId, owner);
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
      ownerEmail: owner.ownerEmail,
      orgId: owner.orgId,
    });
    await tx.delete(rubricCriteria).where(eq(rubricCriteria.hackathonId, hackathonId));
    await insertRubric(tx, hackathonId, owner);
  });
  return { hackathonId };
}

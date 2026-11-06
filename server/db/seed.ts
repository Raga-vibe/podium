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
 * Stable id of the seeded Builder.io Agent-Native Hackathon board. It never
 * changes, so reset-demo can find and restore exactly this board without
 * touching any other hackathon (for example the SERV Hackathon a user
 * imported). The board page compares against the same literal.
 */
export const SEED_HACKATHON_ID = "00000000-0000-4000-8000-000000000001";

const DEADLINE = "2026-11-10T07:59:00Z";

async function insertSeedRows(tx: Tx): Promise<void> {
  await tx.insert(hackathons).values({
    id: SEED_HACKATHON_ID,
    name: "Builder.io Agent-Native Hackathon",
    url: "https://www.builder.io/hackathon",
    organizer: "Builder.io",
    organizerTimezone: "America/Los_Angeles",
    submissionDeadline: new Date(DEADLINE),
    prizeSummary:
      "Prizes for the top agent-native apps built on the Agent-Native framework (see hackathon page for details)",
  });
  const reqs: Array<{
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
  await tx.insert(requirements).values(
    reqs.map((r, i) => ({
      id: crypto.randomUUID(),
      hackathonId: SEED_HACKATHON_ID,
      title: r.title,
      detail: r.detail,
      category: r.category,
      done: false,
      source: "agent",
      status: "accepted",
      order: i,
    })),
  );
  await tx.insert(milestones).values({
    id: crypto.randomUUID(),
    hackathonId: SEED_HACKATHON_ID,
    label: "Submissions close",
    at: new Date(DEADLINE),
  });
  const rubric: Array<{ name: string; weight: number; description: string }> = [
    {
      name: "Agent-native architecture",
      weight: 30,
      description: "Actions, skills and app-state shared by UI and agent",
    },
    {
      name: "Innovation",
      weight: 25,
      description: "A fresh idea that uses the agent-native pattern well",
    },
    {
      name: "Design and UX",
      weight: 20,
      description: "Polished, clear and pleasant to use",
    },
    {
      name: "Completeness",
      weight: 15,
      description: "The full flow works end to end",
    },
    {
      name: "Demo quality",
      weight: 10,
      description: "A clear demo under 2 minutes",
    },
  ];
  await tx.insert(rubricCriteria).values(
    rubric.map((c) => ({
      id: crypto.randomUUID(),
      hackathonId: SEED_HACKATHON_ID,
      name: c.name,
      weight: c.weight,
      description: c.description,
    })),
  );
  await tx.insert(projects).values({
    id: crypto.randomUUID(),
    hackathonId: SEED_HACKATHON_ID,
    name: "Podium",
    pitch:
      "Turns any hackathon page into a live mission board and coaches the builder toward a winning entry.",
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
    await insertSeedRows(tx);
  });
  return { seeded: true, hackathonId: SEED_HACKATHON_ID };
}

/**
 * Restore the seeded board to its fresh state: delete every row that belongs
 * to it (requirements, milestones, rubric, project, scores, draft, briefs)
 * and re-insert the seed rows. Other hackathons are never touched.
 */
export async function resetSeededHackathon(): Promise<{ hackathonId: string }> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(briefs).where(eq(briefs.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(scores).where(eq(scores.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(drafts).where(eq(drafts.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(requirements).where(eq(requirements.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(milestones).where(eq(milestones.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(rubricCriteria).where(eq(rubricCriteria.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(projects).where(eq(projects.hackathonId, SEED_HACKATHON_ID));
    await tx.delete(hackathons).where(eq(hackathons.id, SEED_HACKATHON_ID));
    await insertSeedRows(tx);
  });
  return { hackathonId: SEED_HACKATHON_ID };
}

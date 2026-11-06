import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import {
  hackathons,
  milestones,
  projects,
  requirements,
  rubricCriteria,
} from "../server/db/schema.js";

const DEADLINE = "2026-11-10T07:59:00Z";

export default defineAction({
  description:
    "Seed Podium with a ready-made Builder.io Agent-Native Hackathon record. Does nothing when hackathons already exist.",
  schema: z.object({}),
  outputSchema: z.object({
    seeded: z.boolean().describe("True when the seed record was created"),
    reason: z.string().optional().describe("Why seeding was skipped, when seeded is false"),
    hackathonId: z.string().optional().describe("Id of the seeded hackathon, when seeded is true"),
  }),
  run: async () => {
    const db = getDb();
    const existing = await db
      .select({ id: hackathons.id })
      .from(hackathons)
      .limit(1);
    if (existing.length > 0) {
      return { seeded: false, reason: "hackathons already exist" };
    }
    const hackathonId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(hackathons).values({
        id: hackathonId,
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
      await tx.insert(milestones).values({
        id: crypto.randomUUID(),
        hackathonId,
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
          hackathonId,
          name: c.name,
          weight: c.weight,
          description: c.description,
        })),
      );
      await tx.insert(projects).values({
        id: crypto.randomUUID(),
        hackathonId,
        name: "Podium",
        pitch:
          "Turns any hackathon page into a live mission board and coaches the builder toward a winning entry.",
        repoUrl: null,
        demoUrl: null,
      });
    });
    return { seeded: true, hackathonId };
  },
});

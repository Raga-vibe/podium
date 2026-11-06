import { defineAction, fail } from "@agent-native/core/action";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { serializeRequirement } from "../server/db/podium.js";
import { hackathons, requirements } from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";

export default defineAction({
  description: "List what's left for a hackathon: open accepted requirements, deadline and time left, and counts.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    open: z.array(requirementOutputSchema).describe("Open accepted requirements, in board order"),
    deadline: z.string().nullable().describe("Submission deadline as an ISO string, or null"),
    timeLeft: z
      .object({
        days: z.number().describe("Whole days left until the deadline"),
        hours: z.number().describe("Remaining whole hours after the days"),
      })
      .nullable()
      .describe("Time left until the deadline, or null when no deadline is set"),
    counts: z.object({
      total: z.number().describe("Total requirements"),
      done: z.number().describe("Completed requirements"),
      open: z.number().describe("Open requirements"),
    }),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ hackathonId }) => {
    const db = getDb();
    const [hackathon] = await db
      .select()
      .from(hackathons)
      .where(eq(hackathons.id, hackathonId))
      .limit(1);
    if (!hackathon) fail(`Hackathon not found: ${hackathonId}`, { statusCode: 404 });
    const [all, open] = await Promise.all([
      db
        .select()
        .from(requirements)
        .where(eq(requirements.hackathonId, hackathonId)),
      db
        .select()
        .from(requirements)
        .where(
          and(
            eq(requirements.hackathonId, hackathonId),
            eq(requirements.done, false),
            eq(requirements.status, "accepted"),
          ),
        )
        .orderBy(asc(requirements.order)),
    ]);
    const done = all.filter((r) => r.done).length;
    let timeLeft: { days: number; hours: number } | null = null;
    if (hackathon.submissionDeadline) {
      const diffMs =
        hackathon.submissionDeadline.getTime() - Date.now();
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor((diffMs - days * 86400000) / 3600000);
      timeLeft = { days, hours };
    }
    return {
      hackathonId,
      open: open.map(serializeRequirement),
      deadline: hackathon.submissionDeadline
        ? hackathon.submissionDeadline.toISOString()
        : null,
      timeLeft,
      counts: { total: all.length, done, open: all.length - done },
    };
  },
});

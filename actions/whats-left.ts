import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import {
  latestScores,
  serializeRequirement,
  weakestCriterion,
} from "../server/db/podium.js";
import { hackathons, requirements, rubricCriteria, scores } from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";

export default defineAction({
  description:
    "List what's left for a hackathon in one call: open requirements (any status), deadline and time left, weakest criterion, and counts. Call this directly for 'what's left?' questions.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    open: z
      .array(requirementOutputSchema)
      .describe(
        "Open requirements in board order, whatever their status. Each item includes its status (proposed or accepted), so items still waiting for approval can be mentioned.",
      ),
    deadline: z.string().nullable().describe("Submission deadline as an ISO string, or null"),
    timeLeft: z
      .object({
        days: z.number().describe("Whole days left until the deadline"),
        hours: z.number().describe("Remaining whole hours after the days"),
      })
      .nullable()
      .describe("Time left until the deadline, or null when no deadline is set"),
    weakestCriterion: z
      .object({
        criterionId: z.string().describe("Rubric criterion id"),
        name: z.string().describe("Rubric criterion name"),
        weight: z.number().describe("Rubric criterion weight (percent)"),
        score: z.number().describe("Latest score for the criterion, 0-10"),
        topFix: z.string().nullable().describe("Highest-impact fix for the criterion, or null"),
      })
      .nullable()
      .describe("Lowest-scored rubric criterion, or null when nothing is scored yet"),
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
    const [all, rubric, scoreRows] = await Promise.all([
      db
        .select()
        .from(requirements)
        .where(eq(requirements.hackathonId, hackathonId))
        .orderBy(asc(requirements.order)),
      db
        .select()
        .from(rubricCriteria)
        .where(eq(rubricCriteria.hackathonId, hackathonId)),
      db.select().from(scores).where(eq(scores.hackathonId, hackathonId)),
    ]);
    // Open means not done, whatever the status: this is the same count the
    // board shows (list-hackathons openCount), so the two can never disagree.
    const open = all.filter((r) => !r.done);
    const done = all.length - open.length;
    const weakest = weakestCriterion(rubric, latestScores(scoreRows));
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
      weakestCriterion: weakest
        ? {
            criterionId: weakest.criterion.id,
            name: weakest.criterion.name,
            weight: weakest.criterion.weight,
            score: weakest.score.score,
            topFix: weakest.score.topFix,
          }
        : null,
      counts: { total: all.length, done, open: open.length },
    };
  },
});

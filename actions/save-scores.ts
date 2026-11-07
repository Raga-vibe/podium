import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import {
  latestScores,
  serializeScore,
  weightedTotal,
} from "../server/db/podium.js";
import { rubricCriteria, scores } from "../server/db/schema.js";

export const scoreOutputSchema = z.object({
  id: z.string().describe("Score id"),
  hackathonId: z.string().describe("Hackathon id"),
  criterionId: z.string().describe("Rubric criterion id"),
  score: z.number().describe("Score from 0 to 10"),
  rationale: z.string().nullable().describe("One-line rationale, or null"),
  topFix: z.string().nullable().describe("Single highest-impact fix, or null"),
  userNote: z.string().nullable().describe("User disagreement note, or null"),
  previousScore: z.number().nullable().describe("Score this replaced, or null when first scored"),
  createdAt: z.string().nullable().describe("Creation time as an ISO string"),
});

export default defineAction({
  description:
    "Store per-criterion rubric scores (0-10) for a hackathon and compute the weighted total. Rescoring a criterion replaces its old score but keeps the user's note and records the old score as previousScore, so the change shows with a before and after.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    scores: z
      .array(
        z.object({
          criterionId: z.string().describe("Rubric criterion id"),
          score: z.number().int().min(0).max(10).describe("Score from 0 to 10"),
          rationale: z.string().optional().describe("One-line rationale"),
          topFix: z.string().optional().describe("Single highest-impact fix"),
        }),
      )
      .min(1)
      .describe("Scores, one per criterion"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    weightedTotal: z.number().nullable().describe("Weighted total 0-10 rounded to 1 decimal, or null"),
    scores: z.array(scoreOutputSchema).describe("Stored scores"),
  }),
  run: async ({ hackathonId, scores: inputScores }) => {
    const db = getDb();
    const owner = getOwner();
    await requireHackathon(hackathonId, "editor");
    const criteria = await db
      .select()
      .from(rubricCriteria)
      .where(
        and(
          eq(rubricCriteria.hackathonId, hackathonId),
          eq(rubricCriteria.ownerEmail, owner.ownerEmail),
        ),
      );
    const criterionIds = new Set(criteria.map((c) => c.id));
    for (const s of inputScores) {
      if (!criterionIds.has(s.criterionId)) {
        fail(`Criterion not found for this hackathon: ${s.criterionId}`);
      }
    }
    await db.transaction(async (tx) => {
      for (const s of inputScores) {
        const [existing] = await tx
          .select()
          .from(scores)
          .where(eq(scores.criterionId, s.criterionId))
          .limit(1);
        const userNote = existing?.userNote ?? null;
        const previousScore = existing?.score ?? null;
        if (existing) {
          await tx.delete(scores).where(eq(scores.id, existing.id));
        }
        const [row] = await tx
          .insert(scores)
          .values({
            id: crypto.randomUUID(),
            hackathonId,
            criterionId: s.criterionId,
            score: s.score,
            rationale: s.rationale ?? null,
            topFix: s.topFix ?? null,
            userNote,
            previousScore,
            ownerEmail: owner.ownerEmail,
            orgId: owner.orgId,
          })
          .returning();
        if (!row) fail("Failed to save score");
      }
    });
    // Weighted total covers every latest score for the hackathon, not just
    // the ones submitted in this call, so a partial rescore stays consistent
    // with list-hackathons and get-hackathon.
    const allScores = await db
      .select()
      .from(scores)
      .where(
        and(
          eq(scores.hackathonId, hackathonId),
          eq(scores.ownerEmail, owner.ownerEmail),
        ),
      );
    const latest = latestScores(allScores);
    return {
      hackathonId,
      weightedTotal: weightedTotal(latest, criteria),
      scores: latest.map(serializeScore),
    };
  },
});

import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { serializeScore } from "../server/db/podium.js";
import { scores } from "../server/db/schema.js";

const scoreOutputSchema = z.object({
  id: z.string().describe("Score id"),
  hackathonId: z.string().describe("Hackathon id"),
  criterionId: z.string().describe("Rubric criterion id"),
  score: z.number().describe("Score from 0 to 10"),
  rationale: z.string().nullable().describe("One-line rationale, or null"),
  topFix: z.string().nullable().describe("Single highest-impact fix, or null"),
  userNote: z.string().nullable().describe("User disagreement note, or null"),
  createdAt: z.string().nullable().describe("Creation time as an ISO string"),
});

export default defineAction({
  description: "Add the user's disagreement note to a rubric score, so the agent can rescore that criterion.",
  schema: z.object({
    scoreId: z.string().describe("Score id"),
    note: z.string().min(1).describe("The user's disagreement note"),
  }),
  outputSchema: scoreOutputSchema,
  run: async ({ scoreId, note }) => {
    const db = getDb();
    const [row] = await db
      .update(scores)
      .set({ userNote: note })
      .where(eq(scores.id, scoreId))
      .returning();
    if (!row) fail(`Score not found: ${scoreId}`, { statusCode: 404 });
    return serializeScore(row);
  },
});

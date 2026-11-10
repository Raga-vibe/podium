import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { serializeRequirement } from "../server/db/podium.js";
import { requirements } from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";

export default defineAction({
  description: "Set a requirement's done state. Pass done to set it explicitly (idempotent); omit it to flip the current state. Marking a proposed requirement done also accepts it, so a proposed item can never be left done-but-unreviewed (see server/db/states.ts).",
  schema: z.object({
    id: z.string().describe("Requirement id"),
    done: z.boolean().optional().describe("Target done state; omit to flip"),
  }),
  outputSchema: requirementOutputSchema,
  run: async ({ id, done }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, id))
      .limit(1);
    if (!existing) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    await requireHackathon(existing.hackathonId, "editor");
    const targetDone = done ?? !existing.done;
    // A proposed requirement marked done is accepted as part of the same
    // step: ticking it is the user confirming it. Without this, a proposed
    // row could sit done-but-unreviewed, an invalid state the board and
    // the agent would then have to interpret (see server/db/states.ts).
    const targetStatus =
      targetDone && existing.status === "proposed" ? "accepted" : existing.status;
    const [row] = await db
      .update(requirements)
      .set({ done: targetDone, status: targetStatus })
      .where(eq(requirements.id, id))
      .returning();
    if (!row) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    return serializeRequirement(row);
  },
});

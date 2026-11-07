import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { serializeRequirement } from "../server/db/podium.js";
import { requirements } from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";

export default defineAction({
  description: "Set a requirement's done state. Pass done to set it explicitly (idempotent); omit it to flip the current state.",
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
    const [row] = await db
      .update(requirements)
      .set({ done: done ?? !existing.done })
      .where(eq(requirements.id, id))
      .returning();
    if (!row) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    return serializeRequirement(row);
  },
});

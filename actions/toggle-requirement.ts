import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { serializeRequirement } from "../server/db/podium.js";
import { requirements } from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";

export default defineAction({
  description: "Flip a requirement's done state.",
  schema: z.object({
    id: z.string().describe("Requirement id"),
  }),
  outputSchema: requirementOutputSchema,
  run: async ({ id }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, id))
      .limit(1);
    if (!existing) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    const [row] = await db
      .update(requirements)
      .set({ done: !existing.done })
      .where(eq(requirements.id, id))
      .returning();
    if (!row) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    return serializeRequirement(row);
  },
});

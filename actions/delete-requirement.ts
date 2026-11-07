import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { requirements } from "../server/db/schema.js";

export default defineAction({
  description: "Delete a requirement from the mission board.",
  schema: z.object({
    id: z.string().describe("Requirement id"),
  }),
  outputSchema: z.object({
    id: z.string().describe("Deleted requirement id"),
    deleted: z.boolean().describe("Always true when the delete succeeds"),
  }),
  run: async ({ id }) => {
    const db = getDb();
    const [existing] = await db
      .select({ hackathonId: requirements.hackathonId })
      .from(requirements)
      .where(eq(requirements.id, id))
      .limit(1);
    if (!existing) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    await requireHackathon(existing.hackathonId, "editor");
    const deleted = await db
      .delete(requirements)
      .where(eq(requirements.id, id))
      .returning({ id: requirements.id });
    if (deleted.length === 0) {
      fail(`Requirement not found: ${id}`, { statusCode: 404 });
    }
    return { id, deleted: true };
  },
});

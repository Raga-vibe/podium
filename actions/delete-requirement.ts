import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
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

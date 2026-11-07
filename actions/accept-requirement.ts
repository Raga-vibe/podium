import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { requirements } from "../server/db/schema.js";

export default defineAction({
  description:
    "Accept or reject an agent-proposed requirement. Accepting marks it accepted; rejecting deletes it.",
  schema: z.object({
    id: z.string().describe("Requirement id"),
    accept: z.boolean().describe("True to accept, false to reject (deletes the requirement)"),
  }),
  outputSchema: z.object({
    id: z.string().describe("Requirement id"),
    accepted: z.boolean().describe("True when accepted, false when rejected and deleted"),
  }),
  run: async ({ id, accept }) => {
    const db = getDb();
    const [existing] = await db
      .select({ hackathonId: requirements.hackathonId })
      .from(requirements)
      .where(eq(requirements.id, id))
      .limit(1);
    if (!existing) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    await requireHackathon(existing.hackathonId, "editor");
    if (!accept) {
      const deleted = await db
        .delete(requirements)
        .where(eq(requirements.id, id))
        .returning({ id: requirements.id });
      if (deleted.length === 0) {
        fail(`Requirement not found: ${id}`, { statusCode: 404 });
      }
      return { id, accepted: false };
    }
    const [row] = await db
      .update(requirements)
      .set({ status: "accepted" })
      .where(eq(requirements.id, id))
      .returning({ id: requirements.id });
    if (!row) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    return { id, accepted: true };
  },
});

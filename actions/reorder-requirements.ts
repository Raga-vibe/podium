import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { requirements } from "../server/db/schema.js";

export default defineAction({
  description: "Reorder a hackathon's requirements. The ids must be exactly the hackathon's requirement ids, in the new order.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    ids: z
      .array(z.string())
      .describe("Requirement ids in the new order; must match the hackathon's requirements exactly"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    ids: z.array(z.string()).describe("Requirement ids in the new order"),
  }),
  run: async ({ hackathonId, ids }) => {
    const db = getDb();
    await requireHackathon(hackathonId, "editor");
    const existing = await db
      .select({ id: requirements.id })
      .from(requirements)
      .where(eq(requirements.hackathonId, hackathonId));
    const existingIds = new Set(existing.map((r) => r.id));
    if (
      ids.length !== existingIds.size ||
      ids.some((id) => !existingIds.has(id)) ||
      new Set(ids).size !== ids.length
    ) {
      fail("ids must be exactly the hackathon's requirement ids, each once");
    }
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(requirements)
          .set({ order: i })
          .where(eq(requirements.id, ids[i] as string));
      }
    });
    return { hackathonId, ids };
  },
});

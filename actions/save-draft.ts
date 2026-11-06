import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { iso } from "../server/db/podium.js";
import { drafts, hackathons } from "../server/db/schema.js";

export default defineAction({
  description: "Save (create or replace) the submission draft for a hackathon.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    body: z.string().min(1).describe("Draft body"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    updatedAt: z.string().nullable().describe("Last update time as an ISO string"),
  }),
  run: async ({ hackathonId, body }) => {
    const db = getDb();
    const [hackathon] = await db
      .select({ id: hackathons.id })
      .from(hackathons)
      .where(eq(hackathons.id, hackathonId))
      .limit(1);
    if (!hackathon) fail(`Hackathon not found: ${hackathonId}`, { statusCode: 404 });
    const now = new Date();
    const [existing] = await db
      .select()
      .from(drafts)
      .where(eq(drafts.hackathonId, hackathonId))
      .limit(1);
    let row;
    if (existing) {
      [row] = await db
        .update(drafts)
        .set({ body, updatedAt: now })
        .where(eq(drafts.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(drafts)
        .values({ id: crypto.randomUUID(), hackathonId, body, updatedAt: now })
        .returning();
    }
    if (!row) fail("Failed to save draft");
    return { hackathonId, updatedAt: iso(row.updatedAt) };
  },
});

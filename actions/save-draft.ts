import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { iso } from "../server/db/podium.js";
import { drafts } from "../server/db/schema.js";

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
    const owner = getOwner();
    await requireHackathon(hackathonId, "editor");
    const now = new Date();
    const [existing] = await db
      .select()
      .from(drafts)
      .where(
        and(
          eq(drafts.hackathonId, hackathonId),
          eq(drafts.ownerEmail, owner.ownerEmail),
        ),
      )
      .limit(1);
    let row;
    if (existing) {
      [row] = await db
        .update(drafts)
        .set({ body, updatedAt: now })
        .where(
          and(
            eq(drafts.id, existing.id),
            eq(drafts.ownerEmail, owner.ownerEmail),
          ),
        )
        .returning();
    } else {
      [row] = await db
        .insert(drafts)
        .values({
          id: crypto.randomUUID(),
          hackathonId,
          body,
          updatedAt: now,
          ownerEmail: owner.ownerEmail,
          orgId: owner.orgId,
        })
        .returning();
    }
    if (!row) fail("Failed to save draft");
    return { hackathonId, updatedAt: iso(row.updatedAt) };
  },
});

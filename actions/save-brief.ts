import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { iso } from "../server/db/podium.js";
import { briefs } from "../server/db/schema.js";

export default defineAction({
  description: "Save a daily brief for a hackathon (or a general brief when no hackathon is given).",
  schema: z.object({
    hackathonId: z.string().optional().describe("Hackathon id the brief is about; omit for a general brief"),
    body: z.string().min(1).describe("Brief body"),
  }),
  outputSchema: z.object({
    id: z.string().describe("Brief id"),
    createdAt: z.string().nullable().describe("Creation time as an ISO string"),
  }),
  run: async ({ hackathonId, body }) => {
    const db = getDb();
    const owner = getOwner();
    if (hackathonId) {
      await requireHackathon(hackathonId, "viewer");
    }
    const [row] = await db
      .insert(briefs)
      .values({
        id: crypto.randomUUID(),
        hackathonId: hackathonId ?? null,
        body,
        ownerEmail: owner.ownerEmail,
        orgId: owner.orgId,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to save brief");
    }
    return { id: row.id, createdAt: iso(row.createdAt) };
  },
});

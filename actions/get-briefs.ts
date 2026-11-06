import { defineAction } from "@agent-native/core/action";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { serializeBrief } from "../server/db/podium.js";
import { briefs, hackathons } from "../server/db/schema.js";

export default defineAction({
  description: "Get the latest 5 daily briefs, with the hackathon name when linked.",
  schema: z.object({}),
  outputSchema: z.object({
    briefs: z.array(
      z.object({
        id: z.string().describe("Brief id"),
        hackathonId: z.string().nullable().describe("Linked hackathon id, or null"),
        hackathonName: z.string().nullable().describe("Linked hackathon name, or null"),
        body: z.string().describe("Brief body"),
        createdAt: z.string().nullable().describe("Creation time as an ISO string"),
      }),
    ).describe("Latest briefs, newest first"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(briefs)
      .orderBy(desc(briefs.createdAt))
      .limit(5);
    const names = new Map<string, string>();
    const ids = [...new Set(rows.map((r) => r.hackathonId).filter((id): id is string => id !== null))];
    if (ids.length > 0) {
      const hs = await db.select().from(hackathons);
      for (const h of hs) {
        if (ids.includes(h.id)) names.set(h.id, h.name);
      }
    }
    return {
      briefs: rows.map((r) =>
        serializeBrief(r, r.hackathonId ? (names.get(r.hackathonId) ?? null) : null),
      ),
    };
  },
});

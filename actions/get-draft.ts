import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { drafts } from "../server/db/schema.js";

export default defineAction({
  description: "Get the submission draft for a hackathon. Returns an empty body when no draft exists yet.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    body: z.string().describe("Draft body, or an empty string when none exists"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ hackathonId }) => {
    const db = getDb();
    const [draft] = await db
      .select()
      .from(drafts)
      .where(eq(drafts.hackathonId, hackathonId))
      .limit(1);
    return { hackathonId, body: draft?.body ?? "" };
  },
});

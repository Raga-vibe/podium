import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { serializeRequirement } from "../server/db/podium.js";
import { requirements } from "../server/db/schema.js";

export const requirementOutputSchema = z.object({
  id: z.string().describe("Requirement id"),
  hackathonId: z.string().describe("Hackathon id"),
  title: z.string().describe("Requirement title"),
  detail: z.string().nullable().describe("Extra detail, or null"),
  category: z.string().describe("Category: build, demo, submission or eligibility"),
  done: z.boolean().describe("Whether the requirement is done"),
  source: z.string().describe("Who created it: agent or user"),
  status: z.string().describe("Status: proposed or accepted"),
  order: z.number().describe("Position on the board"),
});

const categorySchema = z
  .enum(["build", "demo", "submission", "eligibility"])
  .describe("Category: build, demo, submission or eligibility");

export default defineAction({
  description: "Add a requirement to a hackathon's mission board, appended at the end.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    title: z.string().min(1).describe("Requirement title"),
    detail: z.string().optional().describe("Extra detail or clarification"),
    category: categorySchema,
    source: z
      .enum(["agent", "user"])
      .default("user")
      .describe("Who created it; defaults to user"),
  }),
  outputSchema: requirementOutputSchema,
  run: async ({ hackathonId, title, detail, category, source }) => {
    const db = getDb();
    const owner = getOwner();
    await requireHackathon(hackathonId, "editor");
    const existing = await db
      .select({ order: requirements.order })
      .from(requirements)
      .where(eq(requirements.hackathonId, hackathonId))
      .orderBy(asc(requirements.order));
    const maxOrder = existing.reduce((m, r) => Math.max(m, r.order), -1);
    const [row] = await db
      .insert(requirements)
      .values({
        id: crypto.randomUUID(),
        hackathonId,
        title,
        detail: detail ?? null,
        category,
        done: false,
        source,
        status: "accepted",
        order: maxOrder + 1,
        ownerEmail: owner.ownerEmail,
        orgId: owner.orgId,
      })
      .returning();
    if (!row) fail("Failed to add requirement");
    return serializeRequirement(row);
  },
});

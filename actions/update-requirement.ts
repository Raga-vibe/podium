import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { serializeRequirement } from "../server/db/podium.js";
import { requirements } from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";

export default defineAction({
  description: "Update a requirement's title, detail or category.",
  schema: z.object({
    id: z.string().describe("Requirement id"),
    title: z.string().min(1).optional().describe("New title"),
    detail: z.string().optional().describe("New detail"),
    category: z
      .enum(["build", "demo", "submission", "eligibility"])
      .optional()
      .describe("New category: build, demo, submission or eligibility"),
  }),
  outputSchema: requirementOutputSchema,
  run: async ({ id, title, detail, category }) => {
    const db = getDb();
    const patch: {
      title?: string;
      detail?: string | null;
      category?: string;
    } = {};
    if (title !== undefined) patch.title = title;
    if (detail !== undefined) patch.detail = detail;
    if (category !== undefined) patch.category = category;
    if (Object.keys(patch).length === 0) {
      fail("Nothing to update: pass title, detail or category");
    }
    const [existing] = await db
      .select({ hackathonId: requirements.hackathonId })
      .from(requirements)
      .where(eq(requirements.id, id))
      .limit(1);
    if (!existing) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    await requireHackathon(existing.hackathonId, "editor");
    const [row] = await db
      .update(requirements)
      .set(patch)
      .where(eq(requirements.id, id))
      .returning();
    if (!row) fail(`Requirement not found: ${id}`, { statusCode: 404 });
    return serializeRequirement(row);
  },
});

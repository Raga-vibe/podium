import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { serializeProject } from "../server/db/podium.js";
import { hackathons, projects } from "../server/db/schema.js";

const urlOrEmpty = z
  .union([z.literal(""), z.string().url()])
  .describe("A valid URL, or an empty string");

export const projectOutputSchema = z.object({
  id: z.string().describe("Project id"),
  hackathonId: z.string().describe("Hackathon id"),
  name: z.string().describe("Project name"),
  pitch: z.string().nullable().describe("One-line pitch, or null"),
  repoUrl: z.string().nullable().describe("Repository URL, or null"),
  demoUrl: z.string().nullable().describe("Demo URL, or null"),
});

export default defineAction({
  description: "Save (create or replace) the one project for a hackathon: name, pitch and links.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    name: z.string().min(1).describe("Project name"),
    pitch: z.string().optional().describe("One-line pitch"),
    repoUrl: urlOrEmpty.optional().describe("Repository URL, or empty"),
    demoUrl: urlOrEmpty.optional().describe("Demo URL, or empty"),
  }),
  outputSchema: projectOutputSchema,
  run: async ({ hackathonId, name, pitch, repoUrl, demoUrl }) => {
    const db = getDb();
    const [hackathon] = await db
      .select({ id: hackathons.id })
      .from(hackathons)
      .where(eq(hackathons.id, hackathonId))
      .limit(1);
    if (!hackathon) fail(`Hackathon not found: ${hackathonId}`, { statusCode: 404 });
    const values = {
      name,
      pitch: pitch ?? null,
      repoUrl: repoUrl ? repoUrl : null,
      demoUrl: demoUrl ? demoUrl : null,
    };
    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.hackathonId, hackathonId))
      .limit(1);
    let row;
    if (existing) {
      [row] = await db
        .update(projects)
        .set(values)
        .where(eq(projects.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(projects)
        .values({ id: crypto.randomUUID(), hackathonId, ...values })
        .returning();
    }
    if (!row) fail("Failed to save project");
    return serializeProject(row);
  },
});

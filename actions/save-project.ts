import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { serializeProject } from "../server/db/podium.js";
import { projects } from "../server/db/schema.js";

const urlOrEmpty = z
  .union([z.literal(""), z.string().url()])
  .describe("A valid URL, or an empty string");

export const projectOutputSchema = z.object({
  id: z.string().describe("Project id"),
  hackathonId: z.string().describe("Hackathon id"),
  name: z.string().describe("Project name"),
  pitch: z.string().nullable().describe("One-line pitch, or null"),
  repoUrl: z.string().nullable().describe("Repository URL, or null"),
  demoUrl: z.string().nullable().describe("Demo (Clips) URL, or null"),
  liveUrl: z.string().nullable().describe("Live (deployed) URL, or null"),
});

export default defineAction({
  description: "Save (create or replace) the one project for a hackathon: name, pitch and links (repo, live and Clips demo).",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    name: z.string().min(1).describe("Project name"),
    pitch: z.string().optional().describe("One-line pitch"),
    repoUrl: urlOrEmpty.optional().describe("Repository URL, or empty"),
    demoUrl: urlOrEmpty.optional().describe("Demo (Clips) URL, or empty"),
    liveUrl: urlOrEmpty.optional().describe("Live (deployed) URL, or empty"),
  }),
  outputSchema: projectOutputSchema,
  run: async ({ hackathonId, name, pitch, repoUrl, demoUrl, liveUrl }) => {
    const db = getDb();
    const owner = getOwner();
    await requireHackathon(hackathonId, "editor");
    const values = {
      name,
      pitch: pitch ?? null,
      repoUrl: repoUrl ? repoUrl : null,
      demoUrl: demoUrl ? demoUrl : null,
      liveUrl: liveUrl ? liveUrl : null,
    };
    const [existing] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.hackathonId, hackathonId),
          eq(projects.ownerEmail, owner.ownerEmail),
        ),
      )
      .limit(1);
    let row;
    if (existing) {
      [row] = await db
        .update(projects)
        .set(values)
        .where(
          and(
            eq(projects.id, existing.id),
            eq(projects.ownerEmail, owner.ownerEmail),
          ),
        )
        .returning();
    } else {
      [row] = await db
        .insert(projects)
        .values({
          id: crypto.randomUUID(),
          hackathonId,
          ...values,
          ownerEmail: owner.ownerEmail,
          orgId: owner.orgId,
        })
        .returning();
    }
    if (!row) fail("Failed to save project");
    return serializeProject(row);
  },
});

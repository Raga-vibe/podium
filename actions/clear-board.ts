import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import {
  briefs,
  drafts,
  hackathons,
  milestones,
  projects,
  requirements,
  rubricCriteria,
  scores,
} from "../server/db/schema.js";

export default defineAction({
  description:
    "Delete a hackathon board and everything on it (requirements, milestones, rubric, scores, project, draft, briefs) for the current user. This cannot be undone. If it was the user's only board, Home seeds a fresh Builder.io starter board next visit.",
  schema: z.object({
    id: z.string().describe("Hackathon id of the board to clear"),
  }),
  outputSchema: z.object({
    id: z.string().describe("Hackathon id of the cleared board"),
    cleared: z.boolean().describe("True when the board and its data were deleted"),
  }),
  run: async ({ id }) => {
    const db = getDb();
    const owner = getOwner();
    await requireHackathon(id, "editor");
    // Every child delete is scoped to this board AND this owner, so a board
    // can never take another user's rows with it.
    const [deleted] = await db.transaction(async (tx) => {
      await tx
        .delete(requirements)
        .where(
          and(
            eq(requirements.hackathonId, id),
            eq(requirements.ownerEmail, owner.ownerEmail),
          ),
        );
      await tx
        .delete(milestones)
        .where(
          and(
            eq(milestones.hackathonId, id),
            eq(milestones.ownerEmail, owner.ownerEmail),
          ),
        );
      await tx
        .delete(rubricCriteria)
        .where(
          and(
            eq(rubricCriteria.hackathonId, id),
            eq(rubricCriteria.ownerEmail, owner.ownerEmail),
          ),
        );
      await tx
        .delete(scores)
        .where(
          and(
            eq(scores.hackathonId, id),
            eq(scores.ownerEmail, owner.ownerEmail),
          ),
        );
      await tx
        .delete(projects)
        .where(
          and(
            eq(projects.hackathonId, id),
            eq(projects.ownerEmail, owner.ownerEmail),
          ),
        );
      await tx
        .delete(drafts)
        .where(
          and(
            eq(drafts.hackathonId, id),
            eq(drafts.ownerEmail, owner.ownerEmail),
          ),
        );
      await tx
        .delete(briefs)
        .where(
          and(
            eq(briefs.hackathonId, id),
            eq(briefs.ownerEmail, owner.ownerEmail),
          ),
        );
      return tx
        .delete(hackathons)
        .where(
          and(
            eq(hackathons.id, id),
            eq(hackathons.ownerEmail, owner.ownerEmail),
          ),
        )
        .returning({ id: hackathons.id });
    });
    if (!deleted) fail("Board not found");
    return { id: deleted.id, cleared: true };
  },
});

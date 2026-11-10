import { defineAction } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import {
  latestScores,
  serializeDraft,
  serializeHackathon,
  serializeMilestone,
  serializeProject,
  serializeRequirement,
  serializeRubric,
  serializeScore,
  weightedTotal,
} from "../server/db/podium.js";
import {
  drafts,
  milestones,
  projects,
  requirements,
  rubricCriteria,
  scores,
} from "../server/db/schema.js";
import { projectOutputSchema } from "./save-project.js";
import { scoreOutputSchema } from "./save-scores.js";
import { requirementOutputSchema } from "./add-requirement.js";

// The board detail reuses the shared requirement shape (including its
// explicit lifecycle `state`) so get-hackathon can never drift from the
// canonical requirement output. Do not inline a second copy here.
const requirementSchema = requirementOutputSchema;
const milestoneSchema = z.object({
  id: z.string(),
  hackathonId: z.string(),
  label: z.string(),
  at: z.string().nullable(),
});
const rubricSchema = z.object({
  id: z.string(),
  hackathonId: z.string(),
  name: z.string(),
  weight: z.number(),
  description: z.string().nullable(),
});
const projectSchema = projectOutputSchema;
const scoreSchema = scoreOutputSchema;
const draftSchema = z.object({
  id: z.string(),
  hackathonId: z.string(),
  body: z.string(),
  updatedAt: z.string().nullable(),
});
const hackathonSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  organizer: z.string().nullable(),
  organizerTimezone: z.string().nullable(),
  submissionDeadline: z.string().nullable(),
  prizeSummary: z.string().nullable(),
  createdAt: z.string().nullable(),
});

export default defineAction({
  description: "Get one hackathon with its requirements, milestones, rubric, project, latest scores, draft and weighted total.",
  schema: z.object({
    id: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    hackathon: hackathonSchema,
    requirements: z.array(requirementSchema),
    milestones: z.array(milestoneSchema),
    rubricCriteria: z.array(rubricSchema),
    project: projectSchema.nullable(),
    scores: z.array(scoreSchema),
    draft: draftSchema.nullable(),
    weightedTotal: z.number().nullable(),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ id }) => {
    const db = getDb();
    const hackathon = await requireHackathon(id, "viewer");
    const [reqs, miles, rubric, projectRows, scoreRows, draftRows] =
      await Promise.all([
        db
          .select()
          .from(requirements)
          .where(eq(requirements.hackathonId, id))
          .orderBy(asc(requirements.order)),
        db
          .select()
          .from(milestones)
          .where(eq(milestones.hackathonId, id))
          .orderBy(asc(milestones.at)),
        db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, id)),
        db.select().from(projects).where(eq(projects.hackathonId, id)).limit(1),
        db.select().from(scores).where(eq(scores.hackathonId, id)),
        db.select().from(drafts).where(eq(drafts.hackathonId, id)).limit(1),
      ]);
    const latest = latestScores(scoreRows);
    return {
      hackathon: serializeHackathon(hackathon),
      requirements: reqs.map(serializeRequirement),
      milestones: miles.map(serializeMilestone),
      rubricCriteria: rubric.map(serializeRubric),
      project: projectRows[0] ? serializeProject(projectRows[0]) : null,
      scores: latest.map(serializeScore),
      draft: draftRows[0] ? serializeDraft(draftRows[0]) : null,
      weightedTotal: weightedTotal(latest, rubric),
    };
  },
});

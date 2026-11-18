import { defineAction } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import {
  buildHackathonGraph,
  graphContext,
  weakestCriterionLinks,
} from "../server/db/graph.js";
import { getDb } from "../server/db/index.js";
import {
  milestones,
  projects,
  requirements,
  rubricCriteria,
  scores,
} from "../server/db/schema.js";
import { requirementOutputSchema } from "./add-requirement.js";
import { scoreOutputSchema } from "./save-scores.js";

const graphNodeSchema = z.object({
  id: z.string().describe("Node id, prefixed by type, e.g. requirement:<id>"),
  type: z
    .enum(["hackathon", "requirement", "criterion", "milestone", "project", "score"])
    .describe("Node type"),
  label: z.string().describe("Human-readable node label"),
  data: z
    .record(z.string(), z.unknown())
    .describe("Serialized row for the node"),
});

const graphEdgeSchema = z.object({
  from: z.string().describe("Source node id"),
  to: z.string().describe("Target node id"),
  type: z
    .enum(["BELONGS_TO", "RELATES_TO", "DUE_BEFORE", "SCORED_BY", "LINKS_TO"])
    .describe("Edge type"),
  reason: z.string().describe("Why the edge exists, in plain words"),
});

const rubricSchema = z.object({
  id: z.string(),
  hackathonId: z.string(),
  name: z.string(),
  weight: z.number(),
  description: z.string().nullable(),
});

export default defineAction({
  description:
    "GraphRAG context for a hackathon: a deterministic knowledge graph built from the board's own rows (requirements, criteria, milestones, project, latest scores) plus a grounded plain-text summary naming the weakest criterion and the open requirements linked to it. Call this before scoring so the rubric coach grounds its scores and top fix in the board's own evidence.",
  schema: z.object({
    id: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    graph: z.object({
      nodes: z.array(graphNodeSchema).describe("Graph nodes"),
      edges: z.array(graphEdgeSchema).describe("Graph edges, each with a reason"),
    }),
    context: z
      .string()
      .describe(
        "Grounded plain-text summary: weakest criterion with its linked open requirements, open counts per criterion, and the next milestone; when nothing is scored yet it says so and lists open requirements per category instead.",
      ),
    weakest: z
      .object({
        criterion: rubricSchema.describe("Weakest rubric criterion"),
        score: scoreOutputSchema.describe("Latest score for the weakest criterion"),
        linkedOpenRequirements: z
          .array(requirementOutputSchema)
          .describe("Open requirements whose text shares a keyword with the weakest criterion, in board order"),
      })
      .nullable()
      .describe("Weakest criterion with its linked open requirements, or null when nothing is scored yet"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ id }) => {
    const db = getDb();
    const hackathon = await requireHackathon(id, "viewer");
    const [reqs, miles, rubric, projectRows, scoreRows] = await Promise.all([
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
    ]);
    const input = {
      hackathon,
      requirements: reqs,
      criteria: rubric,
      milestones: miles,
      project: projectRows[0] ?? null,
      scores: scoreRows,
    };
    return {
      graph: buildHackathonGraph(input),
      context: graphContext(input),
      weakest: weakestCriterionLinks(input),
    };
  },
});

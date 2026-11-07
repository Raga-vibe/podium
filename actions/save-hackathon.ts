import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getOwner, requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import {
  hackathons,
  milestones,
  requirements,
  rubricCriteria,
} from "../server/db/schema.js";

const categorySchema = z
  .enum(["build", "demo", "submission", "eligibility"])
  .describe("Requirement category: build, demo, submission or eligibility");
const sourceSchema = z
  .enum(["agent", "user"])
  .describe("Who created the requirement: agent or user");
const statusSchema = z
  .enum(["proposed", "accepted"])
  .describe("Requirement status: proposed (needs review) or accepted");

const requirementInputSchema = z.object({
  title: z.string().min(1).describe("Requirement title"),
  detail: z.string().optional().describe("Extra detail or clarification"),
  category: categorySchema,
  source: sourceSchema.default("agent").describe("Who created it; defaults to agent"),
  status: statusSchema.default("proposed").describe("Status; defaults to proposed"),
});

const milestoneInputSchema = z.object({
  label: z.string().min(1).describe("Milestone label"),
  at: z
    .string()
    .datetime({ offset: true })
    .describe("Milestone time as an ISO timestamp with timezone"),
});

const rubricInputSchema = z.object({
  name: z.string().min(1).describe("Rubric criterion name"),
  weight: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Criterion weight as a percentage (0-100)"),
  description: z.string().optional().describe("What the criterion covers"),
});

export default defineAction({
  description:
    "Validate and upsert a hackathon with its requirements, milestones and rubric. Replaces those lists with the supplied arrays.",
  schema: z.object({
    id: z.string().optional().describe("Existing hackathon id to update; omit to upsert by url"),
    name: z.string().min(1).describe("Hackathon name"),
    url: z.string().url().describe("Hackathon page URL"),
    organizer: z.string().optional().describe("Organizer name"),
    organizerTimezone: z.string().optional().describe("Organizer IANA timezone, e.g. America/Los_Angeles"),
    submissionDeadline: z
      .string()
      .datetime({ offset: true })
      .optional()
      .describe("Submission deadline as an ISO timestamp with timezone"),
    prizeSummary: z.string().optional().describe("Short summary of the prizes"),
    requirements: z
      .array(requirementInputSchema)
      .optional()
      .describe("Requirements to store (replaces existing ones)"),
    milestones: z
      .array(milestoneInputSchema)
      .optional()
      .describe("Milestones to store (replaces existing ones)"),
    rubric: z
      .array(rubricInputSchema)
      .optional()
      .describe("Rubric criteria to store (replaces existing ones)"),
  }),
  outputSchema: z.object({
    id: z.string().describe("Hackathon id"),
    name: z.string().describe("Hackathon name"),
    url: z.string().describe("Hackathon page URL"),
  }),
  run: async (args) => {
    const db = getDb();
    const owner = getOwner();
    const id = await db.transaction(async (tx) => {
      let hackathonId: string | null = null;
      if (args.id) {
        // Updating an existing board: it must be the caller's own.
        await requireHackathon(args.id, "editor");
        hackathonId = args.id;
      } else {
        // Upsert by url, but only within the caller's own boards: another
        // user's board with the same page must never be touched.
        const existing = await tx
          .select({ id: hackathons.id })
          .from(hackathons)
          .where(
            and(
              eq(hackathons.ownerEmail, owner.ownerEmail),
              eq(hackathons.url, args.url),
            ),
          )
          .limit(1);
        hackathonId = existing[0]?.id ?? null;
        if (hackathonId) {
          await requireHackathon(hackathonId, "editor");
        }
      }

      const values = {
        name: args.name,
        url: args.url,
        organizer: args.organizer ?? null,
        organizerTimezone: args.organizerTimezone ?? null,
        submissionDeadline: args.submissionDeadline
          ? new Date(args.submissionDeadline)
          : null,
        prizeSummary: args.prizeSummary ?? null,
      };

      if (hackathonId) {
        await tx
          .update(hackathons)
          .set(values)
          .where(eq(hackathons.id, hackathonId));
      } else {
        hackathonId = crypto.randomUUID();
        await tx.insert(hackathons).values({
          id: hackathonId,
          ...values,
          ownerEmail: owner.ownerEmail,
          orgId: owner.orgId,
        });
      }

      if (args.requirements !== undefined) {
        await tx
          .delete(requirements)
          .where(eq(requirements.hackathonId, hackathonId));
        if (args.requirements.length > 0) {
          await tx.insert(requirements).values(
            args.requirements.map((r, i) => ({
              id: crypto.randomUUID(),
              hackathonId: hackathonId as string,
              title: r.title,
              detail: r.detail ?? null,
              category: r.category,
              done: false,
              source: r.source,
              status: r.status,
              order: i,
              ownerEmail: owner.ownerEmail,
              orgId: owner.orgId,
            })),
          );
        }
      }
      if (args.milestones !== undefined) {
        await tx
          .delete(milestones)
          .where(eq(milestones.hackathonId, hackathonId));
        if (args.milestones.length > 0) {
          await tx.insert(milestones).values(
            args.milestones.map((m) => ({
              id: crypto.randomUUID(),
              hackathonId: hackathonId as string,
              label: m.label,
              at: new Date(m.at),
              ownerEmail: owner.ownerEmail,
              orgId: owner.orgId,
            })),
          );
        }
      }
      if (args.rubric !== undefined) {
        await tx
          .delete(rubricCriteria)
          .where(eq(rubricCriteria.hackathonId, hackathonId));
        if (args.rubric.length > 0) {
          await tx.insert(rubricCriteria).values(
            args.rubric.map((c) => ({
              id: crypto.randomUUID(),
              hackathonId: hackathonId as string,
              name: c.name,
              weight: c.weight,
              description: c.description ?? null,
              ownerEmail: owner.ownerEmail,
              orgId: owner.orgId,
            })),
          );
        }
      }
      return hackathonId;
    });
    if (!id) fail("Failed to save hackathon");
    return { id, name: args.name, url: args.url };
  },
});

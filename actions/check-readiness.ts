import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireHackathon } from "../server/db/access.js";
import { getDb } from "../server/db/index.js";
import { latestScores, sortRequirementsByBoardOrder } from "../server/db/podium.js";
import {
  drafts,
  projects,
  requirements,
  rubricCriteria,
  scores,
} from "../server/db/schema.js";

const checkSchema = z.object({
  label: z.string().describe("What was checked"),
  ok: z.boolean().describe("Whether the check passed"),
  detail: z.string().describe("One-line detail for the check"),
});

export default defineAction({
  description:
    "Check whether a hackathon entry is ready to submit: every requirement done, repo, live and Clips demo links present, every rubric criterion scored, and a submission draft saved. Returns a pass or a fix list. Call this for 'am I ready to submit?' questions.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    ready: z.boolean().describe("True when every check passed"),
    checks: z.array(checkSchema).describe("One entry per check, in order"),
    fixes: z.array(z.string()).describe("Fix list: empty when ready, otherwise what to do next"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ hackathonId }) => {
    const db = getDb();
    const hackathon = await requireHackathon(hackathonId, "viewer");
    const [reqs, projectRows, draftRows, rubric, scoreRows] = await Promise.all([
      db.select().from(requirements).where(eq(requirements.hackathonId, hackathonId)),
      db.select().from(projects).where(eq(projects.hackathonId, hackathonId)).limit(1),
      db.select().from(drafts).where(eq(drafts.hackathonId, hackathonId)).limit(1),
      db.select().from(rubricCriteria).where(eq(rubricCriteria.hackathonId, hackathonId)),
      db.select().from(scores).where(eq(scores.hackathonId, hackathonId)),
    ]);
    const open = sortRequirementsByBoardOrder(reqs.filter((r) => !r.done));
    const project = projectRows[0] ?? null;
    const draft = draftRows[0] ?? null;
    const scoredIds = new Set(latestScores(scoreRows).map((s) => s.criterionId));
    const unscored = rubric.filter((c) => !scoredIds.has(c.id));
    const checks: Array<{ label: string; ok: boolean; detail: string }> = [];
    const fixes: string[] = [];

    checks.push({
      label: "Requirements",
      ok: open.length === 0,
      detail:
        open.length === 0
          ? `${reqs.length} of ${reqs.length} requirements done`
          : `${open.length} of ${reqs.length} requirements still open: ${open.slice(0, 3).map((r) => r.title).join("; ")}${open.length > 3 ? `; and ${open.length - 3} more` : ""}`,
    });
    if (open.length > 0) fixes.push(`Finish ${open.length} open requirement${open.length === 1 ? "" : "s"} (next: ${open[0]?.title ?? "the next one"}).`);

    checks.push({
      label: "Repo link",
      ok: Boolean(project?.repoUrl),
      detail: project?.repoUrl ? "Repo URL saved" : "No repo URL on the project",
    });
    if (!project?.repoUrl) fixes.push("Add the repo URL in Your project.");

    checks.push({
      label: "Live link",
      ok: Boolean(project?.liveUrl),
      detail: project?.liveUrl ? "Live URL saved" : "No live URL on the project",
    });
    if (!project?.liveUrl) fixes.push("Add the live (deployed) URL in Your project.");

    checks.push({
      label: "Clips demo link",
      ok: Boolean(project?.demoUrl),
      detail: project?.demoUrl ? "Clips demo URL saved" : "No Clips demo URL on the project",
    });
    if (!project?.demoUrl) fixes.push("Add the Clips demo URL in Your project.");

    checks.push({
      label: "Rubric scored",
      ok: rubric.length > 0 && unscored.length === 0,
      detail:
        rubric.length === 0
          ? "No rubric on the board yet"
          : unscored.length === 0
            ? `${rubric.length} of ${rubric.length} criteria scored`
            : `${unscored.length} of ${rubric.length} criteria unscored: ${unscored.map((c) => c.name).join("; ")}`,
    });
    if (rubric.length === 0) fixes.push("Import the hackathon page so the rubric is extracted.");
    else if (unscored.length > 0) fixes.push(`Score the ${unscored.length} unscored ${unscored.length === 1 ? "criterion" : "criteria"}.`);

    checks.push({
      label: "Submission draft",
      ok: Boolean(draft?.body?.trim()),
      detail: draft?.body?.trim() ? "Draft saved" : "No submission draft yet",
    });
    if (!draft?.body?.trim()) fixes.push("Draft the submission, then review it.");

    const deadline = hackathon.submissionDeadline;
    const past = deadline ? deadline.getTime() < Date.now() : false;
    checks.push({
      label: "Deadline",
      ok: !past,
      detail: deadline
        ? past
          ? "The submission deadline has passed"
          : "Deadline is still ahead"
        : "No deadline on the board",
    });
    if (past) fixes.push("The deadline has passed; this entry is late.");
    if (!deadline) fixes.push("Import the hackathon page so the deadline is set.");

    return { hackathonId, ready: fixes.length === 0, checks, fixes };
  },
});

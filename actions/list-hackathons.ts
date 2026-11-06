import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import {
  serializeHackathon,
  weightedTotal,
} from "../server/db/podium.js";
import { hackathons, requirements, rubricCriteria, scores } from "../server/db/schema.js";

const hackathonSummarySchema = z.object({
  id: z.string().describe("Hackathon id"),
  name: z.string().describe("Hackathon name"),
  url: z.string().describe("Hackathon page URL"),
  organizer: z.string().nullable().describe("Organizer name, or null"),
  organizerTimezone: z.string().nullable().describe("Organizer timezone, or null"),
  submissionDeadline: z.string().nullable().describe("Submission deadline as an ISO string, or null"),
  prizeSummary: z.string().nullable().describe("Prize summary, or null"),
  createdAt: z.string().nullable().describe("Creation time as an ISO string"),
  requirementCount: z.number().describe("Total number of requirements"),
  doneCount: z.number().describe("Number of completed requirements"),
  openCount: z.number().describe("Number of open requirements"),
  weightedTotal: z.number().nullable().describe("Weighted rubric total 0-10, or null when unscored"),
});

export default defineAction({
  description: "List all hackathons with requirement counts and latest weighted rubric total.",
  schema: z.object({}),
  outputSchema: z.object({
    hackathons: z.array(hackathonSummarySchema).describe("Hackathons ordered by submission deadline, soonest first"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async () => {
    const db = getDb();
    const [all, allReqs, allScores, allRubric] = await Promise.all([
      db.select().from(hackathons),
      db.select().from(requirements),
      db.select().from(scores),
      db.select().from(rubricCriteria),
    ]);
    const reqsByHackathon = new Map<string, typeof allReqs>();
    for (const r of allReqs) {
      const list = reqsByHackathon.get(r.hackathonId) ?? [];
      list.push(r);
      reqsByHackathon.set(r.hackathonId, list);
    }
    const scoresByHackathon = new Map<string, typeof allScores>();
    for (const s of allScores) {
      const list = scoresByHackathon.get(s.hackathonId) ?? [];
      list.push(s);
      scoresByHackathon.set(s.hackathonId, list);
    }
    const rubricByHackathon = new Map<string, typeof allRubric>();
    for (const c of allRubric) {
      const list = rubricByHackathon.get(c.hackathonId) ?? [];
      list.push(c);
      rubricByHackathon.set(c.hackathonId, list);
    }
    const sorted = [...all].sort((a, b) => {
      if (!a.submissionDeadline && !b.submissionDeadline) return 0;
      if (!a.submissionDeadline) return 1;
      if (!b.submissionDeadline) return -1;
      return a.submissionDeadline.getTime() - b.submissionDeadline.getTime();
    });
    return {
      hackathons: sorted.map((h) => {
        const reqs = reqsByHackathon.get(h.id) ?? [];
        const done = reqs.filter((r) => r.done).length;
        return {
          ...serializeHackathon(h),
          requirementCount: reqs.length,
          doneCount: done,
          openCount: reqs.length - done,
          weightedTotal: weightedTotal(
            scoresByHackathon.get(h.id) ?? [],
            rubricByHackathon.get(h.id) ?? [],
          ),
        };
      }),
    };
  },
});

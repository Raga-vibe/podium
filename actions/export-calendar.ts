import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { buildIcs, slugify, type IcsEventInput } from "../server/db/podium.js";
import { hackathons, milestones } from "../server/db/schema.js";

export default defineAction({
  description:
    "Build a standard .ics calendar file for a hackathon: one event per milestone plus the submission deadline, each with alerts 24 hours and 2 hours before.",
  schema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
  }),
  outputSchema: z.object({
    hackathonId: z.string().describe("Hackathon id"),
    filename: z.string().describe("Suggested .ics filename"),
    mimeType: z.string().describe("MIME type: text/calendar"),
    ics: z.string().describe("The .ics file contents"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ hackathonId }) => {
    const db = getDb();
    const [hackathon] = await db
      .select()
      .from(hackathons)
      .where(eq(hackathons.id, hackathonId))
      .limit(1);
    if (!hackathon) fail(`Hackathon not found: ${hackathonId}`, { statusCode: 404 });
    const miles = await db
      .select()
      .from(milestones)
      .where(eq(milestones.hackathonId, hackathonId))
      .orderBy(asc(milestones.at));
    const now = new Date();
    const events: IcsEventInput[] = miles.map((m) => ({
      uid: `${m.id}@podium`,
      start: m.at,
      end: new Date(m.at.getTime() + 3600000),
      summary: `${hackathon.name}: ${m.label}`,
      description: `${m.label} for ${hackathon.name}.`,
    }));
    if (hackathon.submissionDeadline) {
      events.push({
        uid: `${hackathon.id}-deadline@podium`,
        start: hackathon.submissionDeadline,
        end: new Date(hackathon.submissionDeadline.getTime() + 3600000),
        summary: `${hackathon.name}: submissions close`,
        description: `Submission deadline for ${hackathon.name}.`,
      });
    }
    return {
      hackathonId,
      filename: `${slugify(hackathon.name)}-deadlines.ics`,
      mimeType: "text/calendar",
      ics: buildIcs(events, now),
    };
  },
});

import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { seedBuilderHackathon } from "../server/db/seed.js";

export default defineAction({
  description:
    "Seed Podium with a ready-made Builder.io Agent-Native Hackathon record. Does nothing when the seeded board already exists.",
  schema: z.object({}),
  outputSchema: z.object({
    seeded: z.boolean().describe("True when the seed record was created"),
    reason: z.string().optional().describe("Why seeding was skipped, when seeded is false"),
    hackathonId: z.string().optional().describe("Id of the seeded hackathon, when seeded is true"),
  }),
  run: async () => {
    return seedBuilderHackathon();
  },
});

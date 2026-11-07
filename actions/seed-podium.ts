import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { seedBuilderHackathon } from "../server/db/seed.js";

export default defineAction({
  description:
    "Ensure the current user has their own Builder.io Agent-Native Hackathon starter board. Creates it when they don't have one; does nothing when they already do. Boards are never shared, so every user gets their own copy.",
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

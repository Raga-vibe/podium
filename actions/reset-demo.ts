import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { resetSeededHackathon } from "../server/db/seed.js";

export default defineAction({
  description:
    "Reset the demo board: restore the seeded Builder.io Agent-Native Hackathon to its fresh state (requirements open and accepted, no scores, no draft, rubric restored to the official judging criteria). The board's own requirements are kept. Only the demo board is touched; other hackathons are never affected.",
  schema: z.object({}),
  outputSchema: z.object({
    reset: z.boolean().describe("True when the demo board was restored"),
    hackathonId: z.string().describe("Id of the demo board"),
  }),
  run: async () => {
    const { hackathonId } = await resetSeededHackathon();
    return { reset: true, hackathonId };
  },
});

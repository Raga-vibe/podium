import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { seedStarterBoards } from "../server/db/seed.js";

export default defineAction({
  description:
    "Ensure the current user has both starter boards: the Builder.io Agent-Native Hackathon board and the Hermes Agent Plugin Hackathon board. Creates whichever is missing; does nothing for boards they already have. Boards are never shared, so every user gets their own copies.",
  schema: z.object({}),
  outputSchema: z.object({
    seeded: z.boolean().describe("True when at least one starter board was created"),
    hackathonIds: z
      .array(z.string())
      .describe("Ids of the starter boards (Builder.io and Hermes)"),
  }),
  run: async () => {
    return seedStarterBoards();
  },
});

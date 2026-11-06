import { defineAction } from "@agent-native/core/action";
import { putSetting } from "@agent-native/core/settings";
import { z } from "zod";
import {
  BRIEF_SETTINGS_KEY,
  briefSettingsOutputSchema,
} from "./get-brief-settings.js";

export default defineAction({
  description: "Save the daily brief settings: on/off and the time of day.",
  schema: z.object({
    enabled: z.boolean().describe("Whether the daily brief is on"),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM in 24-hour format")
      .describe("Time of day for the brief, HH:MM in 24-hour format"),
  }),
  outputSchema: briefSettingsOutputSchema,
  run: async ({ enabled, time }) => {
    await putSetting(BRIEF_SETTINGS_KEY, { enabled, time });
    return { enabled, time };
  },
});

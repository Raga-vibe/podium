import { defineAction } from "@agent-native/core/action";
import { getSetting } from "@agent-native/core/settings";
import { z } from "zod";

export const BRIEF_SETTINGS_KEY = "podium:brief-settings";
export const DEFAULT_BRIEF_SETTINGS = { enabled: true, time: "07:00" };

export function parseBriefSettings(
  value: Record<string, unknown> | null,
): { enabled: boolean; time: string } {
  if (!value) return { ...DEFAULT_BRIEF_SETTINGS };
  const enabled = typeof value.enabled === "boolean" ? value.enabled : true;
  const time =
    typeof value.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)
      ? value.time
      : "07:00";
  return { enabled, time };
}

export const briefSettingsOutputSchema = z.object({
  enabled: z.boolean().describe("Whether the daily brief is on"),
  time: z.string().describe("Time of day for the brief, HH:MM in 24-hour format"),
});

export default defineAction({
  description: "Get the daily brief settings: on/off and the time of day.",
  schema: z.object({}),
  outputSchema: briefSettingsOutputSchema,
  http: { method: "GET" },
  readOnly: true,
  run: async () => {
    const stored = await getSetting(BRIEF_SETTINGS_KEY);
    return parseBriefSettings(stored);
  },
});

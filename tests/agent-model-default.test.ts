import { describe, expect, it } from "vitest";

import { getAppConfig } from "@agent-native/core/server";

// Importing the branding plugin registers the app config (defineAppConfig).
import "../server/plugins/agent-native-email-branding.js";

describe("agent default model", () => {
  it("defaults the agent to Gemini 3.5 Flash-Lite", () => {
    expect(getAppConfig().agent.model).toBe("gemini-3.5-flash-lite");
  });
});

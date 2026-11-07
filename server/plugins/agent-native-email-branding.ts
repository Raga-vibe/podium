import { defineAppConfig } from "@agent-native/core/server";

export default defineAppConfig({
  app: {
    // This name appears in transactional emails. Change it to your product name.
    name: "Podium",
    // The source template keeps a renamed app from inheriting first-party email branding.
    sourceTemplate: "chat",
    // Keep the template's authenticated entry explicit after renaming the app.
    homePath: "/home",
    // Optional: use your own absolute HTTPS logo URL in transactional emails.
    // logoUrl: "https://example.com/logo.png",
  },
  agent: {
    // Default model for the agent. Gemini 3.5 Flash-Lite (gemini-3.5-flash-lite)
    // is the fastest, lowest-cost model for the deployment Gemini key
    // (GOOGLE_GENERATIVE_AI_API_KEY), which is the fallback for anyone without
    // a Builder.io connection. The framework's model setting is app-wide, so
    // Builder.io users get the same model through Builder's gateway
    // (gemini-3-5-flash-lite); the Builder engine itself is unchanged.
    model: "gemini-3.5-flash-lite",
  },
});

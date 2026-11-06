import { defineAction } from "@agent-native/core/action";
import {
  readAppState,
  readAppStateForCurrentTab,
} from "@agent-native/core/application-state";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../server/db/index.js";
import { iso } from "../server/db/podium.js";
import { hackathons, requirements } from "../server/db/schema.js";

export default defineAction({
  description:
    "Read the Chat app's current navigation state. Basic navigation is already included in <current-screen>; use this action only when you need a fresh read.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;

    // Podium: when the user is looking at a hackathon, attach its live summary
    // so the agent knows exactly which board is on screen.
    try {
      const nav = navigation as Record<string, unknown> | null;
      if (nav && nav.view === "hackathon" && typeof nav.hackathonId === "string") {
        const db = getDb();
        const [hackathon] = await db
          .select()
          .from(hackathons)
          .where(eq(hackathons.id, nav.hackathonId))
          .limit(1);
        if (hackathon) {
          const reqs = await db
            .select({ done: requirements.done })
            .from(requirements)
            .where(eq(requirements.hackathonId, hackathon.id));
          const done = reqs.filter((r) => r.done).length;
          screen.hackathon = {
            id: hackathon.id,
            name: hackathon.name,
            url: hackathon.url,
            submissionDeadline: iso(hackathon.submissionDeadline),
            requirementCount: reqs.length,
            doneCount: done,
            openCount: reqs.length - done,
          };
        }
      }
    } catch {
      // Never break the navigation read when the Podium tables are unavailable.
    }

    // Podium: what the user last selected (a requirement or rubric criterion).
    // The UI writes `selection` when the user clicks an item, so "fix this"
    // targets that item. A missing selection is normal, not an error.
    try {
      const selection = await readAppStateForCurrentTab("selection");
      if (selection) screen.selection = selection;
    } catch {
      // Selection is best-effort; ignore read failures.
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});

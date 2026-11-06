import { writeClientAppState } from "@agent-native/core/client/hooks";

import { TAB_ID } from "@/lib/tab-id";

export interface Selection {
  kind: "requirement" | "criterion";
  id: string;
  text: string;
  hackathonId: string;
}

/**
 * Record what the user last selected so the agent can target it.
 * The agent reads this through view-screen ("fix this" targets the selection).
 * Best-effort: a failed write must never break the click itself.
 */
export async function selectItem(selection: Selection): Promise<void> {
  try {
    await writeClientAppState(`selection:${TAB_ID}`, selection, {
      requestSource: TAB_ID,
    });
  } catch {
    // Selection is a hint, not a requirement.
  }
}

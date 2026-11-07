import { fail } from "@agent-native/core/action";
import { getRequestOrgId, getRequestUserEmail } from "@agent-native/core/server/request-context";
import { assertAccess } from "@agent-native/core/sharing";
import { eq } from "drizzle-orm";

import { getDb } from "./index.js";
import { hackathons } from "./schema.js";

/**
 * The signed-in user, from the request context. Actions must never fall back
 * to a shared sentinel owner: without an authenticated session there is no
 * board to read or write.
 */
export function getOwner(): { ownerEmail: string; orgId: string | null } {
  const ownerEmail = getRequestUserEmail();
  if (!ownerEmail) fail("Not authenticated", { statusCode: 401 });
  return { ownerEmail, orgId: getRequestOrgId() ?? null };
}

/**
 * Load a hackathon and require the caller to hold at least `role` on it
 * (owner counts). 404 when the board does not exist, 403 when it belongs
 * to someone else. Every board action goes through this before touching
 * the board or its requirements, scores, draft, project or briefs.
 */
export async function requireHackathon(
  id: string,
  role: "viewer" | "editor" | "admin" = "viewer",
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, id))
    .limit(1);
  if (!row) fail(`Hackathon not found: ${id}`, { statusCode: 404 });
  await assertAccess("hackathon", id, role);
  return row;
}

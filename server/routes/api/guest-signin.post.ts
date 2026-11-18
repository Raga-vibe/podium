import {
  addSession,
  createBetterAuthSessionForEmail,
  setFrameworkSessionCookie,
} from "@agent-native/core/server";
import { defineEventHandler, sendRedirect } from "h3";

/**
 * Server-side demo sign-in. The demo account password never reaches the
 * browser and is not needed here at all: this route mints a real session
 * for the shared demo account directly on the server (the same helper the
 * framework's own action bridges use), sets the framework session cookie,
 * and redirects to /home. The demo account (guest@podium.app) holds only
 * demo boards, which the guest page resets on every visit.
 */
const DEMO_EMAIL = "guest@podium.app";

export default defineEventHandler(async (event) => {
  const session = await createBetterAuthSessionForEmail(DEMO_EMAIL);
  if (!session) {
    return sendRedirect(event, "/sign-in?demo=failed", 302);
  }
  setFrameworkSessionCookie(event, session.token);
  await addSession(session.token, session.email);
  return sendRedirect(event, "/home", 302);
});

import {
  createBetterAuthSessionForEmail,
  getSession,
  setBetterAuthSessionCookie,
} from "@agent-native/core/server";
import { defineEventHandler, type H3Event } from "h3";

import { getDemoBoardLastReset, resetSeededHackathon } from "../db/seed.js";

/**
 * Redirect that carries the cookies staged on the event (for example the
 * session cookie just set) into the response. h3's sendRedirect returns a
 * bare Response and would drop them; this mirrors the framework's
 * redirectWithStagedCookies, which is not exported from the package index.
 */
function redirectWithCookies(event: H3Event, location: string): Response {
  const headers = new Headers({ Location: location });
  const staged = event.res?.headers?.getSetCookie?.() ?? [];
  for (const cookie of staged) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

/**
 * Guest entry: one click signs a visitor into the shared demo account and
 * lands them on Home. No email, password or verification step.
 *
 * The demo account is an ordinary Better Auth user (demo@podium.app), created
 * once by signing up on the live app. Guests never see or type its password:
 * the server mints a real Better Auth session for that email and sets the
 * session cookie, then redirects. The agent works for the guest through the
 * deployment provider key, exactly as for any signed-in user without their
 * own connection. The deployment key itself is never sent to the client.
 *
 * Guests share the demo board, so a new guest entry resets it to its fresh
 * state when the last reset is more than 10 minutes old (tracked in
 * app-state). A reset never blocks entry: if it fails, the guest still lands
 * on Home with the board as it is. A visitor who already has a session is
 * never reset out from under their work.
 */
const DEMO_EMAIL = "demo@podium.app";
const RESET_AFTER_MS = 10 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const existing = await getSession(event);
  if (existing) return redirectWithCookies(event, "/home");
  const session = await createBetterAuthSessionForEmail(DEMO_EMAIL);
  // No demo account yet (fresh database): fall back to normal sign-in.
  if (!session) return redirectWithCookies(event, "/sign-in");
  await setBetterAuthSessionCookie(event, session.token);
  const lastReset = await getDemoBoardLastReset();
  if (!lastReset || Date.now() - lastReset.getTime() > RESET_AFTER_MS) {
    try {
      await resetSeededHackathon();
    } catch (error) {
      console.error("Guest entry: demo board reset failed", error);
    }
  }
  return redirectWithCookies(event, "/home");
});

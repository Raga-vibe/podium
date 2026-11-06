import {
  createBetterAuthSessionForEmail,
  getSession,
  setBetterAuthSessionCookie,
} from "@agent-native/core/server";
import { defineEventHandler, type H3Event } from "h3";

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
 */
const DEMO_EMAIL = "demo@podium.app";

export default defineEventHandler(async (event) => {
  const existing = await getSession(event);
  if (existing) return redirectWithCookies(event, "/home");
  const session = await createBetterAuthSessionForEmail(DEMO_EMAIL);
  // No demo account yet (fresh database): fall back to normal sign-in.
  if (!session) return redirectWithCookies(event, "/sign-in");
  await setBetterAuthSessionCookie(event, session.token);
  return redirectWithCookies(event, "/home");
});

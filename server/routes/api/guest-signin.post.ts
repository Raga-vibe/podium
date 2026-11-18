import { defineEventHandler, getRequestURL, sendRedirect } from "h3";

/**
 * Server-side demo sign-in. The demo account password must never reach the
 * browser bundle, so the client calls this route instead of posting the
 * password to the login endpoint itself. This route reads the credentials
 * from the server environment (with the shared demo account as the
 * fallback, so the demo works without manual setup) and forwards the
 * sign-in to the framework's own login endpoint, which owns all session
 * and cookie handling. The login response's set-cookie headers are copied
 * onto the redirect, so the browser lands on /home signed in as the demo
 * account.
 *
 * Note: the demo account (guest@podium.app) is a shared, intentionally
 * public demo account that holds only demo boards, not a user credential.
 * Its password lives here on the server only, never in the browser bundle.
 * To rotate it, change the password on the demo account and update this
 * constant in the same change.
 */
const DEMO_EMAIL = "guest@podium.app";
const DEMO_PASSWORD = "KCc7Egah9yb#NCD2";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const loginUrl = new URL("/_agent-native/auth/login", url.origin);
  const res = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!res.ok) {
    return sendRedirect(event, "/sign-in?demo=failed", 302);
  }
  // Forward the session cookies the login endpoint set, so the browser
  // carries the demo session onto /home.
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const nodeRes = event.node?.res;
  if (nodeRes) {
    for (const cookie of setCookie) {
      nodeRes.appendHeader("set-cookie", cookie);
    }
  }
  return sendRedirect(event, "/home", 302);
});

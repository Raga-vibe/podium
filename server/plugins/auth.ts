import {
  createToolkitAuthPlugin,
  renderAuthPage,
} from "@agent-native/toolkit/app/auth/server";
import { registerAuthPublicPaths } from "@agent-native/core/server";

/**
 * The demo sign-in route mints a session for the shared demo account, so it
 * must be reachable without a browser session. It is a framework route with
 * its own authentication (it mints the session server-side), so it is
 * registered here as an exact public path for the auth guard. Without this,
 * the guard 401s the POST before the route handler ever runs.
 */
registerAuthPublicPaths(["/api/guest-signin"]);

/**
 * "Try the demo" pill for the top of the sign-in page, linking to the guest
 * demo. The framework's AuthPage takes no custom-content prop, and it
 * hydrates #agent-native-auth-root, which strips any extra node placed
 * inside that root (that is why a banner prepended to the HTML vanished
 * once the page's JavaScript loaded). So instead of injecting HTML, we
 * inject a script that adds the pill to document.body, outside the
 * hydrated root, where React never touches it. The script runs while the
 * page parses, before hydration, so the pill is permanent.
 */
const DEMO_BANNER_SCRIPT = `<script>(function(){if(document.getElementById("podium-demo-pill"))return;var b=document.createElement("div");b.id="podium-demo-pill";b.style.cssText="display:flex;justify-content:center;padding:20px 16px 0;position:relative;z-index:10;";var a=document.createElement("a");a.href="/guest";a.textContent="Try the demo \\u2014 no account needed";a.style.cssText="display:inline-flex;align-items:center;gap:8px;background:#fbbf24;color:#09090b;font-weight:600;padding:10px 20px;border-radius:9999px;text-decoration:none;font-family:inherit;font-size:14px;";b.appendChild(a);document.body.prepend(b);})();</script>`;

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/", "/guest", "/privacy", "/terms", "/api/guest-signin"],
  // The landing page lives at "/": with rootAuth on, the framework's server
  // auth guard serves the sign-in page at "/" before React Router ever runs,
  // so no client-side change can make the landing page visible. Off means
  // "/" renders the app shell and the landing page's own session check sends
  // signed-in visitors to /home.
  rootAuth: false,
  marketing: false,
  renderSignInPage: (props) => renderAuthPage(props) + DEMO_BANNER_SCRIPT,
});

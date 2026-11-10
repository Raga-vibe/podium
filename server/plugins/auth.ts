import {
  createToolkitAuthPlugin,
  renderAuthPage,
} from "@agent-native/toolkit/app/auth/server";

/**
 * Banner pinned to the top of the sign-in page, linking to the guest demo.
 * The framework's AuthPage takes no custom-content prop, so it is prepended
 * to the rendered HTML string. It sits outside the AuthPage's own root, so
 * client hydration of the form does not touch it.
 */
const DEMO_BANNER = `<div style="display:flex;justify-content:center;padding:20px 16px 0;"><a href="/guest" style="display:inline-flex;align-items:center;gap:8px;background:#fbbf24;color:#09090b;font-weight:600;padding:10px 20px;border-radius:9999px;text-decoration:none;font-family:inherit;font-size:14px;">Try the demo — no account needed</a></div>`;

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/", "/guest"],
  // The landing page lives at "/": with rootAuth on, the framework's server
  // auth guard serves the sign-in page at "/" before React Router ever runs,
  // so no client-side change can make the landing page visible. Off means
  // "/" renders the app shell and the landing page's own session check sends
  // signed-in visitors to /home.
  rootAuth: false,
  marketing: false,
  renderSignInPage: (props) => DEMO_BANNER + renderAuthPage(props),
});

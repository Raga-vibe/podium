import {
  createToolkitAuthPlugin,
  renderAuthPage,
} from "@agent-native/toolkit/app/auth/server";

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  // The landing page lives at "/": with rootAuth on, the framework's server
  // auth guard serves the sign-in page at "/" before React Router ever runs,
  // so no client-side change can make the landing page visible. Off means
  // "/" renders the app shell and the landing page's own session check sends
  // signed-in visitors to /home.
  rootAuth: false,
  marketing: false,
  // Guest entry is a plain server route (/guest) that mints a demo session
  // and redirects to /home, so the auth guard must let it through.
  publicPaths: ["/guest"],
  // The framework's sign-in page, plus a guest link for visitors who just
  // want the demo board. It points at the same /guest route the landing
  // page's "Try the demo" button uses.
  renderSignInPage: (props) =>
    renderAuthPage(props) +
    `<div style="margin-top:1.25rem;text-align:center"><a href="/guest" style="font-weight:600;text-decoration:underline">Continue as guest</a><p style="margin-top:0.5rem;font-size:0.875rem;opacity:0.8">No email needed. Explore the demo board and chat with the agent.</p></div>`,
});

import {
  createToolkitAuthPlugin,
  renderAuthPage,
} from "@agent-native/toolkit/app/auth/server";

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/", "/guest"],
  // The landing page lives at "/": with rootAuth on, the framework's server
  // auth guard serves the sign-in page at "/" before React Router ever runs,
  // so no client-side change can make the landing page visible. Off means
  // "/" renders the app shell and the landing page's own session check sends
  // signed-in visitors to /home.
  rootAuth: false,
  marketing: false,
  renderSignInPage: (props) => renderAuthPage(props),
});

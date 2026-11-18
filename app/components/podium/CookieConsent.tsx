import { useEffect, useState } from "react";
import { Link } from "react-router";

const CONSENT_KEY = "podium:cookie-consent";

/**
 * Cookie consent banner. Podium only uses one cookie, the session cookie
 * that keeps you signed in, plus a few localStorage preferences. There is
 * no advertising or third-party tracking. The banner shows once until the
 * visitor accepts or declines; declining only records the choice, the
 * session cookie is still required for sign-in to work.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CONSENT_KEY)) {
        setVisible(true);
      }
    } catch {
      // Storage unavailable: show the banner each visit.
      setVisible(true);
    }
  }, []);

  function choose(value: "accepted" | "declined") {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Storage unavailable: the banner just hides for this visit.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-[#050505]/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-muted-foreground">
          Podium uses one cookie to keep you signed in. No ads, no
          third-party tracking.{" "}
          <Link to="/privacy" className="text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="h-9 rounded-full border border-border px-4 font-medium hover:bg-white/5"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="h-9 rounded-full bg-[#ff4800] px-4 font-semibold text-white hover:bg-[#ff5e23]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

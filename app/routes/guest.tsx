import { callAction } from "@agent-native/core/client/hooks";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

/**
 * Demo account for judges. It holds only demo boards, so the password lives
 * here in the client: anyone who opens the demo signs in as this account.
 * Every guest entry resets the Builder.io board and clears the Hermes board,
 * so each judge starts from fresh boards.
 */
const DEMO_EMAIL = "guest@podium.app";
const DEMO_PASSWORD = "KCc7Egah9yb#NCD2";

/** The Hermes announcement URL, matching server/db/seed.ts. */
const HERMES_HACKATHON_URL =
  "https://x.com/nousresearch/status/2118094256438936062";

function sameHackathonUrl(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  return normalize(a) === normalize(b);
}

export default function Guest() {
  const [status, setStatus] = useState("Signing you in to the demo…");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/_agent-native/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
        });
        if (!res.ok) {
          throw new Error("Demo sign-in failed. Please sign in instead.");
        }
        setStatus("Resetting the demo boards…");
        await callAction("reset-demo", {});
        // Clear the Hermes board too, so the next Home visit seeds it fresh.
        // Best effort: if it fails, the Hermes board just keeps its progress.
        try {
          const listed = await callAction("list-hackathons", {});
          const hermes = listed.hackathons.find((h) =>
            sameHackathonUrl(h.url, HERMES_HACKATHON_URL),
          );
          if (hermes) {
            await callAction("clear-board", { id: hermes.id });
          }
        } catch {
          // Ignore: the Builder.io board is already fresh.
        }
        window.location.href = "/home";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Demo sign-in failed.");
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="font-medium">Could not start the demo</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Link
          to="/home"
          className="mt-4 font-medium underline underline-offset-2"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-medium">{status}</p>
    </div>
  );
}

import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { agentEngineStatusUrlForChatApi } from "@agent-native/core/client/agent-chat";
import { useSession } from "@agent-native/core/client/use-session";
import {
  IconCalendar,
  IconSparkles,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { ImportBar } from "@/components/podium/ImportBar";
import {
  Countdown,
  ProgressRing,
} from "@/components/podium/Countdown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  askAgent,
  formatDay,
  formatInZone,
  formatLocal,
  type HackathonSummary,
} from "@/lib/podium";

function HackathonCard({ hackathon }: { hackathon: HackathonSummary }) {
  const done = hackathon.requirementCount
    ? hackathon.doneCount / hackathon.requirementCount
    : 0;
  const organizerTime = formatInZone(
    hackathon.submissionDeadline,
    hackathon.organizerTimezone,
  );
  return (
    <Link
      to={`/hackathon/${hackathon.id}`}
      className="group block min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      aria-label={`${hackathon.name}, open mission board`}
    >
      <Card className="h-full transition-colors group-hover:border-amber-400/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg leading-snug">
              {hackathon.name}
            </CardTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {hackathon.organizer ?? "Hackathon"}
              {hackathon.prizeSummary ? ` · ${hackathon.prizeSummary}` : ""}
            </p>
          </div>
          <ProgressRing
            value={done}
            label={`${hackathon.doneCount} of ${hackathon.requirementCount} requirements done`}
          />
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <IconCalendar className="size-4 shrink-0 text-amber-400" aria-hidden />
            <Countdown deadline={hackathon.submissionDeadline} />
          </p>
          <p className="text-muted-foreground">
            Due {formatLocal(hackathon.submissionDeadline)} your time
            {organizerTime ? (
              <>
                <br />
                {organizerTime} organizer time
              </>
            ) : null}
          </p>
          <p className="text-muted-foreground">
            {hackathon.doneCount} of {hackathon.requirementCount} requirements
            done ·{" "}
            {hackathon.weightedTotal === null
              ? "Not scored yet"
              : `Score ${hackathon.weightedTotal.toFixed(1)} / 10`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function TodayCard() {
  const briefsQuery = useActionQuery("get-briefs", {});
  const settingsQuery = useActionQuery("get-brief-settings", {});
  const saveSettings = useActionMutation("save-brief-settings");
  const [time, setTime] = useState("07:00");
  const [enabled, setEnabled] = useState(true);
  const [editing, setEditing] = useState(false);

  const latest = briefsQuery.data?.briefs?.[0];
  const settings = settingsQuery.data;

  function openEditor() {
    if (settings) {
      setTime(settings.time);
      setEnabled(settings.enabled);
    }
    setEditing(true);
  }

  function save() {
    saveSettings.mutate(
      { enabled, time },
      {
        onSuccess: () => {
          toast.success(
            enabled
              ? `Daily brief on, every morning at ${time}.`
              : "Daily brief turned off.",
          );
          setEditing(false);
        },
        onError: (error) => {
          toast.error(actionErrorMessage(error) ?? "Could not save brief settings.");
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconSparkles className="size-4 text-amber-400" aria-hidden />
          Today
        </CardTitle>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={openEditor}>
            Brief settings
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {briefsQuery.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : latest ? (
          <div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {latest.body}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {latest.createdAt ? formatDay(latest.createdAt) : ""}
              {latest.hackathonName ? ` · ${latest.hackathonName}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brief yet. Ask the agent for one, or wait for tomorrow morning.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              askAgent(
                "Run the daily-brief skill now and save today's brief for my active hackathons.",
                { skill: "daily-brief" },
              )
            }
          >
            Send today&apos;s brief now
          </Button>
          {settings ? (
            <span className="self-center text-xs text-muted-foreground">
              Daily brief {settings.enabled ? `on at ${settings.time}` : "off"}
            </span>
          ) : null}
        </div>
        {editing ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="size-4 accent-amber-400"
              />
              Daily brief on
            </label>
            <label className="flex items-center gap-2 text-sm">
              Time
              <Input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-8 w-28"
                aria-label="Daily brief time"
              />
            </label>
            <Button
              size="sm"
              onClick={save}
              disabled={saveSettings.isPending}
              className="bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
            >
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              The brief runs every morning at this time through the daily-brief
              job. Changing the time updates the setting the job reads.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Prominent banner for users whose agent is not on Builder.io. The
 * deployment Gemini key is at capacity, so new users need a Builder.io
 * connection for the agent to work without limits. It is not dismissible:
 * it stays on Home for everyone not on Builder.io, and hides only once
 * they connect Builder.io.
 */
function BuilderConnectBanner() {
  const navigate = useNavigate();
  const [engine, setEngine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(agentEngineStatusUrlForChatApi(), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.engine === "string") {
          setEngine(data.engine);
        }
      })
      .catch(() => {
        // Status unreadable: stay hidden rather than guess the engine.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!engine || engine === "builder") return null;

  return (
    <Card className="mb-6 border-amber-400/60 bg-amber-400/10">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">Connect Builder.io to use the agent</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The built-in Gemini is at capacity right now. Connect your
            Builder.io account for the full agent experience, without limits.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={() => navigate("/settings/model")}>
            Connect Builder.io
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** The Hermes announcement URL, matching server/db/seed.ts. Kept here so Home can tell whether the Hermes board is missing without importing server code. */
const HERMES_HACKATHON_URL =
  "https://x.com/nousresearch/status/2118094256438936062";

/** Compare hackathon URLs ignoring scheme, a leading www., casing and a trailing slash. */
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

export default function HomePage() {
  const hackathonsQuery = useActionQuery("list-hackathons", {});
  const hackathons = hackathonsQuery.data?.hackathons ?? [];
  const seedStarter = useActionMutation("seed-podium");
  const seededRef = useRef(false);
  const listEmpty = hackathonsQuery.isSuccess && hackathons.length === 0;
  const hasHermes = hackathons.some((h) =>
    sameHackathonUrl(h.url, HERMES_HACKATHON_URL),
  );
  const { session } = useSession();
  const sessionEmail = session?.email ?? "";
  const signinNoticeRef = useRef(false);

  // No email provider is configured, so sign-up sends no mail. Show a
  // one-time notice that the account is ready and they can sign in with
  // the email and password they created. Once per user, stored in
  // localStorage like the engine hint dismissal.
  useEffect(() => {
    if (!sessionEmail || signinNoticeRef.current) return;
    signinNoticeRef.current = true;
    const key = `podium:signin-notice-seen:${sessionEmail}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable: still show the notice once per mount.
    }
    toast.success("Welcome to Podium", {
      description:
        "Your account is ready. You can sign in anytime with the email and password you created.",
      duration: 10000,
    });
  }, [sessionEmail]);

  // Ensure the user has both starter boards: Builder.io and Hermes. A
  // first-time user gets both; anyone missing the Hermes board gets it
  // added, so the board list is general instead of Builder.io only. The
  // seed is idempotent: it only creates a board that is missing. Note that
  // clearing the Hermes board brings it back on the next Home visit, by
  // design, so it stays on the board.
  useEffect(() => {
    if (!hackathonsQuery.isSuccess || seededRef.current) return;
    if (hackathons.length > 0 && hasHermes) return;
    seededRef.current = true;
    seedStarter.mutate(
      {},
      { onSuccess: () => void hackathonsQuery.refetch() },
    );
  }, [hackathonsQuery.isSuccess, hackathons.length, hasHermes]);

  const seeding = listEmpty && (seedStarter.isPending || seedStarter.isSuccess);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <img src="/podium-icon.svg" alt="Podium logo" className="size-8" />
          Podium
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Turn any hackathon page into a live mission board, and get coached
          toward a winning entry. You stay in control, the agent does the
          thinking.
        </p>
      </header>

      <BuilderConnectBanner />

      <div className="mb-6">
        <ImportBar />
      </div>

      <section aria-label="Hackathons" className="mb-6">
        {hackathonsQuery.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : hackathonsQuery.isError ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p role="alert" className="text-sm">
                Could not load your hackathons.{" "}
                {actionErrorMessage(hackathonsQuery.error) ?? "Try again."}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => void hackathonsQuery.refetch()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : seeding ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium">Setting up your first boards…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your own Builder.io and Hermes starter boards are being
                created. They are yours alone, no one else sees them.
              </p>
            </CardContent>
          </Card>
        ) : hackathons.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium">No hackathons yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste a hackathon URL above and the agent will build your first
                mission board.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hackathons.map((hackathon) => (
              <HackathonCard key={hackathon.id} hackathon={hackathon} />
            ))}
          </div>
        )}
      </section>

      <div className="mb-6">
        <TodayCard />
      </div>
    </div>
  );
}

import { useSession } from "@agent-native/core/client/use-session";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconRobot,
  IconSparkles,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";

import { Button } from "@/components/ui/button";

const LIVE_URL = "https://podium-82hb.onrender.com";
const REPO_URL = "https://github.com/Raga-vibe/podium";
const HACKATHON_URL = "https://www.builder.io/hackathon";

/** The old mock board, kept only as a fallback while /board.png is missing. No fake numbers: it shows real copy only. */
function MockBoard() {
  return (
    <div className="space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Builder.io Agent-Native Hackathon
          </p>
          <p className="text-xs text-muted-foreground">
            Mission board · rubric · timeline
          </p>
        </div>
        <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">
          Live board
        </span>
      </div>
      <ul className="space-y-2">
        {[
          { title: "Ship a working demo video", done: true, agent: true },
          { title: "Submit before Nov 9, 23:59 PT", done: true, agent: true },
          { title: "Polish the landing page", done: false, agent: false },
        ].map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                item.done
                  ? "border-amber-400 bg-amber-400 text-zinc-950"
                  : "border-muted-foreground/40"
              }`}
            >
              {item.done ? <IconCheck className="size-3.5" /> : null}
            </span>
            <span
              className={`min-w-0 flex-1 truncate ${
                item.done ? "text-muted-foreground line-through" : "font-medium"
              }`}
            >
              {item.title}
            </span>
            {item.agent ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                <IconRobot className="size-3" aria-hidden /> agent
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Agent:</span> your
        weakest criterion is Creativity and Design. One fix: make the landing
        page show the real board.
      </p>
    </div>
  );
}

/**
 * True once the image at src has loaded. A missing image (404) never renders
 * a broken-image icon: callers show their fallback until the image proves
 * it exists.
 */
function useImageReady(src: string) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setReady(true);
    img.onerror = () => setReady(false);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  return ready;
}

/**
 * Hero preview: the real mission board screenshot, framed in a browser
 * window. Falls back to the mock board while /board.png is missing (the
 * image is a binary asset, so it is uploaded to public/ on GitHub web).
 */
function BoardPreview() {
  const ready = useImageReady("/board.png");
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-amber-400/70" />
        <span className="size-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 min-w-0 truncate rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
          podium-82hb.onrender.com
        </span>
      </div>
      {ready ? (
        <img
          src="/board.png"
          alt="Podium mission board for the Builder.io Agent-Native Hackathon, showing the requirements, progress, rubric score and timeline"
          width={1280}
          height={900}
          className="block h-auto w-full"
        />
      ) : (
        <MockBoard />
      )}
    </div>
  );
}

/** Second screenshot, hidden entirely while /home.png is missing. */
function HomeShot() {
  const ready = useImageReady("/home.png");
  if (!ready) return null;
  return (
    <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/30">
      <img
        src="/home.png"
        alt="Podium home page listing hackathons with progress bars, deadlines and the morning brief"
        loading="lazy"
        width={1280}
        height={900}
        className="block h-auto w-full"
      />
      <figcaption className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        Your hackathons at a glance: progress, deadlines, and the morning
        brief.
      </figcaption>
    </figure>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Paste a hackathon URL",
    body: "Podium reads the page and its rules, then pulls out the deadlines, requirements, rubric and prizes. No copy-pasting the rulebook.",
  },
  {
    n: "02",
    title: "Work the board with the agent",
    body: "Tick requirements off by hand. Ask what's left, argue with a score, and let the agent rescore and suggest the single highest-impact fix.",
  },
  {
    n: "03",
    title: "Ship the submission",
    body: "Draft the submission from the board, add the deadline to your calendar with 24-hour and 2-hour alerts, and get a brief every morning until you submit.",
  },
];

const FEATURES = [
  {
    title: "Mission board",
    body: "Every requirement from the rules, grouped by build, demo, submission and eligibility, with progress, drag reorder and inline editing.",
  },
  {
    title: "Rubric coach",
    body: "Honest 0–10 scores per criterion with a rationale and one top fix. Disagree with a score and the agent rescores it.",
  },
  {
    title: "Daily brief",
    body: "A short brief every morning: time left, your top three open items, and your weakest criterion.",
  },
  {
    title: "Calendar export",
    body: "Deadlines and milestones as a standard .ics file with 24-hour and 2-hour alerts. Works in Google, Apple and Outlook calendars.",
  },
  {
    title: "You and the agent, one board",
    body: "You and the agent read and write the same data. Whatever you tick, the agent sees. Whatever the agent drafts, you see.",
  },
  {
    title: "Builder.io first, Gemini fallback",
    body: "Runs on Builder.io for the team, with a Gemini fallback so the agent keeps working.",
  },
];

export default function LandingPage() {
  const { status } = useSession();
  if (status === "authenticated") {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
            <img src="/podium-icon.svg" alt="Podium logo" className="size-6" />
            Podium
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Product">
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">Open source</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/guest">Try the demo</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/home">Sign in</Link>
            </Button>
            <Button size="sm" asChild className="bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300">
              <Link to="/home">
                Get started <IconArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                <IconSparkles className="size-3.5 shrink-0" aria-hidden />
                Builder.io Agent-Native Hackathon
              </p>
              <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Turn any hackathon page into a live mission board.
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Paste a hackathon URL and Podium&apos;s agent reads the rules,
                deadlines, requirements and rubric into a board you share. Get
                coached toward a winning entry, then draft the submission.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" asChild className="bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300">
                  <Link to="/home">
                    Get started <IconArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/guest">Try the demo</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={REPO_URL} target="_blank" rel="noreferrer">
                    View on GitHub
                  </a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Live now at{" "}
                <a href={LIVE_URL} className="font-medium text-foreground underline underline-offset-2">
                  podium-82hb.onrender.com
                </a>
              </p>
            </div>
            <BoardPreview />
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <article key={step.n} className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-bold text-amber-400">{step.n}</p>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
          <HomeShot />
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need to ship</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <IconCalendar className="size-6 shrink-0 text-amber-400" aria-hidden />
                Your next deadline is closer than you think.
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Podium is itself a hackathon entry. It was built for the{" "}
                <a href={HACKATHON_URL} target="_blank" rel="noreferrer" className="font-medium text-foreground underline underline-offset-2">
                  Builder.io Agent-Native Hackathon
                </a>
                , and it works for yours too.
              </p>
            </div>
            <Button size="lg" asChild className="shrink-0 bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300">
              <Link to="/home">
                Get started <IconArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2">
            <img src="/podium-icon.svg" alt="Podium logo" className="size-5" />
            Podium · Built during the Builder.io Agent-Native Hackathon, Nov 2026.
          </p>
          <p>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              GitHub
            </a>
            {" · "}
            <a href={LIVE_URL} className="underline underline-offset-2 hover:text-foreground">
              Live app
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

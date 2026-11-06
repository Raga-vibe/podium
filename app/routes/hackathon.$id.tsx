import {
  actionErrorMessage,
  callAction,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import {
  IconArrowLeft,
  IconFolder,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { Countdown } from "@/components/podium/Countdown";
import { DraftPanel } from "@/components/podium/DraftPanel";
import { MissionBoard } from "@/components/podium/MissionBoard";
import { ProjectDrawer } from "@/components/podium/ProjectDrawer";
import { RubricPanel } from "@/components/podium/RubricPanel";
import { TimelinePanel } from "@/components/podium/TimelinePanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  askAgent,
  formatInZone,
  formatLocal,
  sameHackathonUrl,
  weakestCriterion,
} from "@/lib/podium";

export function meta() {
  return [{ title: "Podium — Mission board" }];
}

type Selection =
  | { kind: "requirement"; id: string; text: string }
  | { kind: "criterion"; id: string; text: string }
  | null;

// The demo board is the one for the Builder.io hackathon page. Its url is
// unique, so this identifies it on any database (the live board predates
// the fixed seed id). Must match SEED_HACKATHON_URL in server/db/seed.ts.
const SEED_HACKATHON_URL = "https://www.builder.io/hackathon";

export default function HackathonRoute() {
  const { id } = useParams();
  const hackathonId = id ?? "";
  const query = useActionQuery("get-hackathon", { id: hackathonId });
  const [projectOpen, setProjectOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [resetting, setResetting] = useState(false);

  async function resetDemo() {
    if (
      !window.confirm(
        "Reset the demo board to its fresh state? All ticks, scores and the draft on this board will be cleared.",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await callAction("reset-demo", {});
      await query.refetch();
      toast.success("Demo board reset. All requirements are open again.");
    } catch {
      toast.error("Could not reset the demo board. Try again.");
    } finally {
      setResetting(false);
    }
  }

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p role="alert" className="text-sm">
              Could not load this hackathon.{" "}
              {actionErrorMessage(query.error) ?? "It may not exist."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => void query.refetch()}>
                Retry
              </Button>
              <Button asChild variant="ghost">
                <Link to="/home">Back to Podium</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = query.data;
  const { hackathon } = data;
  const weakest = weakestCriterion(data.rubricCriteria, data.scores);
  const organizerTime = formatInZone(
    hackathon.submissionDeadline,
    hackathon.organizerTimezone,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="/home"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
      >
        <IconArrowLeft className="size-4" aria-hidden /> All hackathons
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {hackathon.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hackathon.organizer ? `${hackathon.organizer} · ` : ""}
              <a
                href={hackathon.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Hackathon page
              </a>
              {hackathon.prizeSummary ? ` · ${hackathon.prizeSummary}` : ""}
            </p>
            <p className="mt-2 text-sm">
              <Countdown
                deadline={hackathon.submissionDeadline}
                className="font-semibold text-amber-300"
              />{" "}
              <span className="text-muted-foreground">
                · due {formatLocal(hackathon.submissionDeadline)}
                {organizerTime ? ` · ${organizerTime}` : ""}
              </span>
            </p>
          </div>
          <Button variant="outline" onClick={() => setProjectOpen(true)}>
            <IconFolder className="size-4" aria-hidden />
            {data.project ? data.project.name : "Add your project"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Ask the agent">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              askAgent(
                `What's left for the hackathon "${hackathon.name}"? Use the whats-left action and tell me the open requirements in order, with the time left.`,
                { hackathonId, skill: "rules-extraction" },
              )
            }
          >
            What&apos;s left?
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!weakest}
            onClick={() =>
              weakest &&
              askAgent(
                `Fix my weakest criterion for the hackathon "${hackathon.name}": "${weakest.criterion.name}" is at ${weakest.score.score}/10. Top fix: ${weakest.score.topFix ?? "not given"}. Tell me the single most impactful change and update the board.`,
                { hackathonId, criterionId: weakest.criterion.id, skill: "rubric-coach" },
              )
            }
          >
            Fix my weakest criterion
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              askAgent(
                `Draft my submission for the hackathon "${hackathon.name}" using the submission-writer skill. Write the submission description plus the "built during the event" disclosure from the board and project, then save the draft.`,
                { hackathonId, skill: "submission-writer" },
              )
            }
          >
            <IconSparkles className="size-4" aria-hidden /> Draft my submission
          </Button>
          {sameHackathonUrl(hackathon.url, SEED_HACKATHON_URL) ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={resetting}
              onClick={() => void resetDemo()}
              title="Restore the demo board to its fresh state"
            >
              {resetting ? "Resetting…" : "Reset demo"}
            </Button>
          ) : null}
        </div>
        {selection ? (
          <p className="mt-3 text-xs text-muted-foreground" role="status">
            Selected: {selection.text}. Type “fix this” in the agent sidebar
            and the agent targets it.
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mission board</CardTitle>
          </CardHeader>
          <CardContent>
            <MissionBoard
              hackathonId={hackathonId}
              requirements={data.requirements}
              selectedId={selection?.kind === "requirement" ? selection.id : null}
              onSelect={(next) => setSelection(next)}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rubric</CardTitle>
            </CardHeader>
            <CardContent>
              <RubricPanel
                hackathonId={hackathonId}
                hackathonName={hackathon.name}
                criteria={data.rubricCriteria}
                scores={data.scores}
                weightedTotal={data.weightedTotal}
                selectedId={selection?.kind === "criterion" ? selection.id : null}
                onSelect={(next) => setSelection(next)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelinePanel
                hackathonId={hackathonId}
                milestones={data.milestones}
                deadline={hackathon.submissionDeadline}
                organizerTimezone={hackathon.organizerTimezone}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Submission draft</CardTitle>
        </CardHeader>
        <CardContent>
          <DraftPanel
            hackathonId={hackathonId}
            hackathonName={hackathon.name}
            initialBody={data.draft?.body ?? null}
          />
        </CardContent>
      </Card>

      <ProjectDrawer
        hackathonId={hackathonId}
        hackathonName={hackathon.name}
        project={data.project}
        open={projectOpen}
        onOpenChange={setProjectOpen}
      />
    </div>
  );
}

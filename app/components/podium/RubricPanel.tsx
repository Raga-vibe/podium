import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import {
  IconMessage,
  IconSparkles,
  IconWand,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { selectItem } from "@/components/podium/selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  askAgent,
  scoreOf,
  weakestCriterion,
  type RubricCriterion,
  type Score,
} from "@/lib/podium";

function CriterionCard({
  hackathonId,
  hackathonName,
  criterion,
  score,
  weakest,
  selected,
  onSelect,
}: {
  hackathonId: string;
  hackathonName: string;
  criterion: RubricCriterion;
  score: Score | undefined;
  weakest: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [disagreeing, setDisagreeing] = useState(false);
  const [note, setNote] = useState(score?.userNote ?? "");
  const addNote = useActionMutation("add-score-note");
  const addRequirement = useActionMutation("add-requirement");
  const topFix = score?.topFix ?? null;

  function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!score || !note.trim()) return;
    addNote.mutate(
      { scoreId: score.id, note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Note saved. Asking the agent to rescore.");
          setDisagreeing(false);
          askAgent(
            `Rescore the criterion "${criterion.name}" for the hackathon "${hackathonName}". I disagree with the current score of ${score.score}/10: ${note.trim()}. Follow the rubric-coach skill and respect my note.`,
            { hackathonId, criterionId: criterion.id, scoreId: score.id, skill: "rubric-coach" },
          );
        },
        onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not save the note."),
      },
    );
  }

  return (
    <li
      onClick={onSelect}
      className={`rounded-2xl border p-5 ${
        selected ? "border-signal-orange/70 bg-signal-orange/5" : "border-border bg-card"
      } ${weakest ? "ring-1 ring-signal-orange/40" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {criterion.name}
          {weakest ? (
            <span className="ml-2 rounded-full bg-signal-orange/15 px-2 py-0.5 text-xs font-medium text-ember">
              Weakest
            </span>
          ) : null}
          {score?.state === "disputed" ? (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Disputed — awaiting rescore
            </span>
          ) : null}
        </p>
        <p className="shrink-0 text-sm text-muted-foreground">
          {score ? (
            <span className="font-display text-base text-foreground">{score.score} / 10</span>
          ) : (
            "Not scored"
          )}{" "}
          · {criterion.weight}%
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={score ? score.score * 10 : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${criterion.name} score`}
      >
        <div
          className="h-full rounded-full bg-signal-orange transition-all duration-150"
          style={{ width: `${score ? score.score * 10 : 0}%` }}
        />
      </div>
      {criterion.description ? (
        <p className="mt-2 text-xs text-muted-foreground">{criterion.description}</p>
      ) : null}
      {score?.rationale ? (
        <p className="mt-2 text-sm">{score.rationale}</p>
      ) : null}
      {score?.topFix ? (
        <p className="mt-1 text-sm">
          <span className="font-medium text-ember">Top fix: </span>
          {score.topFix}
        </p>
      ) : null}
      {score?.previousScore !== null && score?.previousScore !== undefined && score.previousScore !== score.score ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Was {score.previousScore} / 10, now {score.score} / 10
        </p>
      ) : null}
      {score?.userNote ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Your note: {score.userNote}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {score ? (
          disagreeing ? (
            <form onSubmit={submitNote} className="flex w-full gap-2">
              <Input
                autoFocus
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What do you disagree with?"
                aria-label={`Disagreement note for ${criterion.name}`}
                className="h-8 flex-1"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 rounded-full bg-signal-orange px-4 font-medium text-white hover:bg-ember"
                disabled={addNote.isPending || note.trim().length === 0}
              >
                Rescore
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setDisagreeing(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
                setDisagreeing(true);
              }}
            >
              <IconMessage className="size-3" aria-hidden /> Disagree
            </Button>
          )
        ) : null}
        {topFix ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={addRequirement.isPending}
            onClick={(event) => {
              event.stopPropagation();
              addRequirement.mutate(
                {
                  hackathonId,
                  title: topFix,
                  detail: `Top fix for ${criterion.name}`,
                  category: "build",
                  source: "user",
                },
                {
                  onSuccess: () => toast.success("Top fix added to the board."),
                  onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not add the top fix."),
                },
              );
            }}
          >
            <IconWand className="size-3" aria-hidden />{" "}
            {addRequirement.isPending ? "Adding…" : "Apply top fix"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function RubricPanel({
  hackathonId,
  hackathonName,
  criteria,
  scores,
  weightedTotal,
  selectedId,
  onSelect,
}: {
  hackathonId: string;
  hackathonName: string;
  criteria: RubricCriterion[];
  scores: Score[];
  weightedTotal: number | null;
  selectedId: string | null;
  onSelect: (selection: { kind: "criterion"; id: string; text: string }) => void;
}) {
  const weakest = weakestCriterion(criteria, scores);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {weightedTotal === null ? (
            "Not scored yet"
          ) : (
            <>
              Weighted total{" "}
              <span className="font-display text-xl text-foreground">
                {weightedTotal.toFixed(1)} / 10
              </span>
            </>
          )}
        </p>
        <Button
          size="sm"
          className="h-11 rounded-full bg-signal-orange px-5 font-medium text-white hover:bg-ember"
          onClick={() =>
            askAgent(
              `Score my project for the hackathon "${hackathonName}" using the rubric-coach skill. Score every criterion honestly against the project and rubric, then save the scores.`,
              { hackathonId, skill: "rubric-coach" },
            )
          }
        >
          <IconSparkles className="size-4" aria-hidden /> Score my project
        </Button>
      </div>
      {criteria.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No rubric yet. Import the hackathon page and the agent will extract
          the judging criteria.
        </p>
      ) : (
        <ul className="space-y-2">
          {criteria.map((criterion) => {
            const score = scoreOf(scores, criterion.id);
            return (
              <CriterionCard
                key={criterion.id}
                hackathonId={hackathonId}
                hackathonName={hackathonName}
                criterion={criterion}
                score={score}
                weakest={weakest?.criterion.id === criterion.id}
                selected={selectedId === criterion.id}
                onSelect={() => {
                  void selectItem({
                    kind: "criterion",
                    id: criterion.id,
                    text: criterion.name,
                    hackathonId,
                  });
                  onSelect({ kind: "criterion", id: criterion.id, text: criterion.name });
                }}
              />
            );
          })}
        </ul>
      )}
      {weakest ? (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-full px-4"
            onClick={() =>
              askAgent(
                `Fix my weakest criterion for the hackathon "${hackathonName}": "${weakest.criterion.name}" is at ${weakest.score.score}/10. Top fix: ${weakest.score.topFix ?? "not given"}. Tell me the single most impactful change and update the board.`,
                { hackathonId, criterionId: weakest.criterion.id, skill: "rubric-coach" },
              )
            }
          >
            Fix my weakest criterion
          </Button>
        </div>
      ) : null}
    </div>
  );
}

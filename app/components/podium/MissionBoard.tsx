import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconPlus,
  IconRobot,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { selectItem } from "@/components/podium/selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  REQUIREMENT_CATEGORIES,
  type Requirement,
  type RequirementCategory,
} from "@/lib/podium";

const CATEGORY_LABELS: Record<string, string> = {
  build: "Build",
  demo: "Demo",
  submission: "Submission",
  eligibility: "Eligibility",
};

function RequirementRow({
  requirement,
  hackathonId,
  allIds,
  selected,
  onSelect,
}: {
  requirement: Requirement;
  hackathonId: string;
  allIds: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(requirement.title);
  const [dragging, setDragging] = useState(false);
  const toggle = useActionMutation("toggle-requirement");
  const update = useActionMutation("update-requirement");
  const accept = useActionMutation("accept-requirement");
  const remove = useActionMutation("delete-requirement");
  const reorder = useActionMutation("reorder-requirements");

  function saveTitle() {
    setEditing(false);
    const next = title.trim();
    if (next && next !== requirement.title) {
      update.mutate(
        { id: requirement.id, title: next },
        { onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not save the title.") },
      );
    } else {
      setTitle(requirement.title);
    }
  }

  function move(direction: -1 | 1) {
    const index = allIds.indexOf(requirement.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= allIds.length) return;
    const ids = [...allIds];
    const moved = ids.splice(index, 1)[0];
    if (moved === undefined) return;
    ids.splice(target, 0, moved);
    reorder.mutate(
      { hackathonId, ids },
      { onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not reorder.") },
    );
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const draggedId = event.dataTransfer.getData("text/podium-requirement");
    if (!draggedId || draggedId === requirement.id) return;
    const ids = allIds.filter((id) => id !== draggedId);
    const targetIndex = ids.indexOf(requirement.id);
    ids.splice(targetIndex, 0, draggedId);
    reorder.mutate(
      { hackathonId, ids },
      { onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not reorder.") },
    );
  }

  return (
    <li
      draggable={!editing}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/podium-requirement", requirement.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={onSelect}
      className={`flex items-start gap-2 rounded-lg border p-3 transition-colors ${
        selected
          ? "border-amber-400/70 bg-amber-400/5"
          : "border-border bg-card"
      } ${dragging ? "border-dashed border-amber-400" : ""}`}
    >
      <span
        className="mt-0.5 cursor-grab text-muted-foreground"
        title="Drag to reorder"
        aria-hidden
      >
        <IconGripVertical className="size-4" />
      </span>
      <input
        type="checkbox"
        checked={requirement.done}
        onChange={() =>
          toggle.mutate(
            { id: requirement.id },
            { onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not update.") },
          )
        }
        onClick={(event) => event.stopPropagation()}
        aria-label={`Mark "${requirement.title}" as ${requirement.done ? "not done" : "done"}`}
        className="mt-0.5 size-5 shrink-0 accent-amber-400"
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveTitle();
              if (event.key === "Escape") {
                setTitle(requirement.title);
                setEditing(false);
              }
            }}
            onClick={(event) => event.stopPropagation()}
            aria-label="Requirement title"
            className="h-8"
          />
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
              setEditing(true);
            }}
            className={`block w-full text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded ${
              requirement.done ? "text-muted-foreground line-through" : ""
            }`}
            title="Click to edit"
          >
            {requirement.title}
          </button>
        )}
        {requirement.detail ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{requirement.detail}</p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {requirement.source === "agent" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-medium text-amber-300">
              <IconRobot className="size-3" aria-hidden /> agent
            </span>
          ) : null}
          {requirement.status === "proposed" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  accept.mutate(
                    { id: requirement.id, accept: true },
                    {
                      onSuccess: () => toast.success("Requirement accepted."),
                      onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not accept."),
                    },
                  );
                }}
              >
                <IconCheck className="size-3" aria-hidden /> Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  accept.mutate(
                    { id: requirement.id, accept: false },
                    {
                      onSuccess: () => toast.success("Requirement rejected."),
                      onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not reject."),
                    },
                  );
                }}
              >
                <IconX className="size-3" aria-hidden /> Reject
              </Button>
            </>
          ) : null}
        </p>
      </div>
      <span className="flex shrink-0 flex-col">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={(event) => {
            event.stopPropagation();
            move(-1);
          }}
          aria-label={`Move "${requirement.title}" up`}
        >
          <IconChevronUp className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={(event) => {
            event.stopPropagation();
            move(1);
          }}
          aria-label={`Move "${requirement.title}" down`}
        >
          <IconChevronDown className="size-4" />
        </Button>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-red-400"
        onClick={(event) => {
          event.stopPropagation();
          remove.mutate(
            { id: requirement.id },
            {
              onSuccess: () => toast.success("Requirement deleted."),
              onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not delete."),
            },
          );
        }}
        aria-label={`Delete "${requirement.title}"`}
      >
        <IconTrash className="size-4" />
      </Button>
    </li>
  );
}

export function MissionBoard({
  hackathonId,
  requirements,
  selectedId,
  onSelect,
}: {
  hackathonId: string;
  requirements: Requirement[];
  selectedId: string | null;
  onSelect: (selection: { kind: "requirement"; id: string; text: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RequirementCategory>("build");
  const add = useActionMutation("add-requirement");
  const allIds = requirements.map((r) => r.id);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = title.trim();
    if (!next) return;
    add.mutate(
      { hackathonId, title: next, category },
      {
        onSuccess: () => {
          setTitle("");
          toast.success("Requirement added.");
        },
        onError: (error) => toast.error(actionErrorMessage(error) ?? "Could not add the requirement."),
      },
    );
  }

  return (
    <div className="space-y-5">
      {REQUIREMENT_CATEGORIES.map((categoryKey) => {
        const items = requirements.filter((r) => r.category === categoryKey);
        if (items.length === 0) return null;
        return (
          <section key={categoryKey} aria-label={`${CATEGORY_LABELS[categoryKey]} requirements`}>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {CATEGORY_LABELS[categoryKey]} · {items.filter((i) => i.done).length}/{items.length}
            </h3>
            <ul className="space-y-2">
              {items.map((requirement) => (
                <RequirementRow
                  key={requirement.id}
                  requirement={requirement}
                  hackathonId={hackathonId}
                  allIds={allIds}
                  selected={selectedId === requirement.id}
                  onSelect={() => {
                    void selectItem({
                      kind: "requirement",
                      id: requirement.id,
                      text: requirement.title,
                      hackathonId,
                    });
                    onSelect({
                      kind: "requirement",
                      id: requirement.id,
                      text: requirement.title,
                    });
                  }}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {requirements.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No requirements yet. Import a hackathon page or add the first one below.
        </p>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" aria-label="Add a requirement">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a requirement, e.g. Ship a demo video"
          aria-label="New requirement title"
          className="h-10 flex-1 bg-card"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as RequirementCategory)}
          aria-label="Requirement category"
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
        >
          {REQUIREMENT_CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          disabled={add.isPending || title.trim().length === 0}
          className="h-10 bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
        >
          <IconPlus className="size-4" aria-hidden /> Add
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Click a requirement to select it, then type “fix this” in the agent
        sidebar and the agent targets that item. Drag rows or use the arrows to
        reorder.
      </p>
    </div>
  );
}

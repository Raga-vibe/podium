import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { IconCheck, IconCopy, IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { askAgent } from "@/lib/podium";

export function DraftPanel({
  hackathonId,
  hackathonName,
  initialBody,
}: {
  hackathonId: string;
  hackathonName: string;
  initialBody: string | null;
}) {
  const [body, setBody] = useState(initialBody ?? "");
  const [copied, setCopied] = useState(false);
  const save = useActionMutation("save-draft");

  useEffect(() => {
    setBody(initialBody ?? "");
  }, [initialBody]);

  function saveDraft() {
    save.mutate(
      { hackathonId, body },
      {
        onSuccess: () => toast.success("Draft saved."),
        onError: (error) =>
          toast.error(actionErrorMessage(error) ?? "Could not save the draft."),
      },
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Draft copied to clipboard.");
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          className="bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
          onClick={() =>
            askAgent(
              `Draft my submission for the hackathon "${hackathonName}" using the submission-writer skill. Write the submission description plus the "built during the event" disclosure from the board and project, then save the draft.`,
              { hackathonId, skill: "submission-writer" },
            )
          }
        >
          <IconSparkles className="size-4" aria-hidden /> Draft submission
        </Button>
        <Button variant="outline" onClick={saveDraft} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="outline" onClick={() => void copy()} disabled={!body}>
          {copied ? (
            <IconCheck className="size-4" aria-hidden />
          ) : (
            <IconCopy className="size-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Your submission draft will appear here. Click “Draft submission” and the agent writes it from your board and project, or write it yourself."
        rows={10}
        aria-label="Submission draft"
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        The draft saves to the same record the agent writes, so edits on either
        side show up instantly.
      </p>
    </div>
  );
}

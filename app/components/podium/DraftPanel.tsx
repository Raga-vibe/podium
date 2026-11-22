import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { IconCheck, IconCopy, IconDownload, IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { askAgent } from "@/lib/podium";

export function DraftPanel({
  hackathonId,
  hackathonName,
  initialBody,
  links,
}: {
  hackathonId: string;
  hackathonName: string;
  initialBody: string | null;
  /** Project links, shown as chips only when present. Never invented. */
  links?: { repoUrl?: string | null; demoUrl?: string | null; liveUrl?: string | null };
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

  function download() {
    const slug = hackathonName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const blob = new Blob([body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug || "hackathon"}-submission-draft.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Draft downloaded as Markdown.");
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          className="h-11 rounded-full bg-signal-orange px-5 font-medium text-white hover:bg-ember"
          onClick={() =>
            askAgent(
              `Draft my submission for the hackathon "${hackathonName}" using the submission-writer skill. Write the submission description plus the "built during the event" disclosure from the board and project, then save the draft.`,
              { hackathonId, skill: "submission-writer" },
            )
          }
        >
          <IconSparkles className="size-4" aria-hidden /> Draft submission
        </Button>
        <Button variant="outline" className="h-10 rounded-full px-4" onClick={saveDraft} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="outline" className="h-10 rounded-full px-4" onClick={() => void copy()} disabled={!body}>
          {copied ? (
            <IconCheck className="size-4" aria-hidden />
          ) : (
            <IconCopy className="size-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="outline" className="h-10 rounded-full px-4" onClick={download} disabled={!body}>
          <IconDownload className="size-4" aria-hidden /> Download .md
        </Button>
      </div>
      {links && (links.repoUrl || links.demoUrl || links.liveUrl) ? (
        <p className="mb-3 flex flex-wrap gap-2" aria-label="Project links">
          {links.repoUrl ? (
            <a href={links.repoUrl} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Repo
            </a>
          ) : null}
          {links.liveUrl ? (
            <a href={links.liveUrl} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Live
            </a>
          ) : null}
          {links.demoUrl ? (
            <a href={links.demoUrl} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Demo
            </a>
          ) : null}
        </p>
      ) : null}
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Your submission draft will appear here. Click “Draft submission” and the agent writes it from your board and project, or write it yourself."
        rows={10}
        aria-label="Submission draft"
        className="w-full rounded-2xl border border-input bg-card p-4 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-signal-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        The draft saves to the same record the agent writes, so edits on either
        side show up instantly.
      </p>
    </div>
  );
}

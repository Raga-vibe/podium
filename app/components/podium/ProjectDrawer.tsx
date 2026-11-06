import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Project } from "@/lib/podium";

export function ProjectDrawer({
  hackathonId,
  hackathonName,
  project,
  open,
  onOpenChange,
}: {
  hackathonId: string;
  hackathonName: string;
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [pitch, setPitch] = useState(project?.pitch ?? "");
  const [repoUrl, setRepoUrl] = useState(project?.repoUrl ?? "");
  const [demoUrl, setDemoUrl] = useState(project?.demoUrl ?? "");
  const save = useActionMutation("save-project");

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setPitch(project?.pitch ?? "");
      setRepoUrl(project?.repoUrl ?? "");
      setDemoUrl(project?.demoUrl ?? "");
    }
  }, [open, project]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Give your project a name first.");
      return;
    }
    save.mutate(
      {
        hackathonId,
        name: trimmedName,
        pitch: pitch.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Project saved.");
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(actionErrorMessage(error) ?? "Could not save the project."),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your project</SheetTitle>
          <SheetDescription>
            What are you building for {hackathonName}? The rubric coach scores
            this, and the submission writer drafts from it.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Podium"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-pitch">Pitch</Label>
            <textarea
              id="project-pitch"
              value={pitch}
              onChange={(event) => setPitch(event.target.value)}
              placeholder="One or two sentences: what it does and why it wins."
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-repo">Repo URL</Label>
            <Input
              id="project-repo"
              type="url"
              inputMode="url"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/you/project"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-demo">Demo URL</Label>
            <Input
              id="project-demo"
              type="url"
              inputMode="url"
              value={demoUrl}
              onChange={(event) => setDemoUrl(event.target.value)}
              placeholder="https://your-demo-link"
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            disabled={save.isPending}
            className="w-full bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
          >
            {save.isPending ? "Saving…" : "Save project"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

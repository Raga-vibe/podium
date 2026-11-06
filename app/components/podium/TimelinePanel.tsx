import { callAction } from "@agent-native/core/client/hooks";
import { IconCalendarDown, IconFlag } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Countdown } from "@/components/podium/Countdown";
import { Button } from "@/components/ui/button";
import { formatDay, type Milestone } from "@/lib/podium";

export function TimelinePanel({
  hackathonId,
  milestones,
  deadline,
  organizerTimezone,
}: {
  hackathonId: string;
  milestones: Milestone[];
  deadline: string | null;
  organizerTimezone: string | null;
}) {
  const [downloading, setDownloading] = useState(false);

  async function downloadCalendar() {
    setDownloading(true);
    try {
      const result = await callAction(
        "export-calendar",
        { hackathonId },
        { method: "GET" },
      );
      const blob = new Blob([result.ics], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Calendar file downloaded. Import it into Google, Apple or Outlook.");
    } catch {
      toast.error("Could not build the calendar file. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  const deadlineLabel = deadline ? formatDay(deadline) : null;

  return (
    <div>
      <ol className="space-y-3">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="flex items-start gap-3 text-sm">
            <IconFlag className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
            <span>
              <span className="font-medium">{milestone.label}</span>
              <br />
              <span className="text-muted-foreground">{formatDay(milestone.at)}</span>
            </span>
          </li>
        ))}
        {deadline ? (
          <li className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-sm">
            <IconFlag className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
            <span>
              <span className="font-semibold">Submissions close</span>
              <br />
              <span className="text-muted-foreground">
                {deadlineLabel}
                {organizerTimezone ? ` · ${organizerTimezone}` : ""}
              </span>
              <br />
              <Countdown deadline={deadline} className="font-medium text-amber-300" />
            </span>
          </li>
        ) : (
          <li className="text-sm text-muted-foreground">
            No deadline yet. Import the hackathon page to get one.
          </li>
        )}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => void downloadCalendar()}
        disabled={downloading}
      >
        <IconCalendarDown className="size-4" aria-hidden />
        {downloading ? "Building file…" : "Add to calendar"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Downloads a .ics file with every milestone and the deadline, each with
        alerts 24 hours and 2 hours before. Works with Google Calendar, Apple
        Calendar and Outlook, no sign-in. You can also ask the agent: “put my
        deadlines in my calendar”.
      </p>
    </div>
  );
}

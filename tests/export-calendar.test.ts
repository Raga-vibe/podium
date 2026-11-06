import { describe, expect, it } from "vitest";

import { buildCalendarEvents } from "../server/db/podium.js";
import type { MilestoneRow } from "../server/db/podium.js";

function milestone(id: string, label: string, at: Date): MilestoneRow {
  return { id, hackathonId: "h1", label, at } as MilestoneRow;
}

const DEADLINE = new Date("2026-11-10T07:59:00.000Z");
const hackathon = { id: "h1", name: "Builder.io Agent-Native Hackathon", submissionDeadline: DEADLINE };

describe("buildCalendarEvents", () => {
  it("exports a milestone on the deadline once, keeping the milestone label", () => {
    const events = buildCalendarEvents(hackathon, [
      milestone("m1", "Final submission deadline (11:59 PM PT)", DEADLINE),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toContain("Final submission deadline");
    expect(events[0].start.getTime()).toBe(DEADLINE.getTime());
  });

  it("exports both events when the milestone is at a different time", () => {
    const events = buildCalendarEvents(hackathon, [
      milestone("m1", "Kickoff", new Date("2026-11-06T16:00:00.000Z")),
    ]);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.summary)).toEqual([
      "Builder.io Agent-Native Hackathon: Kickoff",
      "Builder.io Agent-Native Hackathon: submissions close",
    ]);
  });

  it("exports just the deadline when there are no milestones", () => {
    const events = buildCalendarEvents(hackathon, []);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toContain("submissions close");
  });

  it("exports only milestones when there is no deadline", () => {
    const events = buildCalendarEvents({ ...hackathon, submissionDeadline: null }, [
      milestone("m1", "Kickoff", new Date("2026-11-06T16:00:00.000Z")),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toContain("Kickoff");
  });

  it("does not merge a milestone one minute off the deadline", () => {
    const events = buildCalendarEvents(hackathon, [
      milestone("m1", "Final submission deadline (11:59 PM PT)", new Date("2026-11-10T08:00:00.000Z")),
    ]);
    expect(events).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildCalendarEvents,
  buildIcs,
  formatIcsDate,
  sortRequirementsByBoardOrder,
  weightedTotal,
} from "../server/db/podium.js";
import { formatDay, formatInZone, formatLocal } from "../app/lib/podium.js";

/** The official deadline, stored in UTC: Nov 9, 2026 11:59 PM PT. */
const DEADLINE_ISO = "2026-11-10T07:59:00Z";
const DEADLINE = new Date(DEADLINE_ISO);

describe("weightedTotal", () => {
  it("weights the official rubric 40/20/20/20 and rounds to 1 decimal", () => {
    const criteria = [
      { id: "usefulness", weight: 40 },
      { id: "creativity", weight: 20 },
      { id: "innovation", weight: 20 },
      { id: "agent-native", weight: 20 },
    ];
    const scored = [
      { criterionId: "usefulness", score: 7 },
      { criterionId: "creativity", score: 8 },
      { criterionId: "innovation", score: 6 },
      { criterionId: "agent-native", score: 9 },
    ];
    // (7*40 + 8*20 + 6*20 + 9*20) / 100 = 7.4
    expect(weightedTotal(scored, criteria)).toBe(7.4);
  });

  it("returns null when nothing is scored", () => {
    expect(weightedTotal([], [{ id: "a", weight: 40 }])).toBeNull();
  });

  it("ignores scores for unknown criteria", () => {
    expect(
      weightedTotal(
        [{ criterionId: "ghost", score: 10 }],
        [{ id: "a", weight: 40 }],
      ),
    ).toBeNull();
  });
});

describe("sortRequirementsByBoardOrder", () => {
  it("orders Build, Demo, Submission, Eligibility, then board order within a group", () => {
    const rows = [
      { category: "eligibility", order: 0 },
      { category: "submission", order: 0 },
      { category: "build", order: 2 },
      { category: "demo", order: 0 },
      { category: "build", order: 1 },
    ];
    const sorted = sortRequirementsByBoardOrder(rows);
    expect(sorted.map((r) => `${r.category}:${r.order}`)).toEqual([
      "build:1",
      "build:2",
      "demo:0",
      "submission:0",
      "eligibility:0",
    ]);
  });
});

describe("deadline and timezone math", () => {
  it("stores the deadline as UTC 2026-11-10T07:59:00Z", () => {
    expect(DEADLINE.toISOString()).toBe("2026-11-10T07:59:00.000Z");
  });

  it("formatInZone shows the official Nov 9, 11:59 PM PT for America/Los_Angeles", () => {
    expect(formatInZone(DEADLINE_ISO, "America/Los_Angeles")).toBe(
      "Nov 9, 11:59 PM PT",
    );
  });

  it("formatInZone never appends the raw IANA name", () => {
    expect(formatInZone(DEADLINE_ISO, "America/Los_Angeles")).not.toContain(
      "America/Los_Angeles",
    );
  });

  it("formatInZone returns null without a timezone", () => {
    expect(formatInZone(DEADLINE_ISO, null)).toBeNull();
  });

  it("formatLocal and formatDay show the same UTC instant in the viewer zone with a zone label", () => {
    // The viewer zone is the test runner's local zone (Africa/Lagos here):
    // 07:59 UTC renders as 8:59 AM local. Assert the date and that a zone
    // label is present, not a specific zone, so the test is not tied to one TZ.
    const local = formatLocal(DEADLINE_ISO);
    expect(local).toContain("Nov 10");
    expect(local).toMatch(/(GMT|UTC|WAT|EST|PST|PDT)/);
    expect(formatDay(DEADLINE_ISO)).toContain("Nov 10");
    expect(formatDay(DEADLINE_ISO)).toMatch(/(GMT|UTC|WAT|EST|PST|PDT)/);
  });
});

describe("calendar (.ics) generation", () => {
  const hackathon = {
    id: "h1",
    name: "Builder.io Agent-Native Hackathon",
    organizer: "Builder.io",
    submissionDeadline: DEADLINE,
  };

  it("emits exactly one deadline event when a milestone already lands on it", () => {
    const events = buildCalendarEvents(hackathon, [
      {
        id: "m1",
        hackathonId: "h1",
        label: "Submissions close",
        at: DEADLINE,
      } as never,
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe(
      "Builder.io Agent-Native Hackathon: Submissions close",
    );
  });

  it("adds a separate deadline event when no milestone covers it", () => {
    const events = buildCalendarEvents(hackathon, []);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe(
      "Builder.io Agent-Native Hackathon: submissions close",
    );
  });

  it("uses the full hackathon name even when the stored name omits the organizer", () => {
    const events = buildCalendarEvents(
      { ...hackathon, name: "Agent-Native Hackathon" },
      [],
    );
    expect(events[0].summary).toBe(
      "Builder.io Agent-Native Hackathon: submissions close",
    );
  });

  it("writes UTC times and 24h + 2h alarms", () => {
    const events = buildCalendarEvents(hackathon, []);
    const ics = buildIcs(events, new Date("2026-11-07T00:00:00Z"));
    expect(ics).toContain("DTSTART:20261110T075900Z");
    expect(ics).toContain("TRIGGER:-PT24H");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(formatIcsDate(DEADLINE)).toBe("20261110T075900Z");
  });
});

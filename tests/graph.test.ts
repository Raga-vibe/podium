import { describe, expect, it } from "vitest";

import {
  buildHackathonGraph,
  graphContext,
  weakestCriterionLinks,
} from "../server/db/graph.js";
import type {
  HackathonRow,
  MilestoneRow,
  ProjectRow,
  RequirementRow,
  RubricRow,
  ScoreRow,
} from "../server/db/podium.js";

/** Before the deadline, so the "Submissions close" milestone is upcoming. */
const NOW = new Date("2026-11-05T12:00:00Z");
const DEADLINE = new Date("2026-11-10T07:59:00Z");

function makeHackathon(over: Partial<HackathonRow> = {}): HackathonRow {
  return {
    id: "h1",
    name: "Builder.io Agent-Native Hackathon",
    url: "https://www.builder.io/hackathon/",
    organizer: "Builder.io",
    organizerTimezone: "America/Los_Angeles",
    submissionDeadline: DEADLINE,
    prizeSummary: "$10,000 in prizes",
    createdAt: NOW,
    ownerEmail: "owner@example.com",
    orgId: null,
    visibility: "private",
    ...over,
  };
}

function makeRequirement(over: Partial<RequirementRow>): RequirementRow {
  return {
    id: "r1",
    hackathonId: "h1",
    title: "Record a demo video",
    detail: null,
    category: "demo",
    done: false,
    source: "agent",
    status: "accepted",
    order: 0,
    ownerEmail: "owner@example.com",
    orgId: null,
    visibility: "private",
    ...over,
  };
}

function makeCriterion(over: Partial<RubricRow>): RubricRow {
  return {
    id: "c1",
    hackathonId: "h1",
    name: "Usefulness & Execution",
    weight: 40,
    description: "A clear problem and a complete working flow",
    ownerEmail: "owner@example.com",
    orgId: null,
    visibility: "private",
    ...over,
  };
}

function makeMilestone(over: Partial<MilestoneRow>): MilestoneRow {
  return {
    id: "m1",
    hackathonId: "h1",
    label: "Submissions close",
    at: DEADLINE,
    ownerEmail: "owner@example.com",
    orgId: null,
    visibility: "private",
    ...over,
  };
}

function makeProject(over: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: "p1",
    hackathonId: "h1",
    name: "Podium",
    pitch: "Turn any hackathon page into a live mission board.",
    repoUrl: "https://github.com/Raga-vibe/podium",
    demoUrl: null,
    liveUrl: "https://podium-82hb.onrender.com",
    ownerEmail: "owner@example.com",
    orgId: null,
    visibility: "private",
    ...over,
  };
}

function makeScore(over: Partial<ScoreRow>): ScoreRow {
  return {
    id: "s1",
    hackathonId: "h1",
    criterionId: "c1",
    score: 7,
    rationale: "Working board, no demo yet",
    topFix: "Record the demo",
    userNote: null,
    previousScore: null,
    createdAt: new Date("2026-11-05T10:00:00Z"),
    ownerEmail: "owner@example.com",
    orgId: null,
    visibility: "private",
    ...over,
  };
}

/** A board with 2 criteria and 3 requirements: the example board. */
function mainBoard(scores: ScoreRow[]) {
  return {
    hackathon: makeHackathon(),
    requirements: [
      makeRequirement({
        id: "r1",
        title: "Record a demo video",
        detail: "Show the app working in a short video",
        category: "demo",
        done: false,
        order: 0,
      }),
      makeRequirement({
        id: "r2",
        title: "Build on the framework",
        detail: "Use the Agent-Native framework",
        category: "build",
        done: false,
        order: 1,
      }),
      makeRequirement({
        id: "r3",
        title: "Submit a demo link before the deadline",
        detail: "Post the demo link in the submission form",
        category: "submission",
        done: true,
        order: 2,
      }),
    ],
    criteria: [
      makeCriterion({
        id: "c1",
        name: "Usefulness & Execution",
        weight: 40,
        description: "A clear problem and a complete working flow",
      }),
      makeCriterion({
        id: "c2",
        name: "Demo quality",
        weight: 20,
        description: "How good the demo video is",
      }),
    ],
    milestones: [makeMilestone()],
    project: makeProject(),
    scores,
    now: NOW,
  };
}

const SCORED = [
  makeScore({ id: "s1", criterionId: "c1", score: 7 }),
  makeScore({
    id: "s2",
    criterionId: "c2",
    score: 4,
    createdAt: new Date("2026-11-05T10:05:00Z"),
  }),
];

describe("buildHackathonGraph RELATES_TO", () => {
  it("links a requirement about a demo video to a criterion named Demo quality", () => {
    const { edges } = buildHackathonGraph(mainBoard(SCORED));
    const relates = edges.filter((e) => e.type === "RELATES_TO");
    const demoLink = relates.find(
      (e) => e.from === "requirement:r1" && e.to === "criterion:c2",
    );
    expect(demoLink).toBeDefined();
    expect(demoLink?.reason).toContain("demo");
    expect(demoLink?.reason).toContain("video");
  });

  it("does not link an unrelated requirement to Demo quality", () => {
    const { edges } = buildHackathonGraph(mainBoard(SCORED));
    const relates = edges.filter((e) => e.type === "RELATES_TO");
    expect(
      relates.some(
        (e) => e.from === "requirement:r2" && e.to === "criterion:c2",
      ),
    ).toBe(false);
  });

  it("does not link on a short word alone: app is under 4 characters", () => {
    const { edges } = buildHackathonGraph({
      hackathon: makeHackathon(),
      requirements: [
        makeRequirement({ id: "r1", title: "Ship the app", detail: null }),
      ],
      criteria: [
        makeCriterion({ id: "c1", name: "App quality", description: null }),
      ],
      milestones: [],
      project: null,
      scores: [],
      now: NOW,
    });
    expect(edges.filter((e) => e.type === "RELATES_TO")).toEqual([]);
  });
});

describe("buildHackathonGraph structure", () => {
  it("builds nodes for every row and edges for every relationship", () => {
    const { nodes, edges } = buildHackathonGraph(mainBoard(SCORED));
    // 1 hackathon + 3 requirements + 2 criteria + 1 milestone + 1 project + 2 latest scores
    expect(nodes).toHaveLength(10);
    const byType = (t: string) => edges.filter((e) => e.type === t);
    expect(byType("BELONGS_TO")).toHaveLength(3);
    // r1 shares "working" with Usefulness and "demo, video" with Demo
    // quality; r3 shares "demo" with Demo quality; r2 shares nothing.
    expect(byType("RELATES_TO")).toHaveLength(3);
    expect(byType("SCORED_BY")).toHaveLength(2);
    // Both open requirements are due before the upcoming milestone.
    expect(byType("DUE_BEFORE")).toHaveLength(2);
    // Repo and live URLs are present; demo URL is not.
    expect(byType("LINKS_TO")).toHaveLength(2);
    expect(edges).toHaveLength(12);
  });
});

describe("weakestCriterionLinks", () => {
  it("returns the lowest-scored criterion with its linked open requirements", () => {
    const weakest = weakestCriterionLinks(mainBoard(SCORED));
    expect(weakest).not.toBeNull();
    expect(weakest?.criterion.name).toBe("Demo quality");
    expect(weakest?.score.score).toBe(4);
    expect(weakest?.linkedOpenRequirements.map((r) => r.title)).toEqual([
      "Record a demo video",
    ]);
  });

  it("returns null when nothing is scored yet", () => {
    expect(weakestCriterionLinks(mainBoard([]))).toBeNull();
  });
});

describe("graphContext", () => {
  it("mentions the weakest criterion and its open requirements", () => {
    const context = graphContext(mainBoard(SCORED));
    expect(context).toContain("Demo quality");
    expect(context).toContain("4/10");
    expect(context).toContain("Record a demo video");
    expect(context).toContain("Submissions close");
  });

  it("reports unscored and lists open requirements per category when nothing is scored", () => {
    const context = graphContext(mainBoard([]));
    expect(context).toContain("Nothing is scored yet");
    expect(context).toContain("build: 1 open");
    expect(context).toContain("demo: 1 open");
    expect(context).toContain("submission: 0 open");
    expect(context).toContain("Submissions close");
  });

  it("does not crash on a fully empty board", () => {
    const empty = {
      hackathon: makeHackathon(),
      requirements: [],
      criteria: [],
      milestones: [],
      project: null,
      scores: [],
      now: NOW,
    };
    const { nodes, edges } = buildHackathonGraph(empty);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("hackathon");
    expect(edges).toEqual([]);
    const context = graphContext(empty);
    expect(context).toContain("Nothing is scored yet");
    expect(context).toContain("No upcoming milestones");
    expect(weakestCriterionLinks(empty)).toBeNull();
  });
});

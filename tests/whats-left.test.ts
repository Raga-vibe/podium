import { describe, expect, it } from "vitest";

import { sortRequirementsByBoardOrder } from "../server/db/podium.js";

describe("sortRequirementsByBoardOrder", () => {
  it("returns Build, Demo, Submission, Eligibility whatever the stored order", () => {
    const rows = [
      { category: "eligibility", order: 0, title: "Built during the hackathon" },
      { category: "submission", order: 1, title: "Submit before the deadline" },
      { category: "build", order: 2, title: "Build on the framework" },
      { category: "demo", order: 3, title: "Record a demo" },
      { category: "build", order: 4, title: "Ship a working app" },
    ];
    expect(sortRequirementsByBoardOrder(rows).map((r) => r.title)).toEqual([
      "Build on the framework",
      "Ship a working app",
      "Record a demo",
      "Submit before the deadline",
      "Built during the hackathon",
    ]);
  });

  it("keeps the stored order inside a group", () => {
    const rows = [
      { category: "build", order: 5, title: "Second" },
      { category: "build", order: 2, title: "First" },
    ];
    expect(sortRequirementsByBoardOrder(rows).map((r) => r.title)).toEqual([
      "First",
      "Second",
    ]);
  });
});

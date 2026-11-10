import { describe, expect, it } from "vitest";

import {
  requirementNeedsAcceptance,
  requirementState,
  scoreState,
} from "../server/db/states.js";

describe("requirementState", () => {
  it("a proposed requirement awaiting review is proposed, not open", () => {
    expect(requirementState("proposed", false)).toBe("proposed");
  });

  it("an accepted requirement not yet done is open", () => {
    expect(requirementState("accepted", false)).toBe("open");
  });

  it("a done requirement is done whatever its status was", () => {
    expect(requirementState("accepted", true)).toBe("done");
    // A proposed row found done in the wild reads as done, so counts never
    // disagree; toggle-requirement prevents creating this combination.
    expect(requirementState("proposed", true)).toBe("done");
  });
});

describe("requirementNeedsAcceptance", () => {
  it("only a proposed, not-done requirement needs acceptance first", () => {
    expect(requirementNeedsAcceptance("proposed", false)).toBe(true);
    expect(requirementNeedsAcceptance("proposed", true)).toBe(false);
    expect(requirementNeedsAcceptance("accepted", false)).toBe(false);
    expect(requirementNeedsAcceptance("accepted", true)).toBe(false);
  });
});

describe("scoreState", () => {
  it("a fresh score is scored", () => {
    expect(scoreState({ userNote: null, previousScore: null })).toBe("scored");
  });

  it("a score carrying the user's disagreement note is disputed", () => {
    expect(scoreState({ userNote: "too harsh", previousScore: null })).toBe(
      "disputed",
    );
  });

  it("a score that replaced an earlier one is rescored", () => {
    expect(scoreState({ userNote: null, previousScore: 6 })).toBe("rescored");
  });

  it("a disputed score takes precedence over a rescore", () => {
    // A note on a rescored row means the user disagrees with the new score.
    expect(scoreState({ userNote: "still too harsh", previousScore: 6 })).toBe(
      "disputed",
    );
  });
});

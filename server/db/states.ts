/**
 * Explicit state machines for Podium's core domain objects.
 *
 * Before this module, the lifecycles below were implicit: a requirement's
 * state had to be inferred from two independent fields (`status` text +
 * `done` boolean), and a score's state from two nullable columns
 * (`userNote`, `previousScore`). The agent, the UI, and developers each
 * re-derived the same states in different places, and nothing prevented
 * the invalid combination of a proposed requirement marked done.
 *
 * This module is the single source of truth. The server derives the named
 * `state` and serializes it on every requirement and score (see
 * `serializeRequirement` / `serializeScore` in podium.ts), so the UI and
 * the agent read one field instead of inferring from two. The stored
 * columns are unchanged (no migration): `state` is derived, not stored.
 *
 * Machines defined here:
 * - Requirement: proposed -> open -> done
 * - Score: scored -> disputed -> rescored
 * The import flow is client-driven (ImportBar) and has no server record;
 * its states are named in app/components/podium/ImportBar.tsx.
 */

/** A requirement's lifecycle state, derived from its stored fields. */
export const REQUIREMENT_STATES = ["proposed", "open", "done"] as const;
export type RequirementState = (typeof REQUIREMENT_STATES)[number];

/**
 * Derive a requirement's state. The stored fields are `status`
 * ("proposed" | "accepted") and `done` (boolean). The four combinations
 * collapse to three valid states; the fourth (proposed + done) is invalid
 * and is never created any more (see toggle-requirement, which accepts a
 * proposed item when it is marked done). Any such row found in the wild
 * is read as "done" here, so counts never disagree.
 */
export function requirementState(
  status: string,
  done: boolean,
): RequirementState {
  if (done) return "done";
  if (status === "proposed") return "proposed";
  return "open";
}

/**
 * Whether a requirement in this state may be marked done. A proposed item
 * must be accepted first; toggle-requirement accepts it as part of marking
 * it done, so this is the guard that keeps the invalid combination out.
 */
export function requirementNeedsAcceptance(
  status: string,
  done: boolean,
): boolean {
  return status === "proposed" && !done;
}

/** A score's lifecycle state, derived from its stored fields. */
export const SCORE_STATES = ["scored", "disputed", "rescored"] as const;
export type ScoreState = (typeof SCORE_STATES)[number];

/**
 * Derive a score's state. A fresh score is "scored". A score carrying the
 * user's disagreement note is "disputed" (awaiting a rescore). A score
 * that replaced an earlier one is "rescored". The dispute note is cleared
 * when a rescore is saved (see save-scores), so a rescored row never
 * still looks disputed.
 */
export function scoreState(row: {
  userNote: string | null;
  previousScore: number | null;
}): ScoreState {
  if (row.userNote !== null) return "disputed";
  if (row.previousScore !== null) return "rescored";
  return "scored";
}

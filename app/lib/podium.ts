import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useEffect, useState } from "react";

/** Shared Podium types (mirror the action outputs in actions/). */

export interface HackathonSummary {
  id: string;
  name: string;
  url: string;
  organizer: string | null;
  organizerTimezone: string | null;
  submissionDeadline: string | null;
  prizeSummary: string | null;
  createdAt: string | null;
  requirementCount: number;
  doneCount: number;
  openCount: number;
  weightedTotal: number | null;
}

export interface Requirement {
  id: string;
  hackathonId: string;
  title: string;
  detail: string | null;
  category: string;
  done: boolean;
  source: string;
  status: string;
  /** Explicit lifecycle state (see server/db/states.ts): proposed (awaiting review), open (accepted, not done), or done. */
  state?: "proposed" | "open" | "done";
  order: number;
}

export interface Milestone {
  id: string;
  hackathonId: string;
  label: string;
  at: string | null;
}

export interface RubricCriterion {
  id: string;
  hackathonId: string;
  name: string;
  weight: number;
  description: string | null;
}

export interface Project {
  id: string;
  hackathonId: string;
  name: string;
  pitch: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  liveUrl: string | null;
}

export interface Score {
  id: string;
  hackathonId: string;
  criterionId: string;
  score: number;
  rationale: string | null;
  topFix: string | null;
  userNote: string | null;
  previousScore: number | null;
  /** Explicit lifecycle state (see server/db/states.ts): scored (fresh), disputed (carries the disagreement note, awaiting rescore), or rescored. */
  state?: "scored" | "disputed" | "rescored";
  createdAt: string | null;
}

export interface HackathonDetail {
  hackathon: {
    id: string;
    name: string;
    url: string;
    organizer: string | null;
    organizerTimezone: string | null;
    submissionDeadline: string | null;
    prizeSummary: string | null;
    createdAt: string | null;
  };
  requirements: Requirement[];
  milestones: Milestone[];
  rubricCriteria: RubricCriterion[];
  project: Project | null;
  scores: Score[];
  draft: { id: string; hackathonId: string; body: string; updatedAt: string | null } | null;
  weightedTotal: number | null;
}

export interface Brief {
  id: string;
  hackathonId: string | null;
  hackathonName: string | null;
  body: string;
  createdAt: string | null;
}

export const REQUIREMENT_CATEGORIES = [
  "build",
  "demo",
  "submission",
  "eligibility",
] as const;

export type RequirementCategory =
  (typeof REQUIREMENT_CATEGORIES)[number];

/** Live clock that ticks once a second so countdowns stay fresh. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export interface TimeLeft {
  totalMs: number;
  overdue: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function timeLeft(deadlineIso: string | null, now: Date): TimeLeft | null {
  if (!deadlineIso) return null;
  const totalMs = new Date(deadlineIso).getTime() - now.getTime();
  const abs = Math.abs(totalMs);
  return {
    totalMs,
    overdue: totalMs < 0,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
  };
}

export function formatCountdown(left: TimeLeft | null): string {
  if (!left) return "No deadline set";
  const parts: string[] = [];
  if (left.days > 0) parts.push(`${left.days}d`);
  parts.push(`${left.hours}h`);
  parts.push(`${left.minutes}m`);
  if (left.days === 0) parts.push(`${left.seconds}s`);
  return `${left.overdue ? "Overdue by " : ""}${parts.join(" ")}${left.overdue ? "" : " left"}`;
}

/** Deadline rendered in the viewer's local timezone, with the local zone label. */
export function formatLocal(iso: string | null): string {
  if (!iso) return "No deadline";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

/** Deadline rendered in the organizer's timezone, with a short zone label. */
export function formatInZone(iso: string | null, timeZone: string | null): string | null {
  if (!iso || !timeZone) return null;
  try {
    const when = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
    // The official deadline is stated as "Nov 9, 11:59 PM PT": show the
    // generic PT label for the Pacific zone instead of PST/PDT. Never append
    // the raw IANA name (America/Los_Angeles).
    if (timeZone === "America/Los_Angeles") {
      return when.replace(/\s(PST|PDT)$/, " PT");
    }
    return when;
  } catch {
    return null;
  }
}

export function formatDay(iso: string | null): string {
  if (!iso) return "";
  return formatLocal(iso);
}

/** Ask the agent to do AI work, with the relevant ids as context. */
export function askAgent(message: string, context: Record<string, unknown>): void {
  sendToAgentChat({
    message,
    context: JSON.stringify(context),
    submit: true,
    openSidebar: true,
  });
}

export function scoreOf(scores: Score[], criterionId: string): Score | undefined {
  return scores.find((s) => s.criterionId === criterionId);
}

/**
 * Compare hackathon URLs ignoring scheme, a leading www., casing and a
 * trailing slash, so the demo board is recognised whatever exact form its
 * stored URL has (https://builder.io/hackathon vs https://www.builder.io/hackathon/).
 */
export function sameHackathonUrl(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  return normalize(a) === normalize(b);
}

export function weakestCriterion(
  criteria: RubricCriterion[],
  scores: Score[],
): { criterion: RubricCriterion; score: Score } | null {
  let weakest: { criterion: RubricCriterion; score: Score } | null = null;
  for (const criterion of criteria) {
    const score = scoreOf(scores, criterion.id);
    if (!score) continue;
    if (!weakest || score.score < weakest.score.score) {
      weakest = { criterion, score };
    }
  }
  return weakest;
}

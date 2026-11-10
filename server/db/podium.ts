import type {
  briefs,
  drafts,
  hackathons,
  milestones,
  projects,
  requirements,
  rubricCriteria,
  scores,
} from "./schema.js";
import { requirementState, scoreState } from "./states.js";

export type HackathonRow = typeof hackathons.$inferSelect;
export type RequirementRow = typeof requirements.$inferSelect;
export type MilestoneRow = typeof milestones.$inferSelect;
export type RubricRow = typeof rubricCriteria.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ScoreRow = typeof scores.$inferSelect;
export type DraftRow = typeof drafts.$inferSelect;
export type BriefRow = typeof briefs.$inferSelect;

export function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function serializeHackathon(r: HackathonRow) {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    organizer: r.organizer,
    organizerTimezone: r.organizerTimezone,
    submissionDeadline: iso(r.submissionDeadline),
    prizeSummary: r.prizeSummary,
    createdAt: iso(r.createdAt),
  };
}

export function serializeRequirement(r: RequirementRow) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    title: r.title,
    detail: r.detail,
    category: r.category,
    done: r.done,
    source: r.source,
    status: r.status,
    // Explicit lifecycle state (see server/db/states.ts): "proposed" (agent
    // suggestion awaiting review), "open" (accepted, not done), "done".
    // Derived from status + done so the UI and the agent read one field.
    state: requirementState(r.status, r.done),
    order: r.order,
  };
}

export function serializeMilestone(r: MilestoneRow) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    label: r.label,
    at: iso(r.at),
  };
}

export function serializeRubric(r: RubricRow) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    name: r.name,
    weight: r.weight,
    description: r.description,
  };
}

export function serializeProject(r: ProjectRow) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    name: r.name,
    pitch: r.pitch,
    repoUrl: r.repoUrl,
    demoUrl: r.demoUrl,
    liveUrl: r.liveUrl,
  };
}

export function serializeScore(r: ScoreRow) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    criterionId: r.criterionId,
    score: r.score,
    rationale: r.rationale,
    topFix: r.topFix,
    userNote: r.userNote,
    previousScore: r.previousScore,
    // Explicit lifecycle state (see server/db/states.ts): "scored" (fresh),
    // "disputed" (carries the user's disagreement note, awaiting rescore),
    // "rescored" (replaced an earlier score; the dispute note is cleared
    // on rescore, so it no longer looks disputed).
    state: scoreState(r),
    createdAt: iso(r.createdAt),
  };
}

export function serializeDraft(r: DraftRow) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    body: r.body,
    updatedAt: iso(r.updatedAt),
  };
}

export function serializeBrief(
  r: BriefRow,
  hackathonName: string | null,
) {
  return {
    id: r.id,
    hackathonId: r.hackathonId,
    hackathonName,
    body: r.body,
    createdAt: iso(r.createdAt),
  };
}

/** Weighted total on a 0-10 scale, rounded to 1 decimal; null when no scores. */
export function weightedTotal(
  scored: Array<{ criterionId: string; score: number }>,
  criteria: Array<{ id: string; weight: number }>,
): number | null {
  const weights = new Map(criteria.map((c) => [c.id, c.weight]));
  let weightedSum = 0;
  let weightSum = 0;
  for (const s of scored) {
    const w = weights.get(s.criterionId);
    if (w === undefined) continue;
    weightedSum += s.score * w;
    weightSum += w;
  }
  if (weightSum === 0) return null;
  return Math.round((weightedSum / weightSum) * 10) / 10;
}

/** Latest score per criterion (newest createdAt wins). */
export function latestScores(rows: ScoreRow[]): ScoreRow[] {
  const byCriterion = new Map<string, ScoreRow>();
  const sorted = [...rows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const row of sorted) byCriterion.set(row.criterionId, row);
  return [...byCriterion.values()];
}

/** Lowest-scored rubric criterion from the latest scores (null when nothing is scored yet). */
export function weakestCriterion(
  criteria: RubricRow[],
  latest: ScoreRow[],
): { criterion: RubricRow; score: ScoreRow } | null {
  let weakest: { criterion: RubricRow; score: ScoreRow } | null = null;
  for (const criterion of criteria) {
    const score = latest.find((s) => s.criterionId === criterion.id);
    if (!score) continue;
    if (!weakest || score.score < weakest.score.score) {
      weakest = { criterion, score };
    }
  }
  return weakest;
}

/**
 * Board order for requirements: Build, Demo, Submission, Eligibility
 * (REQUIREMENT_CATEGORIES in app/lib/podium.ts), then the board order
 * within the group. The stored `order` alone is not the board order: it is
 * a global sequence from import time. Returns a new array.
 */
export function sortRequirementsByBoardOrder<T extends { category: string; order: number }>(
  rows: T[],
): T[] {
  const CATEGORY_RANK: Record<string, number> = {
    build: 0,
    demo: 1,
    submission: 2,
    eligibility: 3,
  };
  return [...rows].sort(
    (a, b) =>
      (CATEGORY_RANK[a.category] ?? 99) - (CATEGORY_RANK[b.category] ?? 99) ||
      a.order - b.order,
  );
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "hackathon";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as UTC `YYYYMMDDTHHMMSSZ` for ICS. */
export function formatIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape text per RFC 5545. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a line at 75 octets per RFC 5545 (continuation lines start with a space). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

export interface IcsEventInput {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
}

/**
 * Calendar events for a hackathon: one per milestone, plus the submission
 * deadline, but never twice for the same instant. When a milestone already
 * lands on the submission deadline, the milestone event IS the deadline
 * event, so no separate "submissions close" event is emitted.
 */
/**
 * The full name shown for a hackathon: organizer plus name, unless the name
 * already carries the organizer (the seeded board's name is
 * "Builder.io Agent-Native Hackathon", while an imported board may only be
 * named "Agent-Native Hackathon" with organizer "Builder.io").
 */
export function hackathonDisplayName(hackathon: {
  name: string;
  organizer: string | null;
}): string {
  const organizer = hackathon.organizer?.trim();
  if (
    organizer &&
    !hackathon.name.toLowerCase().includes(organizer.toLowerCase())
  ) {
    return `${organizer} ${hackathon.name}`;
  }
  return hackathon.name;
}

export function buildCalendarEvents(
  hackathon: {
    id: string;
    name: string;
    organizer: string | null;
    submissionDeadline: Date | null;
  },
  milestones: MilestoneRow[],
): IcsEventInput[] {
  const name = hackathonDisplayName(hackathon);
  const events: IcsEventInput[] = milestones.map((m) => ({
    uid: `${m.id}@podium`,
    start: m.at,
    end: new Date(m.at.getTime() + 3600000),
    summary: `${name}: ${m.label}`,
    description: `${m.label} for ${name}.`,
  }));
  const deadline = hackathon.submissionDeadline;
  const deadlineCovered =
    deadline !== null &&
    milestones.some((m) => m.at.getTime() === deadline.getTime());
  if (deadline && !deadlineCovered) {
    events.push({
      uid: `${hackathon.id}-deadline@podium`,
      start: deadline,
      end: new Date(deadline.getTime() + 3600000),
      summary: `${name}: submissions close`,
      description: `Submission deadline for ${name}.`,
    });
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function buildIcs(events: IcsEventInput[], now: Date): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Podium//Hackathon Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(e.start)}`,
      `DTEND:${formatIcsDate(e.end)}`,
      `SUMMARY:${escapeIcsText(e.summary)}`,
      `DESCRIPTION:${escapeIcsText(e.description)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT24H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(e.summary)}`,
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(e.summary)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

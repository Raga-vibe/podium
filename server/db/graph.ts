/**
 * GraphRAG for Podium: a deterministic knowledge graph built from the
 * hackathon board's own rows, with no AI and no database access.
 *
 * The graph is computed on read from rows the action already fetched, so
 * it never needs a migration and can never drift from the board: whatever
 * the user edits, the graph sees. The agent reads the graph (via the
 * graph-context action) to ground its scoring and its top fix in the
 * board's own evidence instead of inventing links.
 *
 * Node ids are prefixed by type (`requirement:<id>`) so ids can never
 * collide across tables. Two edge kinds carry their payload on the
 * `reason` string because the node types have no node for them:
 * - BELONGS_TO (requirement -> hackathon) records the requirement's
 *   category; there is no separate category node.
 * - LINKS_TO (project -> hackathon) records one URL per edge (repo, demo
 *   or live); there is no URL node.
 */
import {
  iso,
  latestScores,
  serializeHackathon,
  serializeMilestone,
  serializeProject,
  serializeRequirement,
  serializeRubric,
  serializeScore,
  sortRequirementsByBoardOrder,
  weakestCriterion,
} from "./podium.js";
import type {
  HackathonRow,
  MilestoneRow,
  ProjectRow,
  RequirementRow,
  RubricRow,
  ScoreRow,
} from "./podium.js";

export type GraphNodeType =
  | "hackathon"
  | "requirement"
  | "criterion"
  | "milestone"
  | "project"
  | "score";

export type GraphEdgeType =
  | "BELONGS_TO"
  | "RELATES_TO"
  | "DUE_BEFORE"
  | "SCORED_BY"
  | "LINKS_TO";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: GraphEdgeType;
  reason: string;
}

export interface HackathonGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Rows the action already fetched, plus an optional clock for tests. */
export interface HackathonGraphInput {
  hackathon: HackathonRow;
  requirements: RequirementRow[];
  criteria: RubricRow[];
  milestones: MilestoneRow[];
  project: ProjectRow | null;
  scores: ScoreRow[];
  now?: Date;
}

export interface WeakestCriterionLinks {
  criterion: ReturnType<typeof serializeRubric>;
  score: ReturnType<typeof serializeScore>;
  linkedOpenRequirements: ReturnType<typeof serializeRequirement>[];
}

/** Words too generic to link a requirement to a criterion. */
const STOPWORDS = new Set([
  "about", "after", "again", "before", "being", "between", "both",
  "could", "during", "each", "from", "have", "into", "more", "most",
  "other", "over", "should", "some", "such", "than", "that", "their",
  "there", "these", "those", "through", "under", "very", "what",
  "when", "where", "which", "while", "will", "with", "would", "your",
]);

/**
 * Keywords of a text: lowercase whole words, stopwords stripped, at least
 * 4 characters. Short words like "app" (3 letters) are dropped, so a
 * requirement and a criterion cannot link on "app" alone; "demo"
 * (4 letters) is kept.
 */
export function extractKeywords(text: string | null | undefined): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

function requirementText(r: RequirementRow): string {
  return `${r.title} ${r.detail ?? ""}`;
}

function criterionText(c: RubricRow): string {
  return `${c.name} ${c.description ?? ""}`;
}

/** Keywords a requirement and a criterion share (whole-word matches). */
export function sharedKeywords(
  requirement: RequirementRow,
  criterion: RubricRow,
): string[] {
  const reqWords = new Set(extractKeywords(requirementText(requirement)));
  return extractKeywords(criterionText(criterion)).filter((w) =>
    reqWords.has(w),
  );
}

/** Open means not done, whatever the status: the same count the board shows. */
function openRequirements(input: HackathonGraphInput): RequirementRow[] {
  return sortRequirementsByBoardOrder(
    input.requirements.filter((r) => !r.done),
  );
}

/** Open requirements whose text shares a keyword with the criterion. */
export function linkedOpenRequirements(
  input: HackathonGraphInput,
  criterion: RubricRow,
): RequirementRow[] {
  return openRequirements(input).filter(
    (r) => sharedKeywords(r, criterion).length > 0,
  );
}

function nextMilestone(input: HackathonGraphInput): MilestoneRow | null {
  const now = input.now ?? new Date();
  const upcoming = input.milestones
    .filter((m) => m.at.getTime() >= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return upcoming[0] ?? null;
}

function nodeId(type: GraphNodeType, id: string): string {
  return `${type}:${id}`;
}

export function buildHackathonGraph(
  input: HackathonGraphInput,
): HackathonGraph {
  const now = input.now ?? new Date();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const hackathonNode: GraphNode = {
    id: nodeId("hackathon", input.hackathon.id),
    type: "hackathon",
    label: input.hackathon.name,
    data: serializeHackathon(input.hackathon) as unknown as Record<
      string,
      unknown
    >,
  };
  nodes.push(hackathonNode);

  for (const r of input.requirements) {
    nodes.push({
      id: nodeId("requirement", r.id),
      type: "requirement",
      label: r.title,
      data: serializeRequirement(r) as unknown as Record<string, unknown>,
    });
    edges.push({
      from: nodeId("requirement", r.id),
      to: hackathonNode.id,
      type: "BELONGS_TO",
      reason: `category: ${r.category}`,
    });
  }

  for (const c of input.criteria) {
    nodes.push({
      id: nodeId("criterion", c.id),
      type: "criterion",
      label: c.name,
      data: serializeRubric(c) as unknown as Record<string, unknown>,
    });
    for (const r of input.requirements) {
      const shared = sharedKeywords(r, c);
      if (shared.length > 0) {
        edges.push({
          from: nodeId("requirement", r.id),
          to: nodeId("criterion", c.id),
          type: "RELATES_TO",
          reason: `shared keywords: ${shared.join(", ")}`,
        });
      }
    }
  }

  const latest = latestScores(input.scores);
  for (const score of latest) {
    const criterion = input.criteria.find((c) => c.id === score.criterionId);
    nodes.push({
      id: nodeId("score", score.id),
      type: "score",
      label: `${score.score}/10 on ${criterion?.name ?? score.criterionId}`,
      data: serializeScore(score) as unknown as Record<string, unknown>,
    });
    if (criterion) {
      edges.push({
        from: nodeId("criterion", criterion.id),
        to: nodeId("score", score.id),
        type: "SCORED_BY",
        reason: `latest score ${score.score}/10`,
      });
    }
  }

  for (const m of input.milestones) {
    nodes.push({
      id: nodeId("milestone", m.id),
      type: "milestone",
      label: m.label,
      data: serializeMilestone(m) as unknown as Record<string, unknown>,
    });
    // Time pressure, not a hard dependency: every open requirement is
    // due before every upcoming milestone.
    if (m.at.getTime() >= now.getTime()) {
      for (const r of openRequirements(input)) {
        edges.push({
          from: nodeId("requirement", r.id),
          to: nodeId("milestone", m.id),
          type: "DUE_BEFORE",
          reason: `open requirement; milestone "${m.label}" on ${iso(m.at)}`,
        });
      }
    }
  }

  if (input.project) {
    const p = input.project;
    nodes.push({
      id: nodeId("project", p.id),
      type: "project",
      label: p.name,
      data: serializeProject(p) as unknown as Record<string, unknown>,
    });
    const links: Array<[string, string | null]> = [
      ["repo", p.repoUrl],
      ["demo", p.demoUrl],
      ["live", p.liveUrl],
    ];
    for (const [kind, url] of links) {
      if (url) {
        edges.push({
          from: nodeId("project", p.id),
          to: hackathonNode.id,
          type: "LINKS_TO",
          reason: `${kind}: ${url}`,
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * The weakest criterion (lowest latest score) with the open requirements
 * linked to it, or null when nothing is scored yet.
 */
export function weakestCriterionLinks(
  input: HackathonGraphInput,
): WeakestCriterionLinks | null {
  const weakest = weakestCriterion(input.criteria, latestScores(input.scores));
  if (!weakest) return null;
  return {
    criterion: serializeRubric(weakest.criterion),
    score: serializeScore(weakest.score),
    linkedOpenRequirements: linkedOpenRequirements(
      input,
      weakest.criterion,
    ).map(serializeRequirement),
  };
}

/**
 * Grounded plain-text summary for the agent: the weakest criterion with
 * the open requirements linked to it, the open-requirement count per
 * criterion, and the next milestone. When nothing is scored yet it says
 * so and lists open requirements per category instead. Factual only:
 * no advice, no invented links.
 */
export function graphContext(input: HackathonGraphInput): string {
  const lines: string[] = [];
  const weakest = weakestCriterionLinks(input);
  const milestone = nextMilestone(input);

  if (weakest) {
    lines.push(
      `Weakest criterion: "${weakest.criterion.name}" (${weakest.score.score}/10, weight ${weakest.criterion.weight}%).`,
    );
    if (weakest.linkedOpenRequirements.length > 0) {
      lines.push("Open requirements linked to it:");
      for (const r of weakest.linkedOpenRequirements) {
        lines.push(`- ${r.title}`);
      }
    } else {
      lines.push("No open requirements are linked to it.");
    }
    lines.push("Open requirements per criterion:");
    for (const c of input.criteria) {
      const count = linkedOpenRequirements(input, c).length;
      lines.push(`- ${c.name}: ${count} open`);
    }
  } else {
    lines.push("Nothing is scored yet.");
    lines.push("Open requirements by category:");
    const open = openRequirements(input);
    for (const category of ["build", "demo", "submission", "eligibility"]) {
      const count = open.filter((r) => r.category === category).length;
      lines.push(`- ${category}: ${count} open`);
    }
  }

  if (milestone) {
    lines.push(
      `Next milestone: "${milestone.label}" on ${iso(milestone.at)}.`,
    );
  } else {
    lines.push("No upcoming milestones.");
  }

  return lines.join("\n");
}

import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Podium/1.0; +https://www.builder.io/hackathon)";

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function cleanHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? decodeEntities(titleMatch[1].trim()) : "";
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60000);
  return { title, text };
}

async function fetchPage(url: string): Promise<{ title: string; text: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    fail(`Failed to fetch ${url}: ${err instanceof Error ? err.message : "network error"}`);
  }
  if (!res.ok) {
    fail(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const html = await res.text();
  return cleanHtml(html);
}

const RULES_LINK = /rules|guidelines|terms|official-rules/i;

function findRulesUrl(html: string, base: string): string | null {
  const baseUrl = new URL(base);
  const anchor = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) !== null) {
    const href = match[1];
    if (!href) continue;
    const linkText = (match[2] ?? "").replace(/<[^>]+>/g, " ");
    if (!RULES_LINK.test(href) && !RULES_LINK.test(linkText)) continue;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === baseUrl.origin) return resolved.toString();
    } catch {
      continue;
    }
  }
  return null;
}

export default defineAction({
  description:
    "Fetch a hackathon page (and any linked rules page) and return cleaned text. No interpretation or extraction.",
  schema: z.object({
    url: z.string().url().describe("URL of the hackathon page to fetch"),
  }),
  outputSchema: z.object({
    url: z.string().describe("URL that was fetched"),
    title: z.string().describe("Page <title> text, or an empty string"),
    text: z.string().describe("Cleaned visible page text, capped at 60000 characters"),
    rulesText: z.string().describe("Cleaned text of the linked rules page, or an empty string when none was found"),
    fetchedAt: z.string().describe("ISO timestamp of the fetch"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ url }) => {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      fail(
        `Failed to fetch ${url}: ${err instanceof Error ? err.message : "network error"}`,
      );
    }
    if (!res.ok) {
      fail(`Failed to fetch ${url}: HTTP ${res.status}`);
    }
    const html = await res.text();
    const { title, text } = cleanHtml(html);
    let rulesText = "";
    const rulesUrl = findRulesUrl(html, url);
    if (rulesUrl) {
      try {
        const rules = await fetchPage(rulesUrl);
        rulesText = rules.text;
      } catch {
        rulesText = "";
      }
    }
    return { url, title, text, rulesText, fetchedAt: new Date().toISOString() };
  },
});

import { sql } from "drizzle-orm";
import { defineEventHandler } from "h3";

import { getDb } from "../db/index.js";

/**
 * TEMPORARY diagnostic for the guest agent hang (Nov 7). Reports only
 * metadata about provider credentials, never secret values: which provider
 * auth-failure markers exist (and when they were recorded), which stored
 * credential scopes exist, and the default engine setting. Remove once the
 * guest model issue is fixed.
 */
export default defineEventHandler(async () => {
  const db = getDb();
  const rowsOf = (result: unknown): Array<Record<string, unknown>> => {
    if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
    if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
      return (result as { rows: Array<Record<string, unknown>> }).rows;
    }
    return [];
  };
  const parseJson = (text: unknown): Record<string, unknown> | null => {
    if (typeof text !== "string") return null;
    try {
      const parsed: unknown = JSON.parse(text);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const failureRows = rowsOf(
    await db.execute(
      sql`SELECT key, value FROM public.settings WHERE key LIKE 'provider-auth-failure:%'`,
    ),
  );
  const engineRows = rowsOf(
    await db.execute(
      sql`SELECT key, value FROM public.settings WHERE key = 'agent-engine'`,
    ),
  );
  const secretRows = rowsOf(
    await db.execute(
      sql`SELECT scope, scope_id, "key" FROM public.app_secrets ORDER BY scope, scope_id, "key"`,
    ),
  );

  const providerAuthFailures = failureRows.map((row) => {
    const value = parseJson(row.value) ?? {};
    const at = typeof value.at === "number" ? new Date(value.at).toISOString() : null;
    return {
      providerKey: typeof value.key === "string" ? value.key : null,
      message: typeof value.message === "string" ? value.message : null,
      status: typeof value.status === "number" ? value.status : null,
      code: typeof value.code === "string" ? value.code : null,
      at,
      ownerEmail: typeof value.ownerEmail === "string" ? value.ownerEmail : null,
      orgId: typeof value.orgId === "string" ? value.orgId : null,
    };
  });
  const agentEngineDefault =
    engineRows.length > 0 ? parseJson(engineRows[0]?.value) : null;
  const appSecrets = secretRows.map((row) => ({
    scope: typeof row.scope === "string" ? row.scope : null,
    scopeId: typeof row.scope_id === "string" ? row.scope_id : null,
    key: typeof row.key === "string" ? row.key : null,
  }));

  return { providerAuthFailures, agentEngineDefault, appSecrets };
});

import { createGetDb } from "@agent-native/core/db";
import { registerShareableResource } from "@agent-native/core/sharing";
import * as schema from "./schema.js";

export const getDb = createGetDb(schema);
export { schema };

/**
 * Hackathon boards are private to their owner. No share UI is shipped, and
 * public visibility is disabled, so in practice accessFilter admits only
 * the owner's own boards. The registration exists so the framework's access
 * helpers (accessFilter / assertAccess) can enforce that scoping.
 */
registerShareableResource({
  type: "hackathon",
  resourceTable: schema.hackathons,
  sharesTable: schema.hackathonShares,
  displayName: "Hackathon",
  titleColumn: "name",
  getResourcePath: (hackathon) => `/hackathon/${hackathon.id}`,
  getDb,
  allowPublic: false,
  agentRead: { actions: ["get-hackathon"] },
});

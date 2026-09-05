import { z } from "zod";
// Preserve historical records without inventing a receipt or a steel usage area.
// Legacy gaps are visibly labeled and must be completed when the record is edited.
export function migrateDatabase(input: unknown): unknown {
  if (
    !input ||
    typeof input !== "object" ||
    !("version" in input) ||
    input.version !== 1
  )
    return input;
  const old = z
    .object({
      version: z.literal(1),
      diesel: z.array(z.record(z.string(), z.unknown())),
      transactions: z.array(z.record(z.string(), z.unknown())),
    })
    .passthrough()
    .parse(input);
  return {
    ...old,
    version: 2,
    diesel: old.diesel.map((r) => ({
      ...r,
      billPhoto: "",
      legacyMissingBill: true,
    })),
    transactions: old.transactions.map((r) => ({
      ...r,
      area: "",
      legacyAreaMissing: r.material === "Steel" && r.type === "Consumed",
    })),
    storeItems: [],
    storeUsage: [],
    workActivities: [],
    workLogs: [],
    accountCategories: [],
    accounts: [],
    issues: [],
    concrete: [],
  };
}

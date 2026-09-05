import { Database } from "./models";
export const projectCollections = [
  "machines",
  "diesel",
  "employees",
  "attendance",
  "labour",
  "transactions",
  "storeItems",
  "storeUsage",
  "workActivities",
  "workLogs",
  "accountCategories",
  "accounts",
  "issues",
  "concrete",
] as const;
export function validateOperations(db: Database) {
  const sameProject = (
    rows: { id: string; projectId: string }[],
    id: string,
    projectId: string,
  ) => rows.some((r) => r.id === id && r.projectId === projectId);
  const unique = (keys: string[], message: string) => {
    if (new Set(keys).size !== keys.length) throw new Error(message);
  };
  unique(
    db.storeUsage.map((r) => `${r.projectId}:${r.storeItemId}:${r.date}`),
    "Store usage already exists for this item and date. Edit the existing record.",
  );
  unique(
    db.accounts.map((r) => `${r.projectId}:${r.entryNumber}`),
    "Account entry numbers must be unique within each project.",
  );
  for (const key of ["accountCategories", "workActivities"] as const)
    unique(
      db[key].map((r) => `${r.projectId}:${r.name.toLowerCase()}`),
      "This configuration name already exists in the project.",
    );
  for (const r of db.storeUsage) {
    if (!sameProject(db.storeItems, r.storeItemId, r.projectId))
      throw new Error("Store item must belong to the selected project.");
    const item = db.storeItems.find((i) => i.id === r.storeItemId)!;
    if (r.used === "Yes" && item.totalQuantity === 0)
      throw new Error("This item has no owned inventory available.");
    if (r.quantity !== null && r.quantity > item.totalQuantity)
      throw new Error(
        `Only ${item.totalQuantity} ${item.unit} of ${item.name} are owned. Usage cannot exceed inventory, and inventory cannot be reduced below recorded usage.`,
      );
  }
  for (const r of db.workLogs)
    if (!sameProject(db.workActivities, r.activityId, r.projectId))
      throw new Error("Work activity must belong to the selected project.");
  for (const r of db.accounts)
    if (!sameProject(db.accountCategories, r.categoryId, r.projectId))
      throw new Error("Account category must belong to the selected project.");
  for (const r of db.issues) {
    if (r.machineId && !sameProject(db.machines, r.machineId, r.projectId))
      throw new Error("Related machine must belong to this project.");
    if (
      r.storeItemId &&
      !sameProject(db.storeItems, r.storeItemId, r.projectId)
    )
      throw new Error("Related store item must belong to this project.");
  }
}

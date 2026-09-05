import { Collection } from "./models";
export type TestingRole = "Super Admin" | "Employee";
export const masterCollections: Collection[] = [
  "companies",
  "projects",
  "machines",
  "employees",
  "storeItems",
  "workActivities",
  "accountCategories",
];
export const canConfigure = (role: TestingRole) => role === "Super Admin";
export function canWrite(role: TestingRole, collection: Collection) {
  return canConfigure(role) || !masterCollections.includes(collection);
}

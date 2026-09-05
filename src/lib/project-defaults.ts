import { Database } from "./models";
import { initialAccountCategories } from "./operations-models";
import { newId } from "./id";
export function addProjectDefaults(db: Database, projectId: string) {
  const stamp = new Date().toISOString();
  const base = () => ({
    id: newId(),
    projectId,
    createdAt: stamp,
    updatedAt: stamp,
    status: "Active" as const,
  });
  for (const name of ["Earthwork", "Blasting"])
    if (
      !db.workActivities.some(
        (r) => r.projectId === projectId && r.name === name,
      )
    )
      db.workActivities.push({
        ...base(),
        name,
        defaultUnit: name === "Earthwork" ? "m³" : "",
      });
  for (const name of initialAccountCategories)
    if (
      !db.accountCategories.some(
        (r) => r.projectId === projectId && r.name === name,
      )
    )
      db.accountCategories.push({ ...base(), name });
}

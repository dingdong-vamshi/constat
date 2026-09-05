import {
  Collection,
  Database,
  RecordFor,
  databaseSchema,
  emptyDatabase,
} from "./models";
import { inventory } from "./statistics";

export interface StorageAdapter {
  read(): string | null;
  write(value: string): void;
}
export const STORAGE_KEY = "constat.database.v1";
export class BrowserStorage implements StorageAdapter {
  constructor(private key = STORAGE_KEY) {}
  read() {
    return localStorage.getItem(this.key);
  }
  write(value: string) {
    localStorage.setItem(this.key, value);
  }
}
export function validateDatabase(input: unknown): Database {
  const db = databaseSchema.parse(input);
  const unique = (values: string[], message: string) => {
    if (new Set(values).size !== values.length) throw new Error(message);
  };
  for (const key of Object.keys(db).filter(
    (k) => k !== "version",
  ) as Collection[])
    unique(
      db[key].map((r) => r.id),
      "Duplicate record IDs are not allowed.",
    );
  const companies = new Set(db.companies.map((r) => r.id));
  const projects = new Set(db.projects.map((r) => r.id));
  for (const p of db.projects)
    if (!companies.has(p.companyId))
      throw new Error("Project company does not exist.");
  for (const key of [
    "machines",
    "diesel",
    "employees",
    "attendance",
    "labour",
    "transactions",
  ] as const)
    for (const r of db[key])
      if (!projects.has(r.projectId))
        throw new Error("Record project does not exist.");
  for (const r of db.diesel)
    if (
      !db.machines.some(
        (m) => m.id === r.machineId && m.projectId === r.projectId,
      )
    )
      throw new Error("Choose a machine belonging to this project.");
  for (const r of db.attendance)
    if (
      !db.employees.some(
        (e) => e.id === r.employeeId && e.projectId === r.projectId,
      )
    )
      throw new Error("Attendance employee must belong to this project.");
  unique(
    db.labour.map((r) => `${r.projectId}:${r.date}`),
    "Labour attendance already exists for this date. Edit the existing record.",
  );
  unique(
    db.attendance.map((r) => `${r.projectId}:${r.employeeId}:${r.date}`),
    "Attendance already exists for this employee and date.",
  );
  for (const p of db.projects)
    for (const row of inventory(db, p.id))
      if (row.available < -0.000001)
        throw new Error(
          `Only ${Math.max(0, row.received)} received for ${row.material}. This change would leave stock below zero. Reduce consumption or add a receipt first.`,
        );
  return db;
}
export class Repository {
  private db: Database = emptyDatabase();
  private listeners = new Set<() => void>();
  constructor(private storage: StorageAdapter) {}
  getSnapshot = () => this.db;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
  hydrate() {
    const raw = this.storage.read();
    if (raw) this.db = validateDatabase(JSON.parse(raw));
    this.emit();
    return !!raw;
  }
  reload() {
    const raw = this.storage.read();
    this.db = raw ? validateDatabase(JSON.parse(raw)) : emptyDatabase();
    this.emit();
  }
  replace(input: unknown) {
    const next = validateDatabase(input);
    try {
      this.storage.write(JSON.stringify(next));
    } catch {
      throw new Error(
        "Browser storage is full or unavailable. Export a backup, remove unused photos, or try a smaller photo. Your existing records have not changed.",
      );
    }
    this.db = next;
    this.emit();
  }
  save<K extends Collection>(collection: K, record: RecordFor<K>) {
    const next = structuredClone(this.db);
    const rows = next[collection] as RecordFor<K>[];
    const index = rows.findIndex((r) => r.id === record.id);
    if (index === -1) rows.push(record);
    else rows[index] = record;
    this.replace(next);
  }
  remove(collection: Collection, id: string) {
    const next = structuredClone(this.db);
    if (
      collection === "machines" &&
      next.diesel.some((r) => r.machineId === id)
    )
      throw new Error(
        "This machine has diesel entries. Delete its diesel entries before deleting the machine.",
      );
    if (collection === "employees")
      next.attendance = next.attendance.filter((r) => r.employeeId !== id);
    if (collection === "companies" || collection === "projects") {
      const projectIds = new Set(
        next.projects
          .filter((r) =>
            collection === "companies" ? r.companyId === id : r.id === id,
          )
          .map((r) => r.id),
      );
      next.projects = next.projects.filter((r) => !projectIds.has(r.id));
      const removeProjectRecords = <
        K extends
          | "machines"
          | "diesel"
          | "employees"
          | "attendance"
          | "labour"
          | "transactions",
      >(
        key: K,
      ) => {
        next[key] = next[key].filter(
          (r) => !projectIds.has(r.projectId),
        ) as Database[K];
      };
      for (const key of [
        "machines",
        "diesel",
        "employees",
        "attendance",
        "labour",
        "transactions",
      ] as const)
        removeProjectRecords(key);
    }
    // Assign through a generic helper to preserve each collection's record type.
    const filter = <K extends Collection>(key: K) => {
      next[key] = next[key].filter((r) => r.id !== id) as Database[K];
    };
    filter(collection);
    this.replace(next);
  }
  saveAttendance(
    projectId: string,
    date: string,
    entries: {
      employeeId: string;
      status: "Present" | "Absent";
      notes: string;
    }[],
  ) {
    const next = structuredClone(this.db);
    const stamp = new Date().toISOString();
    for (const entry of entries) {
      const old = next.attendance.find(
        (r) =>
          r.projectId === projectId &&
          r.date === date &&
          r.employeeId === entry.employeeId,
      );
      const record = {
        ...entry,
        projectId,
        date,
        id: old?.id ?? crypto.randomUUID(),
        createdAt: old?.createdAt ?? stamp,
        updatedAt: stamp,
      };
      next.attendance = next.attendance.filter((r) => r.id !== record.id);
      next.attendance.push(record);
    }
    this.replace(next);
  }
}

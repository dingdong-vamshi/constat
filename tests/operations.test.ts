import { describe, it, expect } from "vitest";
import {
  Repository,
  validateDatabase,
  StorageAdapter,
} from "../src/lib/repository";
import { createSeed } from "../src/lib/seed";
import { operationsStatistics } from "../src/lib/operations-statistics";
import { today } from "../src/lib/format";
const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=";
class Memory implements StorageAdapter {
  value: string | null = null;
  read() {
    return this.value;
  }
  write(v: string) {
    this.value = v;
  }
}
function setup() {
  const storage = new Memory(),
    repo = new Repository(storage);
  repo.replace(createSeed(photo));
  return { repo, storage, db: repo.getSnapshot() };
}
describe("Extended V1 operations", () => {
  it("migrates old backups without inventing diesel bills or steel areas", () => {
    const db = createSeed(photo);
    const old = {
      version: 1,
      companies: db.companies,
      projects: db.projects,
      machines: db.machines,
      employees: db.employees,
      attendance: db.attendance,
      labour: db.labour,
      diesel: db.diesel.map((r) => ({
        ...r,
        billPhoto: undefined,
        legacyMissingBill: undefined,
      })),
      transactions: db.transactions.map((r) => ({
        ...r,
        area: undefined,
        legacyAreaMissing: undefined,
      })),
    };
    const result = validateDatabase(old);
    expect(result.version).toBe(2);
    expect(result.diesel[0].billPhoto).toBe("");
    expect(result.diesel[0].legacyMissingBill).toBe(true);
    expect(
      result.transactions.find(
        (r) => r.material === "Steel" && r.type === "Consumed",
      )?.legacyAreaMissing,
    ).toBe(true);
    expect(result.storeItems).toEqual([]);
    expect(result.diesel).toHaveLength(db.diesel.length);
  });
  it("requires a diesel bill and steel area on new records", () => {
    const { repo, db } = setup();
    expect(() =>
      repo.save("diesel", { ...db.diesel[0], id: "new", billPhoto: "" }),
    ).toThrow(/bill/);
    const consumed = db.transactions.find(
      (r) => r.material === "Steel" && r.type === "Consumed",
    )!;
    expect(() =>
      repo.save("transactions", { ...consumed, id: "new", area: "" }),
    ).toThrow(/area/);
  });
  it("keeps store ownership unchanged and prevents duplicate or excess usage", () => {
    const { repo, db } = setup();
    repo.replace({ ...db, storeUsage: [] });
    const entry = {
      ...db.storeUsage[0],
      id: "test",
      date: today(),
      quantity: 2,
    };
    repo.setRole("Employee");
    repo.save("storeUsage", entry);
    expect(repo.getSnapshot().storeItems[0].totalQuantity).toBe(3);
    expect(() =>
      repo.save("storeUsage", { ...entry, id: "duplicate" }),
    ).toThrow(/already exists/);
    expect(() => repo.save("storeUsage", { ...entry, quantity: 4 })).toThrow(
      /Only 3/,
    );
    expect(() =>
      repo.save("storeUsage", { ...entry, used: "No", quantity: 2 }),
    ).toThrow();
    expect(() =>
      repo.save("storeItems", { ...db.storeItems[0], totalQuantity: 2 }),
    ).toThrow(/Super Admin/);
    expect(() => repo.replace(db)).toThrow(/Super Admin/);
    repo.setRole("Super Admin");
    expect(() => repo.remove("storeItems", entry.storeItemId)).toThrow(
      /history/,
    );
  });
  it("calculates concrete areas and monthly totals after edits and deletes", () => {
    const { repo, db } = setup();
    repo.replace({ ...db, concrete: [] });
    const row = {
      ...db.concrete[0],
      id: "test",
      date: today(),
      quantity: 30,
      area: "Structural" as const,
    };
    repo.save("concrete", row);
    expect(
      operationsStatistics(
        repo.getSnapshot(),
        "project-demo",
        today(),
        today(),
      ).areas.find((r) => r.area === "Structural")?.concrete,
    ).toBe(30);
    repo.save("concrete", { ...row, quantity: 20 });
    expect(
      operationsStatistics(repo.getSnapshot(), "project-demo", today(), today())
        .monthlyConcrete,
    ).toBe(20);
    repo.remove("concrete", row.id);
    expect(
      operationsStatistics(repo.getSnapshot(), "project-demo", today(), today())
        .concrete,
    ).toBe(0);
  });
  it("keeps work quantities separate by unit and allows unmeasured work", () => {
    const { repo, db } = setup();
    repo.replace({ ...db, workLogs: [] });
    const row = { ...db.workLogs[0], date: today(), quantity: 250 };
    repo.save("workLogs", row);
    repo.save("workLogs", {
      ...row,
      id: "unmeasured",
      quantity: null,
      unit: "",
    });
    repo.save("workLogs", {
      ...row,
      id: "other-unit",
      quantity: 10,
      unit: "m²",
    });
    const s = operationsStatistics(
      repo.getSnapshot(),
      "project-demo",
      today(),
      today(),
    );
    expect(s.activities).toBe(3);
    expect(s.workQuantities).toEqual(
      expect.arrayContaining([
        { label: "Earthwork (m³)", quantity: 250 },
        { label: "Earthwork (m²)", quantity: 10 },
      ]),
    );
    expect(() => repo.remove("workActivities", row.activityId)).toThrow(
      /work entries/,
    );
  });
  it("assigns account numbers, preserves them on edits, and never reuses deleted numbers", () => {
    const { repo, db } = setup();
    repo.replace({ ...db, accounts: [] });
    const row = { ...db.accounts[1], id: "new", entryNumber: "MANUAL" };
    repo.save("accounts", row);
    expect(repo.getSnapshot().accounts[0].entryNumber).toBe("SITE-0003");
    repo.save("accounts", {
      ...repo.getSnapshot().accounts[0],
      entryNumber: "ALTERED",
      amount: 8000,
    });
    expect(repo.getSnapshot().accounts[0].entryNumber).toBe("SITE-0003");
    expect(
      operationsStatistics(repo.getSnapshot(), "project-demo", today(), today())
        .expenses,
    ).toBe(8000);
    repo.remove("accounts", "new");
    repo.save("accounts", { ...row, id: "next" });
    expect(repo.getSnapshot().accounts[0].entryNumber).toBe("SITE-0004");
  });
  it("updates open/high/resolved counts and resolves/reopens with correct dates", () => {
    const { repo, db } = setup();
    const row = db.issues[0];
    repo.save("issues", {
      ...row,
      status: "Resolved",
      resolutionNotes: "Hydraulic hose replaced.",
    });
    let s = operationsStatistics(
      repo.getSnapshot(),
      "project-demo",
      today(),
      today(),
    );
    expect(s.open).toBe(0);
    expect(s.high).toBe(0);
    expect(s.resolved).toBe(1);
    expect(repo.getSnapshot().issues[0].resolvedDate).toBe(today());
    repo.save("issues", { ...repo.getSnapshot().issues[0], status: "Open" });
    s = operationsStatistics(
      repo.getSnapshot(),
      "project-demo",
      today(),
      today(),
    );
    expect(s.open).toBe(1);
    expect(repo.getSnapshot().issues[0].resolvedDate).toBe("");
  });
  it("validates all new cross-project references and cascades project data", () => {
    const { repo, db } = setup();
    repo.save("projects", { ...db.projects[0], id: "other" });
    expect(() =>
      repo.save("workLogs", {
        ...db.workLogs[0],
        id: "wrong",
        projectId: "other",
      }),
    ).toThrow(/activity/);
    expect(() =>
      repo.save("accounts", {
        ...db.accounts[0],
        id: "wrong",
        projectId: "other",
      }),
    ).toThrow(/category/);
    expect(() =>
      repo.save("issues", { ...db.issues[0], id: "wrong", projectId: "other" }),
    ).toThrow(/machine/);
    expect(() =>
      repo.save("storeUsage", {
        ...db.storeUsage[0],
        id: "wrong",
        projectId: "other",
      }),
    ).toThrow(/Store item/);
    const s = operationsStatistics(
      repo.getSnapshot(),
      "other",
      today(),
      today(),
    );
    expect(s.expenses + s.concrete + s.activities + s.used + s.open).toBe(0);
    repo.remove("projects", "project-demo");
    expect(repo.getSnapshot().accounts).toEqual([]);
    expect(repo.getSnapshot().storeItems).toEqual([]);
    expect(repo.getSnapshot().issues).toEqual([]);
  });
  it("round-trips all new entities and pictures through JSON and refresh", () => {
    const { repo, storage, db } = setup();
    const restored = new Repository(storage);
    restored.hydrate();
    expect(restored.getSnapshot()).toEqual(db);
    repo.replace(JSON.parse(JSON.stringify(db)));
    expect(repo.getSnapshot()).toEqual(db);
  });
});

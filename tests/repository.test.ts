import { describe, expect, it } from "vitest";
import {
  Repository,
  StorageAdapter,
  validateDatabase,
} from "../src/lib/repository";
import { createSeed } from "../src/lib/seed";
import { emptyDatabase, MaterialTransaction } from "../src/lib/models";
import { inventory, statistics } from "../src/lib/statistics";
import { shiftDay, today, displayDate } from "../src/lib/format";
const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=";
class MemoryStorage implements StorageAdapter {
  value: string | null = null;
  fail = false;
  read() {
    return this.value;
  }
  write(v: string) {
    if (this.fail) throw new Error("QuotaExceededError");
    this.value = v;
  }
}
function setup() {
  const storage = new MemoryStorage();
  const repo = new Repository(storage);
  repo.replace(createSeed(photo));
  return { repo, storage };
}
describe("Repository and derived statistics", () => {
  it("persists an 80 L fill at ₹95 and calculates ₹7,600", () => {
    const { repo, storage } = setup();
    const db = repo.getSnapshot();
    repo.replace({ ...db, diesel: [] });
    const row = {
      ...db.diesel[0],
      id: "test",
      date: today(),
      litres: 80,
      costPerLitre: 95,
      meterReading: 1245,
    };
    repo.save("diesel", row);
    const restored = new Repository(storage);
    restored.hydrate();
    const s = statistics(
      restored.getSnapshot(),
      "project-demo",
      today(),
      today(),
    );
    expect(s.litres).toBe(80);
    expect(s.cost).toBe(7600);
    expect(s.byMachine[0].cost).toBe(7600);
    expect(s.trend[0].cost).toBe(7600);
  });
  it("calculates 4 present, 2 absent, 66.67%, and workforce 67", () => {
    const { repo } = setup();
    const s = statistics(repo.getSnapshot(), "project-demo", today(), today());
    expect(s.present).toBe(4);
    expect(s.absent).toBe(2);
    expect(s.percentage).toBeCloseTo(66.6667, 3);
    expect(s.workforce).toBe(67);
  });
  it("recalculates inventory for create, edit, and delete and rejects negative stock", () => {
    const { repo } = setup();
    const db = repo.getSnapshot();
    repo.replace({ ...db, transactions: [] });
    const base = db.transactions[0];
    repo.save("transactions", { ...base, quantity: 20 });
    const consumed: MaterialTransaction = {
      ...base,
      id: "consumed",
      type: "Consumed",
      area: "Foundation",
      quantity: 7,
    };
    repo.save("transactions", consumed);
    expect(inventory(repo.getSnapshot(), "project-demo")[0].available).toBe(13);
    repo.save("transactions", { ...consumed, quantity: 5 });
    expect(inventory(repo.getSnapshot(), "project-demo")[0].available).toBe(15);
    expect(() => repo.remove("transactions", base.id)).toThrow(/below zero/);
    expect(() => repo.save("transactions", { ...base, quantity: 4 })).toThrow(
      /below zero/,
    );
    repo.remove("transactions", "consumed");
    expect(inventory(repo.getSnapshot(), "project-demo")[0].available).toBe(20);
    expect(() =>
      repo.save("transactions", { ...consumed, quantity: 25 }),
    ).toThrow();
  });
  it("rejects duplicate labour dates and bulk attendance upserts without duplicates", () => {
    const { repo } = setup();
    const db = repo.getSnapshot();
    expect(() =>
      repo.save("labour", { ...db.labour[0], id: "duplicate" }),
    ).toThrow(/already exists/);
    const entries = db.employees.map((e) => ({
      employeeId: e.id,
      status: "Present" as const,
      notes: "",
    }));
    repo.saveAttendance("project-demo", today(), entries);
    repo.saveAttendance("project-demo", today(), entries);
    expect(
      repo.getSnapshot().attendance.filter((r) => r.date === today()),
    ).toHaveLength(6);
  });
  it("keeps existing records and snapshot unchanged if storage quota is exceeded", () => {
    const { repo, storage } = setup();
    const before = repo.getSnapshot();
    storage.fail = true;
    expect(() => repo.remove("diesel", before.diesel[0].id)).toThrow(
      /storage is full/,
    );
    expect(repo.getSnapshot()).toBe(before);
  });
  it("validates imports and project references", () => {
    const db = createSeed(photo);
    expect(() => validateDatabase({ ...db, version: 9 })).toThrow();
    expect(() =>
      validateDatabase({
        ...db,
        diesel: [{ ...db.diesel[0], projectId: "wrong" }],
      }),
    ).toThrow(/project/);
    expect(() => validateDatabase({ ...db, companies: [] })).toThrow();
  });
  it("isolates projects and cascades company deletion safely", () => {
    const { repo } = setup();
    const db = repo.getSnapshot();
    repo.save("projects", { ...db.projects[0], id: "other" });
    expect(statistics(repo.getSnapshot(), "other", today(), today()).cost).toBe(
      0,
    );
    expect(
      inventory(repo.getSnapshot(), "other").every((r) => r.available === 0),
    ).toBe(true);
    expect(() => repo.remove("machines", "machine-1")).toThrow(
      /diesel entries/,
    );
    repo.remove("companies", "company-demo");
    expect(repo.getSnapshot()).toEqual(emptyDatabase());
  });
  it("handles large record histories", () => {
    const { repo } = setup();
    const db = repo.getSnapshot();
    repo.replace({
      ...db,
      diesel: Array.from({ length: 3000 }, (_, i) => ({
        ...db.diesel[0],
        id: `bulk-${i}`,
        date: today(),
        litres: 1,
      })),
    });
    expect(
      statistics(repo.getSnapshot(), "project-demo", today(), today()).litres,
    ).toBe(3000);
  });
  it("preserves calendar dates at month and year boundaries", () => {
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDay("2024-02-28", 1)).toBe("2024-02-29");
    expect(displayDate("2026-09-05")).toContain("5");
  });
});

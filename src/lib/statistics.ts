import { Database, materials } from "./models";
import { inRange, shiftDay } from "./format";
export function inventory(
  db: Database,
  projectId: string,
  through = "9999-12-31",
) {
  return materials.map((material) => {
    const rows = db.transactions.filter(
      (r) =>
        r.projectId === projectId &&
        r.material === material &&
        r.date <= through,
    );
    const received = rows
      .filter((r) => r.type === "Received")
      .reduce((n, r) => n + r.quantity, 0);
    const consumed = rows
      .filter((r) => r.type === "Consumed")
      .reduce((n, r) => n + r.quantity, 0);
    return {
      material,
      received,
      consumed,
      available: Math.round((received - consumed) * 1e6) / 1e6,
    };
  });
}
export function statistics(
  db: Database,
  projectId: string,
  from: string,
  to: string,
) {
  const diesel = db.diesel.filter(
    (r) => r.projectId === projectId && inRange(r.date, from, to),
  );
  const attendance = db.attendance.filter(
    (r) => r.projectId === projectId && inRange(r.date, from, to),
  );
  const labour = db.labour.filter(
    (r) => r.projectId === projectId && inRange(r.date, from, to),
  );
  const litres = diesel.reduce((s, r) => s + r.litres, 0),
    cost = diesel.reduce((s, r) => s + r.litres * r.costPerLitre, 0);
  const present = attendance.filter((r) => r.status === "Present").length,
    absent = attendance.filter((r) => r.status === "Absent").length,
    labourers = labour.reduce((s, r) => s + r.count, 0);
  const buckets = new Map<
    string,
    {
      date: string;
      litres: number;
      cost: number;
      present: number;
      absent: number;
      labour: number;
      workforce: number;
    }
  >();
  const get = (date: string) => {
    if (!buckets.has(date))
      buckets.set(date, {
        date,
        litres: 0,
        cost: 0,
        present: 0,
        absent: 0,
        labour: 0,
        workforce: 0,
      });
    return buckets.get(date)!;
  };
  // Pad normal ranges without creating unbounded arrays for long histories.
  if (from && to) {
    let d = from;
    for (let i = 0; d <= to && i < 366; i++, d = shiftDay(d, 1)) get(d);
  }
  diesel.forEach((r) => {
    const b = get(r.date);
    b.litres += r.litres;
    b.cost += r.litres * r.costPerLitre;
  });
  attendance.forEach((r) => {
    const b = get(r.date);
    if (r.status === "Present") {
      b.present++;
      b.workforce++;
    } else b.absent++;
  });
  labour.forEach((r) => {
    const b = get(r.date);
    b.labour += r.count;
    b.workforce += r.count;
  });
  const byMachine = db.machines
    .filter((r) => r.projectId === projectId)
    .map((m) => ({
      name: m.name,
      litres: diesel
        .filter((r) => r.machineId === m.id)
        .reduce((s, r) => s + r.litres, 0),
      cost: diesel
        .filter((r) => r.machineId === m.id)
        .reduce((s, r) => s + r.litres * r.costPerLitre, 0),
    }));
  return {
    litres,
    cost,
    average: litres ? cost / litres : 0,
    present,
    absent,
    labourers,
    workforce: present + labourers,
    percentage: present + absent ? (present / (present + absent)) * 100 : 0,
    employees: db.employees.filter((r) => r.projectId === projectId).length,
    trend: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)),
    byMachine,
  };
}

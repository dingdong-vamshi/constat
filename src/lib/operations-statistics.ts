import { Database, consumptionAreas } from "./models";
import { inRange, today } from "./format";
export function operationsStatistics(
  db: Database,
  projectId: string,
  from: string,
  to: string,
) {
  const scoped = <T extends { projectId: string; date: string }>(rows: T[]) =>
    rows.filter((r) => r.projectId === projectId && inRange(r.date, from, to));
  const accounts = scoped(db.accounts),
    work = scoped(db.workLogs),
    usage = scoped(db.storeUsage),
    issues = scoped(db.issues),
    concrete = scoped(db.concrete);
  const steel = scoped(db.transactions).filter(
    (r) => r.material === "Steel" && r.type === "Consumed",
  );
  const expenses = accounts
      .filter((r) => r.type === "Expense")
      .reduce((n, r) => n + r.amount, 0),
    receipts = accounts
      .filter((r) => r.type === "Receipt")
      .reduce((n, r) => n + r.amount, 0);
  const month = today().slice(0, 7);
  const monthlyAccounts = db.accounts.filter(
    (r) => r.projectId === projectId && r.date.startsWith(month),
  );
  const issueInventory = db.issues.filter((r) => r.projectId === projectId);
  const areas = consumptionAreas.map((area) => ({
    area,
    steel: steel
      .filter((r) => r.area === area)
      .reduce((n, r) => n + r.quantity, 0),
    concrete: concrete
      .filter((r) => r.area === area)
      .reduce((n, r) => n + r.quantity, 0),
  }));
  const unclassifiedSteel = steel
    .filter((r) => !r.area)
    .reduce((n, r) => n + r.quantity, 0);
  const workQuantities = new Map<string, number>();
  for (const row of work) {
    if (row.quantity === null) continue;
    const name =
      db.workActivities.find((a) => a.id === row.activityId)?.name ??
      "Activity";
    const key = `${name} (${row.unit})`;
    workQuantities.set(key, (workQuantities.get(key) ?? 0) + row.quantity);
  }
  const equipment = db.storeItems
    .filter((r) => r.projectId === projectId)
    .map((item) => ({
      id: item.id,
      name: item.name + (item.specification ? ` · ${item.specification}` : ""),
      days: usage.filter((r) => r.storeItemId === item.id && r.used === "Yes")
        .length,
    }))
    .sort((a, b) => b.days - a.days);
  const days = [
    ...new Set([...accounts, ...work, ...usage].map((r) => r.date)),
  ].sort();
  return {
    expenses,
    receipts,
    net: receipts - expenses,
    monthlyExpenses: monthlyAccounts
      .filter((r) => r.type === "Expense")
      .reduce((n, r) => n + r.amount, 0),
    monthlyReceipts: monthlyAccounts
      .filter((r) => r.type === "Receipt")
      .reduce((n, r) => n + r.amount, 0),
    activities: work.length,
    completed: work.filter((r) => r.status === "Completed").length,
    ongoing: work.filter((r) => r.status === "Ongoing").length,
    workQuantities: [...workQuantities].map(([label, quantity]) => ({
      label,
      quantity,
    })),
    recentWork: work
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4),
    used: usage.filter((r) => r.used === "Yes").length,
    notUsed: usage.filter((r) => r.used === "No").length,
    storeItems: db.storeItems.filter((r) => r.projectId === projectId).length,
    equipment,
    open: issueInventory.filter((r) => r.status === "Open").length,
    inProgress: issueInventory.filter((r) => r.status === "In Progress").length,
    critical: issueInventory.filter(
      (r) => r.severity === "Critical" && r.status !== "Resolved",
    ).length,
    high: issueInventory.filter(
      (r) => r.severity === "High" && r.status !== "Resolved",
    ).length,
    raised: issues.length,
    resolved: issueInventory.filter(
      (r) =>
        r.status === "Resolved" &&
        inRange(r.resolvedDate || r.updatedAt.slice(0, 10), from, to),
    ).length,
    recentIssues: issues
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4),
    steel: steel.reduce((n, r) => n + r.quantity, 0),
    concrete: concrete.reduce((n, r) => n + r.quantity, 0),
    monthlyConcrete: db.concrete
      .filter((r) => r.projectId === projectId && r.date.startsWith(month))
      .reduce((n, r) => n + r.quantity, 0),
    areas,
    unclassifiedSteel,
    trend: days.map((date) => ({
      date,
      expenses: accounts
        .filter((r) => r.date === date && r.type === "Expense")
        .reduce((n, r) => n + r.amount, 0),
      activities: work.filter((r) => r.date === date).length,
      usage: usage.filter((r) => r.date === date && r.used === "Yes").length,
    })),
  };
}

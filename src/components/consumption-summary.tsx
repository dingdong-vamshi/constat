"use client";
import { useStore } from "./store";
import { operationsStatistics } from "@/lib/operations-statistics";
import { inventory } from "@/lib/statistics";
import { number } from "@/lib/format";
import { Stat } from "./ui";
import { OperationChart } from "./operation-charts";
export function ConsumptionSummary({
  projectId,
  from,
  to,
  area,
}: {
  projectId: string;
  from: string;
  to: string;
  area: string;
}) {
  const { db } = useStore();
  const s = operationsStatistics(
    {
      ...db,
      transactions: db.transactions.filter((r) => !area || r.area === area),
    },
    projectId,
    from,
    to,
  );
  const stock =
    inventory(db, projectId).find((r) => r.material === "Steel")?.available ??
    0;
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label="Steel consumed"
          value={`${number(s.steel)} tonnes`}
          detail="Selected period / area"
        />
        <Stat
          label="Steel available"
          value={`${number(stock)} tonnes`}
          detail="All material transactions"
        />
        {s.areas
          .filter((r) => !area || r.area === area)
          .map((r) => (
            <Stat
              key={r.area}
              label={r.area}
              value={`${number(r.steel)} tonnes`}
            />
          ))}
      </div>
      {s.unclassifiedSteel > 0 && (
        <p className="info-note">
          {number(s.unclassifiedSteel)} tonnes from older records have no
          consumption area. Edit those records to classify them.
        </p>
      )}
      <OperationChart
        title="Steel consumption by area"
        data={s.areas}
        nameKey="area"
        dataKey="steel"
        unit="tonnes"
        dateAxis={false}
      />
    </>
  );
}

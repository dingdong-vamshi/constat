"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { operationsStatistics } from "@/lib/operations-statistics";
import { number, money } from "@/lib/format";
import { useStore } from "./store";
import { Stat, Badge } from "./ui";
import { OperationChart } from "./operation-charts";
export function OperationsOverview({
  projectId,
  from,
  to,
}: {
  projectId: string;
  from: string;
  to: string;
}) {
  const { db } = useStore();
  const s = operationsStatistics(db, projectId, from, to);
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="operations-overview">
      <div className="section-heading">
        <h2>Site operations</h2>
        <span className="muted">Selected period unless noted</span>
      </div>
      <div className="stats-grid dashboard-stats">
        <Stat
          label="Equipment usage"
          value={s.used}
          detail={
            from === to ? "Items marked used" : "Equipment-days marked used"
          }
        />
        <Stat
          label="Work activities"
          value={s.activities}
          detail={`${s.completed} completed · ${s.ongoing} ongoing`}
        />
        <Stat
          label="Site expenses"
          value={money(s.expenses)}
          detail={`${money(s.net)} net cash movement`}
        />
        <Stat
          label="Open site issues"
          value={s.open}
          detail={`Current · ${s.high} high / ${s.critical} critical unresolved`}
        />
        <Stat
          label="Steel consumed"
          value={`${number(s.steel)} tonnes`}
          detail="Included in steel inventory"
        />
        <Stat
          label="Concrete consumed"
          value={`${number(s.concrete)} m³`}
          detail={`${number(s.monthlyConcrete)} m³ this month`}
        />
      </div>
      <button
        className="overview-expand"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        Consumption breakdown & recent activity <ChevronDown size={16} />
      </button>
      {expanded && (
        <>
          <div className="charts-grid">
            <OperationChart
              title="Steel by consumption area"
              data={s.areas}
              dataKey="steel"
              nameKey="area"
              dateAxis={false}
              unit="tonnes"
            />
            <OperationChart
              title="Concrete by consumption area"
              data={s.areas}
              dataKey="concrete"
              nameKey="area"
              dateAxis={false}
              unit="m³"
            />
          </div>
          {s.unclassifiedSteel > 0 && (
            <p className="hint">
              Unclassified legacy steel consumption:{" "}
              {number(s.unclassifiedSteel)} tonnes. Complete its area in
              Material Log.
            </p>
          )}
          <div className="charts-grid">
            <div className="panel breakdown-list">
              <h2>Recent work</h2>
              {s.recentWork.length ? (
                s.recentWork.map((r) => (
                  <p key={r.id}>
                    <Link href="/work">{r.description}</Link>
                    <Badge>{r.status}</Badge>
                  </p>
                ))
              ) : (
                <p>No work in this period.</p>
              )}
              {s.workQuantities.map((r) => (
                <p key={r.label}>
                  <span>{r.label}</span>
                  <strong>{number(r.quantity)}</strong>
                </p>
              ))}
            </div>
            <div className="panel breakdown-list">
              <h2>Recent issues</h2>
              <p>
                {s.raised} raised · {s.resolved} resolved in selected period
              </p>
              {s.recentIssues.map((r) => (
                <p key={r.id}>
                  <Link href="/issues">{r.title}</Link>
                  <Badge>{r.status}</Badge>
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

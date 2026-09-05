"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Fuel,
  IndianRupee,
  Users,
  HardHat,
  UserCheck,
  UserX,
  Plus,
  Package,
} from "lucide-react";
import { OperationsOverview } from "./operations-overview";
import { useStore } from "./store";
import { inventory, statistics } from "@/lib/statistics";
import { displayDate, money, number, shortDate, today } from "@/lib/format";
import { units } from "@/lib/models";
import { DateRange } from "./filters";
import { Badge, PageHeading, Stat } from "./ui";
export function InventoryPage({ projectId }: { projectId: string }) {
  const { db } = useStore();
  return (
    <>
      <PageHeading
        title="Inventory"
        description="Current stock, calculated from every receipt and consumption record."
        action={
          <Link className="btn btn-primary" href="/materials">
            <Plus size={16} />
            Add transaction
          </Link>
        }
      />
      <Inventory projectId={projectId} />
      <div className="info-note">
        <Package size={18} />
        <p>
          Stock = total received − total consumed. Update stock by adding or
          editing transactions in the Material Log. Quantities in different
          units are never combined.
        </p>
      </div>
      <p className="hint">
        {db.transactions.filter((r) => r.projectId === projectId).length}{" "}
        material transactions in this project.
      </p>
    </>
  );
}
function Inventory({ projectId }: { projectId: string }) {
  const { db } = useStore();
  const rows = inventory(db, projectId);
  return (
    <div className="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Received</th>
            <th>Consumed</th>
            <th>Available</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.material}>
              <td>
                <strong>{r.material}</strong>
              </td>
              <td>{number(r.received)}</td>
              <td>{number(r.consumed)}</td>
              <td>
                <strong>{number(r.available)}</strong>
              </td>
              <td className="muted">{units[r.material]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Dashboard({ projectId }: { projectId: string }) {
  const { db } = useStore();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [dieselMode, setDieselMode] = useState("litres");
  const [workforceMode, setWorkforceMode] = useState("workforce");
  const s = useMemo(
    () => statistics(db, projectId, from, to),
    [db, projectId, from, to],
  );
  const stock = useMemo(() => inventory(db, projectId), [db, projectId]);
  const multi = from !== to;
  const project = db.projects.find((p) => p.id === projectId);
  const daily = multi
    ? "Person-days in selected period"
    : "People on selected day";
  return (
    <>
      <PageHeading
        title="Site overview"
        description={`A clear picture of your site, all in one place.`}
        action={
          <div className="overview-date">
            {displayDate(today())}
            <Badge>{project?.status ?? "Active"}</Badge>
          </div>
        }
      />
      <div className="dashboard-toolbar">
        <div className="period-label">
          <span className="live-dot" />
          {from === today() && to === today()
            ? "Today’s activity"
            : "Selected period"}
          <span className="muted">· {project?.siteName}</span>
        </div>
        <DateRange
          compact
          from={from}
          to={to}
          onChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
        />
      </div>
      {from > to && (
        <p className="error-message">
          The start date must be before the end date.
        </p>
      )}
      <div className="stats-grid dashboard-stats">
        <Stat
          label="Diesel filled"
          value={
            <>
              {number(s.litres)} <em>L</em>
            </>
          }
          detail="Filled into site machinery"
          icon={<Fuel size={17} />}
        />
        <Stat
          label="Diesel cost"
          value={money(s.cost)}
          detail={`${money(s.average)} average / L`}
          icon={<IndianRupee size={17} />}
        />
        <Stat
          label={multi ? "Technical present days" : "Technical present"}
          value={number(s.present)}
          detail={`${number(s.percentage)}% attendance · ${s.employees} employees`}
          icon={<UserCheck size={17} />}
        />
        <Stat
          label={multi ? "Technical absent days" : "Technical absent"}
          value={number(s.absent)}
          detail="Based on saved attendance"
          icon={<UserX size={17} />}
        />
        <Stat
          label={multi ? "Labour person-days" : "Labourers present"}
          value={number(s.labourers)}
          detail={daily}
          icon={<HardHat size={17} />}
        />
        <Stat
          label={multi ? "Workforce person-days" : "Total workforce"}
          value={number(s.workforce)}
          detail="Technical present + labour"
          icon={<Users size={17} />}
        />
      </div>
      <div className="section-heading">
        <h2>Materials at a glance</h2>
        <Link href="/inventory">
          View inventory <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="stats-grid four stock-stats">
        {stock.map((r) => (
          <Stat
            key={r.material}
            label={r.material}
            value={
              <>
                {number(r.available)} <em>{units[r.material]}</em>
              </>
            }
            detail="Current stock · all dates"
          />
        ))}
      </div>
      <div className="charts-grid">
        <div className="panel chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Diesel trend</h2>
              <p>
                {dieselMode === "cost"
                  ? "Refuelling cost in rupees"
                  : "Diesel filled in litres"}
              </p>
            </div>
            <select
              aria-label="Diesel chart metric"
              value={dieselMode}
              onChange={(e) => setDieselMode(e.target.value)}
            >
              <option value="litres">Filled (L)</option>
              <option value="cost">Cost (₹)</option>
            </select>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={s.trend}
                margin={{ top: 15, right: 14, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#eeeeee"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  minTickGap={24}
                />
                <YAxis axisLine={false} tickLine={false} fontSize={11} />
                <Tooltip
                  labelFormatter={(v) => displayDate(String(v))}
                  formatter={(v) =>
                    dieselMode === "cost"
                      ? money(Number(v))
                      : `${number(Number(v))} L`
                  }
                />
                <Area
                  isAnimationActive={false}
                  name={dieselMode === "cost" ? "Diesel cost" : "Diesel filled"}
                  type="monotone"
                  dataKey={dieselMode}
                  stroke="#111"
                  strokeWidth={2}
                  fill="#eeeeee"
                  dot={{ r: 3, fill: "#111" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Workforce trend</h2>
              <p>Daily attendance on site</p>
            </div>
            <select
              aria-label="Workforce chart metric"
              value={workforceMode}
              onChange={(e) => setWorkforceMode(e.target.value)}
            >
              <option value="workforce">Workforce</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={s.trend}
                margin={{ top: 15, right: 14, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#eee"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  minTickGap={24}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip labelFormatter={(v) => displayDate(String(v))} />
                <Bar
                  isAnimationActive={false}
                  dataKey="present"
                  name="Technical present"
                  fill="#222"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey={workforceMode === "technical" ? "absent" : "labour"}
                  name={
                    workforceMode === "technical"
                      ? "Technical absent"
                      : "Labourers"
                  }
                  fill="#c7c7c7"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span>
              <i />
              Technical present
            </span>
            <span>
              <i />
              {workforceMode === "technical" ? "Technical absent" : "Labourers"}
            </span>
          </div>
        </div>
      </div>
      <div className="section-heading">
        <h2>Material inventory</h2>
        <Link href="/materials">
          Open material log <ArrowUpRight size={15} />
        </Link>
      </div>
      <Inventory projectId={projectId} />
      <OperationsOverview projectId={projectId} from={from} to={to} />
      <div className="quick-actions">
        <span>Quick entry</span>
        <Link href="/diesel">
          Diesel log <ArrowUpRight size={15} />
        </Link>
        <Link href="/attendance">
          Mark attendance <ArrowUpRight size={15} />
        </Link>
        <Link href="/labour">
          Labour headcount <ArrowUpRight size={15} />
        </Link>
        <Link href="/materials">
          Material log <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}

"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { shortDate } from "@/lib/format";
export function OperationChart({
  title,
  data,
  dataKey,
  nameKey = "date",
  unit = "",
  dateAxis = true,
}: {
  title: string;
  data: object[];
  dataKey: string;
  nameKey?: string;
  unit?: string;
  dateAxis?: boolean;
}) {
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 15, left: 0, bottom: 15 }}
          >
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis
              dataKey={nameKey}
              tickFormatter={dateAxis ? shortDate : undefined}
              tick={{ fontSize: 10 }}
              interval={dateAxis ? "preserveStartEnd" : 0}
              minTickGap={24}
            />
            <YAxis tick={{ fontSize: 10 }} width={45} allowDecimals={!!unit} />
            <Tooltip formatter={(v) => `${v} ${unit}`} />
            <Bar
              dataKey={dataKey}
              name={unit || title}
              fill="#333"
              radius={[3, 3, 0, 0]}
              maxBarSize={45}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { today, shiftDay } from "@/lib/format";
export function DateRange({
  from,
  to,
  onChange,
  compact = false,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  compact?: boolean;
}) {
  const [custom, setCustom] = useState(false);
  const now = today();
  const preset =
    to === now && from === now
      ? "Today"
      : to === now && from === shiftDay(now, -6)
        ? "7 days"
        : to === now && from === shiftDay(now, -29)
          ? "30 days"
          : !from && !to
            ? "All time"
            : "Custom";
  return (
    <div className="date-filter">
      <select
        aria-label="Date range"
        value={custom ? "Custom" : preset}
        onChange={(e) => {
          const v = e.target.value;
          setCustom(v === "Custom");
          onChange(
            v === "Today"
              ? now
              : v === "7 days"
                ? shiftDay(now, -6)
                : v === "30 days"
                  ? shiftDay(now, -29)
                  : v === "All time"
                    ? ""
                    : from || now,
            v === "All time" ? "" : now,
          );
        }}
      >
        {[
          "Today",
          "7 days",
          "30 days",
          ...(!compact ? ["All time"] : []),
          "Custom",
        ].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
      <label className="date-input-label">
        From
        <input
          aria-label="From date"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => {
            setCustom(true);
            onChange(e.target.value, to);
          }}
        />
      </label>
      <span className="date-separator">—</span>
      <label className="date-input-label">
        To
        <input
          aria-label="To date"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => {
            setCustom(true);
            onChange(from, e.target.value);
          }}
        />
      </label>
    </div>
  );
}

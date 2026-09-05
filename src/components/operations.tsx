"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { RecordFor } from "@/lib/models";
import { fields } from "./form-fields";
import { inRange, today, number, money, displayDate } from "@/lib/format";
import { operationsStatistics } from "@/lib/operations-statistics";
import { canWrite } from "@/lib/permissions";
import { useStore } from "./store";
import {
  Button,
  Confirm,
  Modal,
  PageHeading,
  SearchInput,
  Stat,
  Table,
} from "./ui";
import { DateRange } from "./filters";
import { RecordForm } from "./record-form";
import { RowActions } from "./records";
import {
  OperationKind,
  OperationRecord,
  operationTitles,
  operationColumns,
  relationName,
} from "./operation-config";
import { OperationChart } from "./operation-charts";
export function OperationsModule({
  module,
  projectId,
  companyId,
}: {
  module: "stores" | "work" | "accounts" | "issues" | "concrete";
  projectId: string;
  companyId: string;
}) {
  const tabs: { key: OperationKind; label: string }[] =
    module === "stores"
      ? [
          { key: "storeUsage", label: "Daily usage" },
          { key: "storeItems", label: "Inventory" },
        ]
      : module === "work"
        ? [
            { key: "workLogs", label: "Work log" },
            { key: "workActivities", label: "Activity types" },
          ]
        : module === "accounts"
          ? [
              { key: "accounts", label: "Entries" },
              { key: "accountCategories", label: "Categories" },
            ]
          : [{ key: module, label: module }];
  const [tab, setTab] = useState<OperationKind>(tabs[0].key);
  return (
    <>
      {tabs.length > 1 && (
        <div
          className="module-tabs"
          role="tablist"
          aria-label={`${module} sections`}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? "selected" : ""}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <OperationsPage
        key={tab}
        kind={tab}
        projectId={projectId}
        companyId={companyId}
      />
    </>
  );
}
function OperationsPage({
  kind,
  projectId,
  companyId,
}: {
  kind: OperationKind;
  projectId: string;
  companyId: string;
}) {
  const { db, repo, role } = useStore();
  const [search, setSearch] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<OperationRecord | "new" | null>(null),
    [view, setView] = useState<OperationRecord | null>(null),
    [deleting, setDeleting] = useState<OperationRecord | null>(null),
    [photo, setPhoto] = useState("");
  const master = ["storeItems", "workActivities", "accountCategories"].includes(
    kind,
  );
  const writable = canWrite(role, kind);
  const [title, description, singular] = operationTitles[kind];
  const all = db[kind].filter(
    (r) => r.projectId === projectId,
  ) as OperationRecord[];
  const value = (row: OperationRecord, key: string) =>
    String((row as unknown as Record<string, unknown>)[key] ?? "");
  const rows = all
    .filter((r) => !("date" in r) || inRange(r.date, from, to))
    .filter((r) =>
      Object.entries(filter).every(([k, v]) => !v || value(r, k) === v),
    )
    .filter(
      (r) =>
        !search ||
        Object.entries(r)
          .filter(([k]) => !["photo", "projectId", "id"].includes(k))
          .some(([k, v]) =>
            (k.endsWith("Id") ? relationName(db, k, String(v)) : String(v))
              .toLowerCase()
              .includes(search.toLowerCase()),
          ),
    )
    .sort(
      (a, b) =>
        value(b, "date").localeCompare(value(a, "date")) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const filteredDb = { ...db, [kind]: rows };
  const s = operationsStatistics(filteredDb, projectId, from, to);
  const nowStats = operationsStatistics(db, projectId, today(), today());
  const filterKeys =
    kind === "storeUsage"
      ? ["storeItemId", "used"]
      : kind === "workLogs"
        ? ["activityId", "status"]
        : kind === "accounts"
          ? ["type", "categoryId", "paymentMode"]
          : kind === "issues"
            ? ["type", "severity", "status"]
            : kind === "concrete"
              ? ["area"]
              : ["status"];
  const columns = operationColumns(kind, db, setPhoto);
  columns.push({
    title: "Actions",
    render: (r) => (
      <RowActions
        onView={() => setView(r)}
        onEdit={writable ? () => setEditing(r) : undefined}
        onDelete={writable ? () => setDeleting(r) : undefined}
      />
    ),
  });
  function initialize() {
    try {
      repo.initializeProjectMasters(projectId);
      toast.success("Default activities and account categories are ready.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Unable to configure defaults.",
      );
    }
  }
  return (
    <>
      <PageHeading
        title={title}
        description={description}
        action={
          writable && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} />
              Add {singular}
            </Button>
          )
        }
      />
      {master && !writable && (
        <p className="info-note">
          Employee view: inventory and configuration are read-only. Use the
          daily entry tab to record site activity.
        </p>
      )}
      {!all.length &&
        writable &&
        ["workActivities", "accountCategories"].includes(kind) && (
          <div className="info-note">
            <Button variant="secondary" onClick={initialize}>
              Load default types & categories
            </Button>
            <p>You can also create custom entries.</p>
          </div>
        )}
      {kind === "storeUsage" && (
        <div className="stats-grid four">
          <Stat
            label="Store items"
            value={s.storeItems}
            detail="Owned inventory · all items"
          />
          <Stat
            label="Used today"
            value={nowStats.used}
            detail="Equipment marked Yes today"
          />
          <Stat
            label="Not used today"
            value={nowStats.notUsed}
            detail="Explicitly marked No today"
          />
          <Stat
            label="Usage records"
            value={rows.length}
            detail="Matching filters"
          />
        </div>
      )}
      {kind === "workLogs" && (
        <div className="stats-grid three">
          <Stat
            label="Activities"
            value={s.activities}
            detail="Matching filters"
          />
          <Stat label="Completed" value={s.completed} />
          <Stat label="Ongoing" value={s.ongoing} />
        </div>
      )}
      {kind === "accounts" && (
        <>
          <div className="stats-grid three">
            <Stat
              label="Expenses"
              value={money(s.expenses)}
              detail="Matching filters"
            />
            <Stat
              label="Receipts"
              value={money(s.receipts)}
              detail="Matching filters"
            />
            <Stat
              label="Net cash movement"
              value={money(s.net)}
              detail="Receipts − expenses"
            />
          </div>
          <p className="period-summary">
            Today: expenses {money(nowStats.expenses)} · receipts{" "}
            {money(nowStats.receipts)}. This month: expenses{" "}
            {money(nowStats.monthlyExpenses)} · receipts{" "}
            {money(nowStats.monthlyReceipts)}.
          </p>
        </>
      )}
      {kind === "issues" && (
        <div className="stats-grid four">
          <Stat label="Open issues" value={s.open} detail="Matching filters" />
          <Stat label="Critical unresolved" value={s.critical} />
          <Stat label="High unresolved" value={s.high} />
          <Stat
            label="Resolved issues"
            value={
              rows.filter((r) => "status" in r && r.status === "Resolved")
                .length
            }
          />
        </div>
      )}
      {kind === "concrete" && (
        <div className="stats-grid three">
          <Stat
            label="Concrete consumed"
            value={`${number(s.concrete)} m³`}
            detail="Matching filters"
          />
          <Stat
            label="Concrete today"
            value={`${number(nowStats.concrete)} m³`}
          />
          <Stat
            label="Concrete this month"
            value={`${number(nowStats.monthlyConcrete)} m³`}
          />
        </div>
      )}
      <div className="filters">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${title.toLowerCase()}…`}
        />
        {filterKeys.map((key) => {
          const f = fields[kind]?.find((f) => f.key === key);
          const options = f?.options ?? [
            ...new Set(all.map((r) => value(r, key)).filter(Boolean)),
          ];
          return (
            <select
              key={key}
              aria-label={`Filter ${f?.label ?? key}`}
              value={filter[key] ?? ""}
              onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}
            >
              <option value="">All {f?.label.toLowerCase() ?? key}</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {key.endsWith("Id") ? relationName(db, key, o) : o}
                </option>
              ))}
            </select>
          );
        })}
        {!master && (
          <DateRange
            from={from}
            to={to}
            onChange={(a, b) => {
              setFrom(a);
              setTo(b);
            }}
          />
        )}
      </div>
      {from && to && from > to && (
        <p className="error-message">
          The start date must be before the end date.
        </p>
      )}
      <Table
        key={`${search}-${from}-${to}-${JSON.stringify(filter)}`}
        rows={rows}
        columns={columns}
        empty={`No ${title.toLowerCase()} records found.`}
        action={
          writable && (
            <Button onClick={() => setEditing("new")}>Add {singular}</Button>
          )
        }
      />
      {kind === "concrete" && (
        <div className="charts-grid">
          <OperationChart
            title="Concrete by consumption area"
            data={s.areas}
            nameKey="area"
            dataKey="concrete"
            unit="m³"
            dateAxis={false}
          />
          <div className="panel breakdown-list">
            <h2>Consumption breakdown</h2>
            {s.areas.map((r) => (
              <p key={r.area}>
                <span>{r.area}</span>
                <strong>{number(r.concrete)} m³</strong>
              </p>
            ))}
          </div>
        </div>
      )}
      {kind === "workLogs" && (
        <div className="charts-grid">
          <OperationChart
            title="Work activities by date"
            data={s.trend}
            dataKey="activities"
          />
          <div className="panel breakdown-list">
            <h2>Work quantities</h2>
            {s.workQuantities.length ? (
              s.workQuantities.map((r) => (
                <p key={r.label}>
                  <span>{r.label}</span>
                  <strong>{number(r.quantity)}</strong>
                </p>
              ))
            ) : (
              <p>No measured work in this period.</p>
            )}
          </div>
        </div>
      )}
      {kind === "accounts" && (
        <div className="charts-grid">
          <OperationChart
            title="Daily site expenses"
            data={s.trend}
            dataKey="expenses"
            unit="₹"
          />
        </div>
      )}
      {kind === "storeUsage" && (
        <div className="charts-grid">
          <OperationChart
            title="Equipment usage by date"
            data={s.trend}
            dataKey="usage"
          />
          <div className="panel breakdown-list">
            <h2>Most used equipment</h2>
            {s.equipment.slice(0, 5).map((r) => (
              <p key={r.id}>
                <span>{r.name}</span>
                <strong>{r.days} days</strong>
              </p>
            ))}
            <small>
              Matching filters. Unmarked days are not counted as No.
            </small>
          </div>
        </div>
      )}
      {editing && (
        <RecordForm
          collection={kind}
          record={
            editing === "new" ? undefined : (editing as RecordFor<typeof kind>)
          }
          projectId={projectId}
          companyId={companyId}
          title={`${editing === "new" ? "Add" : "Edit"} ${singular}`}
          onClose={() => setEditing(null)}
        />
      )}
      {view && (
        <Modal
          open
          onClose={() => setView(null)}
          title={`${singular} details`}
          description="Saved details for this project."
        >
          <dl className="details">
            {"entryNumber" in view && (
              <div>
                <dt>Entry number</dt>
                <dd>{view.entryNumber}</dd>
              </div>
            )}
            {fields[kind]?.map((f) => {
              const v = value(view, f.key);
              if (f.type === "photo")
                return v ? (
                  <div key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>
                      <img className="large-photo" src={v} alt={f.label} />
                    </dd>
                  </div>
                ) : null;
              return (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.key.endsWith("Id")
                      ? relationName(db, f.key, v)
                      : f.type === "date" && v
                        ? displayDate(v)
                        : v || "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Modal>
      )}
      {photo && (
        <Modal
          open
          onClose={() => setPhoto("")}
          title="Photo preview"
          description="Saved attachment."
        >
          <img className="large-photo" src={photo} alt="Record attachment" />
        </Modal>
      )}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${singular.toLowerCase()}?`}
        description="This permanently removes the record and recalculates statistics. Referenced inventory and configuration cannot be deleted."
        onConfirm={() => {
          try {
            repo.remove(kind, deleting!.id);
            setDeleting(null);
            toast.success("Record deleted.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not delete.");
          }
        }}
      />
    </>
  );
}

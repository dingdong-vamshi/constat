"use client";
import { useState } from "react";
import { Pencil, Trash2, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  consumptionAreas,
  Collection,
  Database,
  Machine,
  DieselLog,
  TechnicalEmployee,
  LabourAttendance,
  MaterialTransaction,
  machineTypes,
  materials,
  units,
} from "@/lib/models";
import { displayDate, inRange, money, number } from "@/lib/format";
import { useStore } from "./store";
import {
  Badge,
  Button,
  Confirm,
  Modal,
  PageHeading,
  SearchInput,
  Stat,
  Table,
} from "./ui";
import { RecordForm } from "./record-form";
import { canWrite } from "@/lib/permissions";
import { ConsumptionSummary } from "./consumption-summary";
import { DateRange } from "./filters";
type Kind = "machines" | "diesel" | "employees" | "labour" | "transactions";
type Row =
  | Machine
  | DieselLog
  | TechnicalEmployee
  | LabourAttendance
  | MaterialTransaction;
const titles: Record<Kind, [string, string, string]> = {
  machines: [
    "Machinery",
    "Manage the machines working on this site.",
    "Machine",
  ],
  diesel: [
    "Diesel Log",
    "Track diesel filled into site machinery.",
    "Diesel Entry",
  ],
  employees: [
    "Technical Employees",
    "Manage your site’s technical and company employees.",
    "Employee",
  ],
  labour: [
    "Labour Attendance",
    "Record the daily number of labourers on site.",
    "Labour Attendance",
  ],
  transactions: [
    "Material Log",
    "Record materials received and consumed on site.",
    "Material Transaction",
  ],
};
export function RowActions({
  onView,
  onEdit,
  onDelete,
  disabled = false,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="row-actions">
      {onView && (
        <button
          className="icon-button"
          title="View record"
          aria-label="View record"
          onClick={onView}
        >
          <Eye size={16} />
        </button>
      )}
      {onEdit && (
        <button
          disabled={disabled}
          className="icon-button"
          title="Edit record"
          aria-label="Edit record"
          onClick={onEdit}
        >
          <Pencil size={16} />
        </button>
      )}
      {onDelete && (
        <button
          disabled={disabled}
          className="icon-button delete-button"
          title="Delete record"
          aria-label="Delete record"
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
export function RecordDetails({
  row,
  onClose,
  db,
}: {
  row: Row;
  onClose: () => void;
  db: Database;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Record details"
      description="Saved details for this project."
    >
      <dl className="details">
        {Object.entries(row)
          .filter(
            ([k]) =>
              ![
                "id",
                "projectId",
                "photo",
                "billPhoto",
                "legacyMissingBill",
                "legacyAreaMissing",
              ].includes(k),
          )
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
              <dd>
                {k === "machineId"
                  ? db.machines.find((m) => m.id === v)?.name
                  : k === "date"
                    ? displayDate(String(v))
                    : k.endsWith("At")
                      ? new Date(String(v)).toLocaleString("en-IN")
                      : String(v) || "—"}
              </dd>
            </div>
          ))}
        {"litres" in row && (
          <div>
            <dt>Total cost</dt>
            <dd>{money(row.litres * row.costPerLitre)}</dd>
          </div>
        )}
        {"material" in row && (
          <div>
            <dt>Unit</dt>
            <dd>{units[row.material]}</dd>
          </div>
        )}
      </dl>
      {"billPhoto" in row &&
        (row.billPhoto ? (
          <>
            <h2>Diesel bill</h2>
            <img
              className="large-photo"
              src={row.billPhoto}
              alt="Diesel bill"
            />
          </>
        ) : (
          <p className="hint">Bill missing on this older record.</p>
        ))}
      {"photo" in row && (
        <img className="large-photo" src={row.photo} alt="Saved meter photo" />
      )}
    </Modal>
  );
}
export function RecordsPage({
  kind,
  projectId,
  companyId,
  steelOnly = false,
}: {
  kind: Kind;
  projectId: string;
  companyId: string;
  steelOnly?: boolean;
}) {
  const { db, repo, role } = useStore();
  const writable = canWrite(role, kind);
  const [area, setArea] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [machine, setMachine] = useState("");
  const [type, setType] = useState("");
  const [material, setMaterial] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);
  const [photo, setPhoto] = useState("");
  const [title, description, singular] = steelOnly
    ? [
        "Steel Consumption",
        "Track where steel is consumed. Entries share the main material inventory.",
        "Steel Consumption",
      ]
    : titles[kind];
  const add = () => setEditing("new");
  const machineFor = (id: string) => db.machines.find((m) => m.id === id);
  const rows = (db[kind] as Row[])
    .filter((r) => r.projectId === projectId)
    .filter(
      (r) =>
        !steelOnly ||
        ("material" in r && r.material === "Steel" && r.type === "Consumed"),
    )
    .filter((r) => !area || ("area" in r && r.area === area))
    .filter((r) => !("date" in r) || inRange(r.date, from, to))
    .filter(
      (r) =>
        !search ||
        Object.entries(r)
          .filter(
            ([k]) =>
              ![
                "photo",
                "billPhoto",
                "projectId",
                "createdAt",
                "updatedAt",
                "id",
              ].includes(k),
          )
          .some(([, v]) =>
            String(v).toLowerCase().includes(search.toLowerCase()),
          ) ||
        ("machineId" in r &&
          machineFor(r.machineId)
            ?.name.toLowerCase()
            .includes(search.toLowerCase())),
    )
    .filter((r) => !machine || ("machineId" in r && r.machineId === machine))
    .filter(
      (r) =>
        !type ||
        ("type" in r && r.type === type) ||
        ("machineId" in r && machineFor(r.machineId)?.type === type),
    )
    .filter((r) => !material || ("material" in r && r.material === material))
    .sort((a, b) =>
      ("date" in b ? b.date : b.createdAt).localeCompare(
        "date" in a ? a.date : a.createdAt,
      ),
    );
  const actions = (r: Row) => (
    <RowActions
      onView={() => setView(r)}
      onEdit={writable ? () => setEditing(r) : undefined}
      onDelete={writable ? () => setDeleting(r) : undefined}
    />
  );
  const columns: { title: string; render: (r: Row) => React.ReactNode }[] =
    kind === "machines"
      ? [
          {
            title: "Machine",
            render: (r) => <strong>{(r as Machine).name}</strong>,
          },
          { title: "Type", render: (r) => (r as Machine).type },
          {
            title: "Identification",
            render: (r) => (r as Machine).identification || "—",
          },
          {
            title: "Status",
            render: (r) => <Badge>{(r as Machine).status}</Badge>,
          },
        ]
      : kind === "employees"
        ? [
            {
              title: "Name",
              render: (r) => <strong>{(r as TechnicalEmployee).name}</strong>,
            },
            {
              title: "Designation",
              render: (r) => (r as TechnicalEmployee).designation,
            },
            {
              title: "Employee code",
              render: (r) => (r as TechnicalEmployee).code || "—",
            },
            {
              title: "Status",
              render: (r) => <Badge>{(r as TechnicalEmployee).status}</Badge>,
            },
          ]
        : kind === "labour"
          ? [
              {
                title: "Date",
                render: (r) => displayDate((r as LabourAttendance).date),
              },
              {
                title: "Labourers present",
                render: (r) => (
                  <strong>{number((r as LabourAttendance).count, 0)}</strong>
                ),
              },
              {
                title: "Notes",
                render: (r) => (
                  <span className="truncate-note">
                    {(r as LabourAttendance).notes || "—"}
                  </span>
                ),
              },
            ]
          : kind === "diesel"
            ? [
                {
                  title: "Date",
                  render: (r) => displayDate((r as DieselLog).date),
                },
                {
                  title: "Machine / type",
                  render: (r) => (
                    <div>
                      <strong>
                        {machineFor((r as DieselLog).machineId)?.name}
                      </strong>
                      <small className="cell-sub">
                        {machineFor((r as DieselLog).machineId)?.type}
                      </small>
                    </div>
                  ),
                },
                {
                  title: "Diesel filled",
                  render: (r) => `${number((r as DieselLog).litres)} L`,
                },
                {
                  title: "₹ / L",
                  render: (r) => money((r as DieselLog).costPerLitre),
                },
                {
                  title: "Total cost",
                  render: (r) => (
                    <strong>
                      {money(
                        (r as DieselLog).litres * (r as DieselLog).costPerLitre,
                      )}
                    </strong>
                  ),
                },
                {
                  title: "Meter",
                  render: (r) => number((r as DieselLog).meterReading),
                },
                {
                  title: "Photo",
                  render: (r) => (
                    <button
                      className="photo-button"
                      aria-label="Preview meter photo"
                      onClick={() => setPhoto((r as DieselLog).photo)}
                    >
                      <img src={(r as DieselLog).photo} alt="Meter" />
                    </button>
                  ),
                },
              ]
            : [
                {
                  title: "Date",
                  render: (r) => displayDate((r as MaterialTransaction).date),
                },
                {
                  title: "Material",
                  render: (r) => (
                    <strong>{(r as MaterialTransaction).material}</strong>
                  ),
                },
                {
                  title: "Type",
                  render: (r) => (
                    <Badge>{(r as MaterialTransaction).type}</Badge>
                  ),
                },
                {
                  title: "Quantity",
                  render: (r) => number((r as MaterialTransaction).quantity),
                },
                {
                  title: "Unit",
                  render: (r) => units[(r as MaterialTransaction).material],
                },
                {
                  title: "Supplier",
                  render: (r) => (r as MaterialTransaction).supplier || "—",
                },
                {
                  title: "Reference",
                  render: (r) => (r as MaterialTransaction).reference || "—",
                },
              ];
  if (kind === "diesel")
    columns.push({
      title: "Bill",
      render: (r) =>
        (r as DieselLog).billPhoto ? (
          <button
            className="photo-button"
            aria-label="Preview diesel bill"
            onClick={() => setPhoto((r as DieselLog).billPhoto)}
          >
            <img src={(r as DieselLog).billPhoto} alt="Diesel bill" />
          </button>
        ) : (
          <span className="hint">Missing (legacy)</span>
        ),
    });
  if (kind === "transactions")
    columns.push({
      title: "Consumption area",
      render: (r) =>
        (r as MaterialTransaction).area ||
        ((r as MaterialTransaction).legacyAreaMissing
          ? "Unclassified (legacy)"
          : "—"),
    });
  columns.push({ title: "Actions", render: actions });
  const litres =
      kind === "diesel"
        ? (rows as DieselLog[]).reduce((s, r) => s + r.litres, 0)
        : 0,
    cost =
      kind === "diesel"
        ? (rows as DieselLog[]).reduce(
            (s, r) => s + r.litres * r.costPerLitre,
            0,
          )
        : 0;
  return (
    <>
      <PageHeading
        title={title}
        description={description}
        action={
          <Button onClick={add} disabled={!writable}>
            <Plus size={16} />
            Add {singular}
          </Button>
        }
      />
      {steelOnly && (
        <ConsumptionSummary
          projectId={projectId}
          from={from}
          to={to}
          area={area}
        />
      )}
      {kind === "diesel" && (
        <div className="stats-grid three">
          <Stat
            label="Total diesel filled"
            value={`${number(litres)} L`}
            detail="Matching current filters"
          />
          <Stat
            label="Total diesel cost"
            value={money(cost)}
            detail="Matching current filters"
          />
          <Stat
            label="Average cost / litre"
            value={money(litres ? cost / litres : 0)}
            detail="Weighted by litres filled"
          />
        </div>
      )}
      <div className="filters">
        {steelOnly && (
          <select
            aria-label="Filter consumption area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="">All consumption areas</option>
            {consumptionAreas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        )}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${title.toLowerCase()}…`}
        />
        {kind === "diesel" && (
          <select
            aria-label="Filter machine"
            value={machine}
            onChange={(e) => setMachine(e.target.value)}
          >
            <option value="">All machines</option>
            {db.machines
              .filter((m) => m.projectId === projectId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        )}
        {["diesel", "machines", "transactions"].includes(kind) && (
          <select
            aria-label="Filter type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">
              All {kind === "transactions" ? "transactions" : "machine types"}
            </option>
            {(kind === "transactions"
              ? ["Received", "Consumed"]
              : machineTypes
            ).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
        {kind === "transactions" && !steelOnly && (
          <select
            aria-label="Filter material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            <option value="">All materials</option>
            {materials.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        {["diesel", "labour", "transactions"].includes(kind) && (
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
        key={`${search}-${from}-${to}-${machine}-${type}-${material}`}
        rows={rows}
        columns={columns}
        empty={`No ${title.toLowerCase()} records found.`}
        action={
          <Button variant="secondary" onClick={add} disabled={!writable}>
            Add {singular}
          </Button>
        }
      />
      {kind === "diesel" && rows.length > 0 && (
        <div className="panel machine-breakdown">
          <h2>Diesel by machine</h2>
          <p>Totals for the current filters</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Diesel filled</th>
                  <th>Diesel cost</th>
                </tr>
              </thead>
              <tbody>
                {db.machines
                  .filter((m) => m.projectId === projectId)
                  .map((m) => {
                    const matching = (rows as DieselLog[]).filter(
                      (r) => r.machineId === m.id,
                    );
                    return (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>
                          {number(matching.reduce((s, r) => s + r.litres, 0))} L
                        </td>
                        <td>
                          {money(
                            matching.reduce(
                              (s, r) => s + r.litres * r.costPerLitre,
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && (
        <RecordForm
          defaults={
            steelOnly ? { material: "Steel", type: "Consumed" } : undefined
          }
          collection={kind}
          projectId={projectId}
          companyId={companyId}
          record={editing === "new" ? undefined : editing}
          title={`${editing === "new" ? "Add" : "Edit"} ${singular}`}
          onClose={() => setEditing(null)}
        />
      )}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${singular.toLowerCase()}?`}
        description={
          kind === "employees"
            ? "This also removes this employee’s attendance history. This cannot be undone."
            : "This record will be permanently removed and statistics will recalculate."
        }
        onConfirm={() => {
          try {
            repo.remove(kind as Collection, deleting!.id);
            setDeleting(null);
            toast.success("Record deleted.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed.");
          }
        }}
      />
      {view && (
        <RecordDetails row={view} db={db} onClose={() => setView(null)} />
      )}
      {photo && (
        <Modal
          open
          onClose={() => setPhoto("")}
          title="Meter photo"
          description="Meter reading at the time diesel was filled."
        >
          <img
            className="large-photo"
            src={photo}
            alt="Meter reading at refuelling"
          />
        </Modal>
      )}
    </>
  );
}

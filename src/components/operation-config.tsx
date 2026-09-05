import { Database, RecordFor } from "@/lib/models";
import { displayDate, money, number } from "@/lib/format";
import { Badge } from "./ui";
export type OperationKind =
  | "storeItems"
  | "storeUsage"
  | "workActivities"
  | "workLogs"
  | "accountCategories"
  | "accounts"
  | "issues"
  | "concrete";
export type OperationRecord = RecordFor<OperationKind>;
export const operationTitles: Record<OperationKind, [string, string, string]> =
  {
    storeItems: [
      "Store Inventory",
      "Manage equipment owned by this site. Daily usage never reduces ownership.",
      "Store Item",
    ],
    storeUsage: [
      "Daily Store Usage",
      "Record which reusable equipment was used on site.",
      "Store Usage",
    ],
    workActivities: [
      "Work Activity Types",
      "Configure the kinds of work recorded on this site.",
      "Activity Type",
    ],
    workLogs: [
      "Daily Work",
      "Record the construction work completed or underway on site.",
      "Work Entry",
    ],
    accountCategories: [
      "Account Categories",
      "Manage categories for this project’s receipts and expenses.",
      "Category",
    ],
    accounts: [
      "Site Accounts",
      "Track site receipts and expenses. Entries are separate from diesel and material logs.",
      "Account Entry",
    ],
    issues: [
      "Reports / Issues",
      "Report site problems and keep their resolution up to date.",
      "Site Issue",
    ],
    concrete: [
      "Concrete Consumption",
      "Track concrete poured by area, grade and location in m³.",
      "Concrete Entry",
    ],
  };
export function relationName(db: Database, key: string, value: string) {
  const rows =
    key === "storeItemId"
      ? db.storeItems
      : key === "activityId"
        ? db.workActivities
        : key === "categoryId"
          ? db.accountCategories
          : key === "machineId"
            ? db.machines
            : [];
  const found = rows.find((r) => r.id === value);
  return found
    ? found.name +
        ("specification" in found && found.specification
          ? ` · ${found.specification}`
          : "")
    : value || "—";
}
export function operationColumns(
  kind: OperationKind,
  db: Database,
  preview: (src: string) => void,
) {
  const text = (key: string, row: OperationRecord): string =>
    String((row as unknown as Record<string, unknown>)[key] ?? "");
  const col = (
    title: string,
    key: string,
    format?: (v: string, row: OperationRecord) => React.ReactNode,
  ) => ({
    title,
    render: (r: OperationRecord) =>
      format ? format(text(key, r), r) : text(key, r) || "—",
  });
  const date = col("Date", "date", (v) => displayDate(v));
  const status = col("Status", "status", (v) => <Badge>{v}</Badge>);
  const quantity = col("Quantity", "quantity", (v) =>
    v ? number(Number(v)) : "—",
  );
  const photo = col("Photo", "photo", (v) =>
    v ? (
      <button
        className="photo-button"
        aria-label="Preview photo"
        onClick={() => preview(v)}
      >
        <img src={v} alt="Attachment" />
      </button>
    ) : (
      "—"
    ),
  );
  if (kind === "storeItems")
    return [
      col("Item", "name"),
      col("Specification", "specification"),
      col("Owned", "totalQuantity", (v) => number(Number(v))),
      col("Unit", "unit"),
      status,
    ];
  if (kind === "storeUsage")
    return [
      date,
      col("Item", "storeItemId", (v) => relationName(db, "storeItemId", v)),
      col("Used", "used"),
      col("Quantity used", "quantity", (v, r) =>
        v
          ? `${number(Number(v))} ${db.storeItems.find((i) => i.id === text("storeItemId", r))?.unit ?? ""}`
          : "—",
      ),
      col("Team", "team"),
      col("Area", "workArea"),
    ];
  if (kind === "workActivities")
    return [
      col("Activity", "name"),
      col("Default unit", "defaultUnit"),
      status,
    ];
  if (kind === "accountCategories") return [col("Category", "name"), status];
  if (kind === "workLogs")
    return [
      date,
      col("Activity", "activityId", (v) => relationName(db, "activityId", v)),
      col("Location", "location"),
      quantity,
      col("Unit", "unit"),
      status,
      col("Description", "description", (v) => (
        <span className="truncate-note">{v}</span>
      )),
    ];
  if (kind === "concrete")
    return [
      date,
      col("Concrete", "quantity", (v) => `${number(Number(v))} m³`),
      col("Consumption area", "area"),
      col("Grade", "grade"),
      col("Pour location", "pourLocation"),
    ];
  if (kind === "accounts")
    return [
      col("Entry no.", "entryNumber"),
      date,
      col("Type", "type"),
      col("Category", "categoryId", (v) => relationName(db, "categoryId", v)),
      col("Description", "description", (v) => (
        <span className="truncate-note">{v}</span>
      )),
      col("Amount", "amount", (v) => money(Number(v))),
      col("Payment", "paymentMode"),
      col("Paid to / from", "party"),
      photo,
    ];
  return [
    date,
    col("Issue", "title"),
    col("Type", "type"),
    col("Severity", "severity", (v) => <Badge>{v}</Badge>),
    status,
    col("Location", "location"),
    photo,
  ];
}

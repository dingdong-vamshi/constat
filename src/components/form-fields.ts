import {
  Collection,
  machineTypes,
  materials,
  consumptionAreas,
} from "@/lib/models";
import { activeStatuses } from "@/lib/schema-fields";
import {
  issueTypes,
  severities,
  issueStatuses,
  workStatuses,
  paymentModes,
} from "@/lib/operations-models";
export type FormValues = Record<string, string | number>;
export type Config = {
  key: string;
  label: string;
  type?: "date" | "number" | "textarea" | "photo" | "select" | "time";
  options?: readonly string[];
  optional?: boolean;
  placeholder?: string;
  visible?: (values: Partial<FormValues>) => boolean;
};
export const fields: Partial<Record<Collection, Config[]>> = {
  companies: [
    {
      key: "name",
      label: "Company name",
      placeholder: "e.g. ABC Constructions",
    },
  ],
  projects: [
    { key: "name", label: "Project name" },
    { key: "siteName", label: "Site name" },
    { key: "location", label: "Location" },
    { key: "startDate", label: "Start date", type: "date" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "On Hold", "Completed"],
    },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      optional: true,
    },
  ],
  machines: [
    { key: "name", label: "Machine name", placeholder: "e.g. Excavator 01" },
    {
      key: "type",
      label: "Machine type",
      type: "select",
      options: machineTypes,
    },
    {
      key: "identification",
      label: "Registration / identification",
      optional: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Maintenance", "Inactive"],
    },
  ],
  diesel: [
    { key: "date", label: "Date", type: "date" },
    { key: "machineId", label: "Machine", type: "select" },
    { key: "litres", label: "Diesel filled (L)", type: "number" },
    { key: "costPerLitre", label: "Cost per litre (₹)", type: "number" },
    { key: "meterReading", label: "Meter reading", type: "number" },
    { key: "photo", label: "Meter photo", type: "photo" },
    { key: "billPhoto", label: "Diesel bill photo", type: "photo" },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  employees: [
    { key: "name", label: "Name" },
    {
      key: "designation",
      label: "Designation",
      placeholder: "e.g. Site Engineer",
    },
    { key: "code", label: "Employee code", optional: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive"],
    },
  ],
  labour: [
    { key: "date", label: "Date", type: "date" },
    { key: "count", label: "Labourers present", type: "number" },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  transactions: [
    { key: "material", label: "Material", type: "select", options: materials },
    {
      key: "type",
      label: "Transaction type",
      type: "select",
      options: ["Received", "Consumed"],
    },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "date", label: "Date", type: "date" },
    {
      key: "area",
      label: "Consumption area",
      type: "select",
      options: consumptionAreas,
      visible: (v) => v.material === "Steel" && v.type === "Consumed",
    },
    { key: "supplier", label: "Supplier", optional: true },
    {
      key: "reference",
      label: "Invoice / challan / reference",
      optional: true,
    },
    { key: "vehicle", label: "Vehicle number", optional: true },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  concrete: [
    { key: "date", label: "Date", type: "date" },
    { key: "quantity", label: "Concrete quantity (m³)", type: "number" },
    {
      key: "area",
      label: "Consumption area",
      type: "select",
      options: consumptionAreas,
    },
    {
      key: "grade",
      label: "Concrete grade",
      optional: true,
      placeholder: "e.g. M25",
    },
    {
      key: "pourLocation",
      label: "Pour location / description",
      optional: true,
    },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  storeItems: [
    { key: "name", label: "Item name" },
    { key: "category", label: "Category", optional: true },
    {
      key: "specification",
      label: "Specification",
      optional: true,
      placeholder: "e.g. 3 HP",
    },
    { key: "totalQuantity", label: "Total owned quantity", type: "number" },
    { key: "unit", label: "Unit", placeholder: "e.g. Nos" },
    { key: "status", label: "Status", type: "select", options: activeStatuses },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  storeUsage: [
    { key: "date", label: "Date", type: "date" },
    { key: "storeItemId", label: "Store item", type: "select" },
    {
      key: "used",
      label: "Used today?",
      type: "select",
      options: ["Yes", "No"],
    },
    {
      key: "quantity",
      label: "Quantity used",
      type: "number",
      optional: true,
      visible: (v) => v.used === "Yes",
    },
    {
      key: "team",
      label: "Used by / team",
      optional: true,
      visible: (v) => v.used === "Yes",
    },
    {
      key: "workArea",
      label: "Work area",
      optional: true,
      visible: (v) => v.used === "Yes",
    },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  workActivities: [
    { key: "name", label: "Activity name" },
    { key: "defaultUnit", label: "Default unit", optional: true },
    { key: "status", label: "Status", type: "select", options: activeStatuses },
  ],
  workLogs: [
    { key: "date", label: "Date", type: "date" },
    { key: "activityId", label: "Activity type", type: "select" },
    { key: "location", label: "Location / site area", optional: true },
    { key: "quantity", label: "Quantity", type: "number", optional: true },
    { key: "unit", label: "Unit", optional: true },
    { key: "status", label: "Status", type: "select", options: workStatuses },
    { key: "description", label: "Description", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  accountCategories: [
    { key: "name", label: "Category name" },
    { key: "status", label: "Status", type: "select", options: activeStatuses },
  ],
  accounts: [
    { key: "date", label: "Date", type: "date" },
    {
      key: "type",
      label: "Entry type",
      type: "select",
      options: ["Expense", "Receipt"],
    },
    { key: "categoryId", label: "Category", type: "select" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "amount", label: "Amount (₹)", type: "number" },
    {
      key: "paymentMode",
      label: "Payment mode",
      type: "select",
      options: paymentModes,
    },
    { key: "party", label: "Paid to / received from" },
    { key: "reference", label: "Reference number", optional: true },
    {
      key: "photo",
      label: "Bill / receipt photo",
      type: "photo",
      optional: true,
    },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
  issues: [
    { key: "date", label: "Date", type: "date" },
    { key: "time", label: "Time", type: "time", optional: true },
    { key: "type", label: "Issue type", type: "select", options: issueTypes },
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "severity", label: "Severity", type: "select", options: severities },
    { key: "status", label: "Status", type: "select", options: issueStatuses },
    {
      key: "machineId",
      label: "Related machine",
      type: "select",
      optional: true,
    },
    {
      key: "storeItemId",
      label: "Related store item",
      type: "select",
      optional: true,
    },
    { key: "location", label: "Site location", optional: true },
    { key: "reportedBy", label: "Reported by", optional: true },
    { key: "photo", label: "Issue photo", type: "photo", optional: true },
    {
      key: "resolutionNotes",
      label: "Resolution notes",
      type: "textarea",
      optional: true,
      visible: (v) => v.status === "Resolved",
    },
    {
      key: "resolvedDate",
      label: "Resolved date",
      type: "date",
      optional: true,
      visible: (v) => v.status === "Resolved",
    },
  ],
};

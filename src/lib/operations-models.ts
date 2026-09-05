import { z } from "zod";
import {
  required,
  optional,
  positive,
  optionalQuantity,
  daySchema,
  optionalPhoto,
  projectBase,
  consumptionAreas,
  activeStatuses,
} from "./schema-fields";
export const issueTypes = [
  "Machinery Breakdown",
  "Store Equipment Breakdown",
  "Safety",
  "Quality",
  "Material",
  "Site Condition",
  "Other",
] as const;
export const severities = ["Low", "Medium", "High", "Critical"] as const;
export const issueStatuses = ["Open", "In Progress", "Resolved"] as const;
export const workStatuses = ["Started", "Ongoing", "Completed"] as const;
export const paymentModes = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Other",
] as const;
export const initialAccountCategories = [
  "Diesel",
  "Material Purchase",
  "Labour",
  "Machinery",
  "Maintenance",
  "Transport",
  "Site Expense",
  "Advance",
  "Other",
] as const;
export const storeItemSchema = z.object({
  ...projectBase,
  name: required,
  category: optional,
  specification: optional,
  totalQuantity: z.number().finite().min(0).max(1e9),
  unit: required,
  status: z.enum(activeStatuses),
  notes: optional,
});
export const storeUsageSchema = z
  .object({
    ...projectBase,
    storeItemId: required,
    date: daySchema,
    used: z.enum(["Yes", "No"]),
    quantity: optionalQuantity,
    team: optional,
    workArea: optional,
    notes: optional,
  })
  .superRefine((r, ctx) => {
    if (r.used === "No" && r.quantity !== null)
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Quantity must be empty when equipment was not used.",
      });
  });
export const workActivitySchema = z.object({
  ...projectBase,
  name: required,
  defaultUnit: optional,
  status: z.enum(activeStatuses),
});
export const workLogSchema = z
  .object({
    ...projectBase,
    date: daySchema,
    activityId: required,
    location: optional,
    quantity: optionalQuantity,
    unit: optional,
    description: required,
    status: z.enum(workStatuses),
    notes: optional,
  })
  .superRefine((r, ctx) => {
    if (r.quantity !== null && !r.unit)
      ctx.addIssue({
        code: "custom",
        path: ["unit"],
        message: "Enter a unit for the measured quantity.",
      });
  });
export const accountCategorySchema = z.object({
  ...projectBase,
  name: required,
  status: z.enum(activeStatuses),
});
export const accountSchema = z.object({
  ...projectBase,
  entryNumber: required,
  date: daySchema,
  type: z.enum(["Expense", "Receipt"]),
  categoryId: required,
  description: required,
  amount: positive,
  paymentMode: z.enum(paymentModes),
  party: required,
  reference: optional,
  photo: optionalPhoto,
  notes: optional,
});
export const issueSchema = z
  .object({
    ...projectBase,
    date: daySchema,
    time: z
      .union([
        z.literal(""),
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time."),
      ])
      .default(""),
    type: z.enum(issueTypes),
    title: required,
    description: required,
    severity: z.enum(severities),
    status: z.enum(issueStatuses),
    machineId: optional,
    storeItemId: optional,
    location: optional,
    reportedBy: optional,
    photo: optionalPhoto,
    resolutionNotes: optional,
    resolvedDate: z.union([z.literal(""), daySchema]).default(""),
  })
  .superRefine((r, ctx) => {
    if (r.resolvedDate && r.resolvedDate < r.date)
      ctx.addIssue({
        code: "custom",
        path: ["resolvedDate"],
        message: "Resolution date cannot be before the issue date.",
      });
    if (r.status !== "Resolved" && r.resolvedDate)
      ctx.addIssue({
        code: "custom",
        path: ["resolvedDate"],
        message: "Only resolved issues can have a resolution date.",
      });
  });
export const concreteSchema = z.object({
  ...projectBase,
  date: daySchema,
  quantity: positive,
  area: z.enum(consumptionAreas),
  grade: optional,
  pourLocation: optional,
  notes: optional,
});
export type StoreItem = z.infer<typeof storeItemSchema>;
export type StoreUsage = z.infer<typeof storeUsageSchema>;
export type WorkActivity = z.infer<typeof workActivitySchema>;
export type WorkLog = z.infer<typeof workLogSchema>;
export type AccountEntry = z.infer<typeof accountSchema>;
export type SiteIssue = z.infer<typeof issueSchema>;
export type ConcreteConsumption = z.infer<typeof concreteSchema>;

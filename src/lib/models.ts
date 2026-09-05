import { z } from "zod";
export const machineTypes = ["Excavator", "Concrete Mixer", "Tractor"] as const;
export const materials = [
  "Steel",
  "Cement",
  "Coarse Aggregate",
  "Fine Aggregate",
] as const;
export const units: Record<MaterialType, string> = {
  Steel: "tonnes",
  Cement: "bags",
  "Coarse Aggregate": "m³",
  "Fine Aggregate": "m³",
};
export type MaterialType = (typeof materials)[number];
import {
  required,
  optional,
  positive,
  base,
  projectBase,
  daySchema,
  photoSchema,
  optionalPhoto,
  consumptionAreas,
} from "./schema-fields";
import {
  storeItemSchema,
  storeUsageSchema,
  workActivitySchema,
  workLogSchema,
  accountCategorySchema,
  accountSchema,
  issueSchema,
  concreteSchema,
} from "./operations-models";
export { daySchema, photoSchema, consumptionAreas } from "./schema-fields";
export const companySchema = z.object({ ...base, name: required });
export const projectSchema = z.object({
  ...base,
  companyId: required,
  nextAccountNumber: z.number().int().positive().default(1),
  name: required,
  siteName: required,
  location: required,
  description: optional,
  startDate: daySchema,
  status: z.enum(["Active", "On Hold", "Completed"]),
});
export const machineSchema = z.object({
  ...projectBase,
  name: required,
  type: z.enum(machineTypes),
  identification: optional,
  status: z.enum(["Active", "Maintenance", "Inactive"]),
});
export const dieselSchema = z
  .object({
    ...projectBase,
    machineId: required,
    date: daySchema,
    litres: positive,
    costPerLitre: positive,
    meterReading: z.number().finite().min(0).max(1e12),
    photo: photoSchema,
    billPhoto: optionalPhoto,
    legacyMissingBill: z.boolean().default(false),
    notes: optional,
  })
  .superRefine((r, ctx) => {
    if (!r.billPhoto && !r.legacyMissingBill)
      ctx.addIssue({
        code: "custom",
        path: ["billPhoto"],
        message: "Upload the diesel bill photo.",
      });
  });
export const employeeSchema = z.object({
  ...projectBase,
  name: required,
  designation: required,
  code: optional,
  status: z.enum(["Active", "Inactive"]),
});
export const attendanceSchema = z.object({
  ...projectBase,
  employeeId: required,
  date: daySchema,
  status: z.enum(["Present", "Absent"]),
  notes: optional,
});
export const labourSchema = z.object({
  ...projectBase,
  date: daySchema,
  count: z.number().int("Enter a whole number.").min(0).max(100000),
  notes: optional,
});
export const materialSchema = z
  .object({
    ...projectBase,
    material: z.enum(materials),
    type: z.enum(["Received", "Consumed"]),
    quantity: positive,
    date: daySchema,
    supplier: optional,
    reference: optional,
    vehicle: optional,
    area: z.union([z.literal(""), z.enum(consumptionAreas)]).default(""),
    legacyAreaMissing: z.boolean().default(false),
    notes: optional,
  })
  .superRefine((r, ctx) => {
    if (
      r.material === "Steel" &&
      r.type === "Consumed" &&
      !r.area &&
      !r.legacyAreaMissing
    )
      ctx.addIssue({
        code: "custom",
        path: ["area"],
        message: "Select the steel consumption area.",
      });
    if ((r.material !== "Steel" || r.type !== "Consumed") && r.area)
      ctx.addIssue({
        code: "custom",
        path: ["area"],
        message: "Consumption area only applies to steel consumed.",
      });
  });
export const databaseSchema = z.object({
  version: z.literal(2),
  companies: z.array(companySchema),
  projects: z.array(projectSchema),
  machines: z.array(machineSchema),
  diesel: z.array(dieselSchema),
  employees: z.array(employeeSchema),
  attendance: z.array(attendanceSchema),
  labour: z.array(labourSchema),
  transactions: z.array(materialSchema),
  storeItems: z.array(storeItemSchema),
  storeUsage: z.array(storeUsageSchema),
  workActivities: z.array(workActivitySchema),
  workLogs: z.array(workLogSchema),
  accountCategories: z.array(accountCategorySchema),
  accounts: z.array(accountSchema),
  issues: z.array(issueSchema),
  concrete: z.array(concreteSchema),
});
export type Database = z.infer<typeof databaseSchema>;
export type Company = z.infer<typeof companySchema>;
export type Project = z.infer<typeof projectSchema>;
export type Machine = z.infer<typeof machineSchema>;
export type DieselLog = z.infer<typeof dieselSchema>;
export type TechnicalEmployee = z.infer<typeof employeeSchema>;
export type TechnicalAttendance = z.infer<typeof attendanceSchema>;
export type LabourAttendance = z.infer<typeof labourSchema>;
export type MaterialTransaction = z.infer<typeof materialSchema>;
export type Collection = Exclude<keyof Database, "version">;
export type RecordFor<K extends Collection> = Database[K][number];
export const schemas = {
  companies: companySchema,
  projects: projectSchema,
  machines: machineSchema,
  diesel: dieselSchema,
  employees: employeeSchema,
  attendance: attendanceSchema,
  labour: labourSchema,
  transactions: materialSchema,
  storeItems: storeItemSchema,
  storeUsage: storeUsageSchema,
  workActivities: workActivitySchema,
  workLogs: workLogSchema,
  accountCategories: accountCategorySchema,
  accounts: accountSchema,
  issues: issueSchema,
  concrete: concreteSchema,
};
export const emptyDatabase = (): Database => ({
  version: 2,
  companies: [],
  projects: [],
  machines: [],
  diesel: [],
  employees: [],
  attendance: [],
  labour: [],
  transactions: [],
  storeItems: [],
  storeUsage: [],
  workActivities: [],
  workLogs: [],
  accountCategories: [],
  accounts: [],
  issues: [],
  concrete: [],
});

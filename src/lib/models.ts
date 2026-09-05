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
const required = z.string().trim().min(1, "This field is required.").max(200);
const optional = z.string().trim().max(2000).default("");
export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine((v) => {
    const d = new Date(v + "T12:00:00");
    return (
      !Number.isNaN(+d) &&
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` ===
        v
    );
  }, "Choose a valid date.");
const positive = z
  .number()
  .finite()
  .positive("Must be greater than zero.")
  .max(1e9);
const base = {
  id: required,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
const projectBase = { ...base, projectId: required };
export const companySchema = z.object({ ...base, name: required });
export const projectSchema = z.object({
  ...base,
  companyId: required,
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
export const photoSchema = z
  .string()
  .max(450000, "Photo is too large. Please choose a smaller image.")
  .regex(
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
    "Upload a valid meter photo.",
  );
export const dieselSchema = z.object({
  ...projectBase,
  machineId: required,
  date: daySchema,
  litres: positive,
  costPerLitre: positive,
  meterReading: z.number().finite().min(0).max(1e12),
  photo: photoSchema,
  notes: optional,
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
export const materialSchema = z.object({
  ...projectBase,
  material: z.enum(materials),
  type: z.enum(["Received", "Consumed"]),
  quantity: positive,
  date: daySchema,
  supplier: optional,
  reference: optional,
  vehicle: optional,
  notes: optional,
});
export const databaseSchema = z.object({
  version: z.literal(1),
  companies: z.array(companySchema),
  projects: z.array(projectSchema),
  machines: z.array(machineSchema),
  diesel: z.array(dieselSchema),
  employees: z.array(employeeSchema),
  attendance: z.array(attendanceSchema),
  labour: z.array(labourSchema),
  transactions: z.array(materialSchema),
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
};
export const emptyDatabase = (): Database => ({
  version: 1,
  companies: [],
  projects: [],
  machines: [],
  diesel: [],
  employees: [],
  attendance: [],
  labour: [],
  transactions: [],
});

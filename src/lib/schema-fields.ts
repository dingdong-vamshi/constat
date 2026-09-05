import { z } from "zod";
export const required = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(200);
export const optional = z.string().trim().max(2000).default("");
export const positive = z
  .number()
  .finite()
  .positive("Must be greater than zero.")
  .max(1e9);
export const optionalQuantity = z.preprocess(
  (v) =>
    v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v))
      ? null
      : v,
  positive.nullable(),
);
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
export const photoSchema = z
  .string()
  .max(450000, "Photo is too large. Choose a smaller image.")
  .regex(
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
    "Upload a valid image.",
  );
export const optionalPhoto = z.union([z.literal(""), photoSchema]).default("");
export const base = {
  id: required,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const projectBase = { ...base, projectId: required };
export const consumptionAreas = [
  "Foundation",
  "Structural",
  "Super Structural",
] as const;
export const activeStatuses = ["Active", "Inactive"] as const;

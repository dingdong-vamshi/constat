"use client";
import { useState } from "react";
import { FieldErrors, useForm, useWatch } from "react-hook-form";
import {
  Collection,
  RecordFor,
  schemas,
  machineTypes,
  materials,
  units,
  MaterialType,
} from "@/lib/models";
import { today, money, number } from "@/lib/format";
import { inventory } from "@/lib/statistics";
import { preparePhoto } from "@/lib/images";
import { useStore } from "./store";
import { Button, Field, Modal } from "./ui";
import { Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
type FormValues = Record<string, string | number>;
type Config = {
  key: string;
  label: string;
  type?: "date" | "number" | "textarea" | "photo" | "select";
  options?: readonly string[];
  optional?: boolean;
  placeholder?: string;
};
const fields: Partial<Record<Collection, Config[]>> = {
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
    { key: "supplier", label: "Supplier", optional: true },
    {
      key: "reference",
      label: "Invoice / challan / reference",
      optional: true,
    },
    { key: "vehicle", label: "Vehicle number", optional: true },
    { key: "notes", label: "Notes", type: "textarea", optional: true },
  ],
};
export function RecordForm<K extends Collection>({
  collection,
  record,
  projectId,
  companyId,
  onClose,
  title,
}: {
  collection: K;
  record?: RecordFor<K>;
  projectId: string;
  companyId: string;
  onClose: () => void;
  title: string;
}) {
  const { db, repo } = useStore();
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const config = fields[collection] ?? [];
  const initial: FormValues = {};
  for (const f of config)
    initial[f.key] =
      f.type === "date"
        ? today()
        : f.type === "select"
          ? (f.options?.[0] ?? "")
          : "";
  if (record)
    for (const [key, value] of Object.entries(record))
      if (typeof value === "string" || typeof value === "number")
        initial[key] = value;
  const stamp = new Date().toISOString();
  const meta = {
    id: record?.id ?? crypto.randomUUID(),
    createdAt: record?.createdAt ?? stamp,
    updatedAt: stamp,
    projectId,
    companyId,
  };
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: initial,
    resolver: async (values) => {
      const parsed = schemas[collection].safeParse({ ...values, ...meta });
      if (parsed.success) return { values, errors: {} };
      const issues: FieldErrors<FormValues> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        issues[key] = { type: "validation", message: issue.message };
      }
      return { values: {}, errors: issues };
    },
  });
  const values = useWatch({ control });
  const photo = String(values.photo ?? "");
  const material = values.material as MaterialType;
  const submit = handleSubmit((values) => {
    try {
      setSaveError("");
      if (collection === "transactions" && values.type === "Consumed") {
        const stock =
          inventory(
            {
              ...db,
              transactions: db.transactions.filter((r) => r.id !== record?.id),
            },
            projectId,
          ).find((r) => r.material === values.material)?.available ?? 0;
        if (Number(values.quantity) > stock + 1e-6)
          throw new Error(
            `Only ${number(stock)} ${units[material]} currently available.`,
          );
      }
      repo.save(
        collection,
        schemas[collection].parse({ ...values, ...meta }) as RecordFor<K>,
      );
      toast.success(record ? "Changes saved." : "Record added.");
      onClose();
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not save this record.",
      );
    }
  });
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setPhotoError("");
    try {
      setValue("photo", await preparePhoto(file), { shouldValidate: true });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Unable to upload photo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} noValidate>
        <div className="form-fields">
          {config.map((f) => (
            <Field
              key={f.key}
              label={
                f.key === "quantity" && material
                  ? `Quantity (${units[material]})`
                  : f.label
              }
              required={!f.optional}
              error={errors[f.key]?.message as string | undefined}
            >
              {f.type === "select" ? (
                <select {...register(f.key)}>
                  <option value="" disabled>
                    Select {f.label.toLowerCase()}
                  </option>
                  {f.key === "machineId"
                    ? db.machines
                        .filter((m) => m.projectId === projectId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                            {m.status !== "Active" ? ` · ${m.status}` : ""}
                          </option>
                        ))
                    : f.options?.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  {...register(f.key)}
                  rows={3}
                  placeholder="Optional details…"
                />
              ) : f.type === "photo" ? (
                <span className="upload-box">
                  {photo ? (
                    <img src={photo} alt="Meter photo preview" />
                  ) : (
                    <ImageIcon size={25} />
                  )}
                  <span className="upload-text">
                    <Upload size={16} />
                    {busy
                      ? "Processing photo…"
                      : photo
                        ? "Replace meter photo"
                        : "Upload meter photo"}
                  </span>
                  <input
                    aria-label="Meter photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                  <small>JPG, PNG or WebP · Compressed automatically</small>
                  {photoError && (
                    <small className="field-error" role="alert">
                      {photoError}
                    </small>
                  )}
                </span>
              ) : (
                <input
                  type={f.type ?? "text"}
                  step={f.key === "count" ? "1" : "any"}
                  placeholder={
                    f.placeholder ?? (f.type === "number" ? "0" : undefined)
                  }
                  {...register(f.key, { valueAsNumber: f.type === "number" })}
                />
              )}
            </Field>
          ))}
          {collection === "diesel" && (
            <div className="calculation">
              <span>
                {number(Number(values.litres) || 0)} L ×{" "}
                {money(Number(values.costPerLitre) || 0)}
              </span>
              <strong>
                {money(
                  (Number(values.litres) || 0) *
                    (Number(values.costPerLitre) || 0),
                )}
              </strong>
              <small>Total diesel cost · calculated automatically</small>
            </div>
          )}
          {collection === "transactions" && material && (
            <p className="hint">
              Available stock:{" "}
              {number(
                inventory(db, projectId).find((r) => r.material === material)
                  ?.available ?? 0,
              )}{" "}
              {units[material]}. Stock is calculated from all recorded
              transactions.
            </p>
          )}
          {saveError && (
            <div role="alert" className="error-message">
              {saveError}
            </div>
          )}
        </div>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || isSubmitting}>
            {record ? "Save changes" : "Save record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

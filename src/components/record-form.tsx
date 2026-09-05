"use client";
import { useState } from "react";
import { FieldErrors, useForm, useWatch } from "react-hook-form";
import {
  Collection,
  RecordFor,
  schemas,
  units,
  MaterialType,
} from "@/lib/models";
import { today, money, number } from "@/lib/format";
import { newId } from "@/lib/id";
import { inventory } from "@/lib/statistics";
import { useStore } from "./store";
import { Button, Field, Modal } from "./ui";
import { PhotoUpload } from "./photo-upload";
import { fields, FormValues } from "./form-fields";
import { toast } from "sonner";
export function RecordForm<K extends Collection>({
  collection,
  record,
  projectId,
  companyId,
  onClose,
  title,
  defaults = {},
}: {
  collection: K;
  record?: RecordFor<K>;
  projectId: string;
  companyId: string;
  onClose: () => void;
  title: string;
  defaults?: FormValues;
}) {
  const { db, repo } = useStore();
  const [busyCount, setBusyCount] = useState(0);
  const [saveError, setSaveError] = useState("");
  const config = fields[collection] ?? [];
  const initial: FormValues = {};
  for (const f of config)
    initial[f.key] =
      f.type === "date" && !f.optional
        ? today()
        : f.type === "select" && !f.optional
          ? (f.options?.[0] ?? "")
          : "";
  if (collection === "storeItems") initial.unit = "Nos";
  Object.assign(initial, defaults);
  if (record)
    for (const [key, value] of Object.entries(record))
      if (typeof value === "string" || typeof value === "number")
        initial[key] = value;
  const [id] = useState(() => record?.id ?? newId());
  function payload(values: FormValues) {
    const stamp = new Date().toISOString();
    const data: Record<string, unknown> = {
      ...values,
      id,
      createdAt: record?.createdAt ?? stamp,
      updatedAt: stamp,
      projectId,
      companyId,
    };
    if (collection === "diesel") data.legacyMissingBill = false;
    if (collection === "transactions") {
      data.legacyAreaMissing = false;
      if (data.material !== "Steel" || data.type !== "Consumed") data.area = "";
    }
    if (collection === "storeUsage" && data.used === "No") {
      data.quantity = null;
      data.team = "";
      data.workArea = "";
    }
    if (collection === "accounts")
      data.entryNumber =
        record && "entryNumber" in record ? record.entryNumber : "AUTO";
    if (collection === "issues" && data.status !== "Resolved") {
      data.resolvedDate = "";
    }
    return data;
  }
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: initial,
    resolver: async (values) => {
      const result = schemas[collection].safeParse(payload(values));
      if (result.success) return { values, errors: {} };
      const errs: FieldErrors<FormValues> = {};
      for (const issue of result.error.issues)
        errs[String(issue.path[0])] = {
          type: "validation",
          message: issue.message,
        };
      return { values: {}, errors: errs };
    },
  });
  const values = useWatch({ control });
  const material = values.material as MaterialType;
  const choices = (key: string) => {
    const source =
      key === "machineId"
        ? db.machines
        : key === "storeItemId"
          ? db.storeItems
          : key === "activityId"
            ? db.workActivities
            : key === "categoryId"
              ? db.accountCategories
              : [];
    return source
      .filter(
        (r) =>
          r.projectId === projectId &&
          (collection === "issues" ||
            r.status === "Active" ||
            r.id === values[key]),
      )
      .map((r) => ({
        id: r.id,
        name:
          r.name +
          ("specification" in r && r.specification
            ? ` · ${r.specification}`
            : "") +
          (r.status !== "Active" ? ` · ${r.status}` : ""),
      }));
  };
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
        schemas[collection].parse(payload(values)) as RecordFor<K>,
      );
      toast.success(record ? "Changes saved." : "Record added.");
      onClose();
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not save this record.",
      );
    }
  });
  return (
    <Modal open onClose={onClose} title={title}>
      <form className="record-form" onSubmit={submit} noValidate>
        <div className="form-fields">
          {collection === "accounts" && (
            <p className="hint">
              Entry number:{" "}
              {record && "entryNumber" in record
                ? record.entryNumber
                : "Assigned automatically when saved"}
              . Site accounts are entered separately from diesel and material
              logs; they are not added automatically.
            </p>
          )}
          {record &&
            (("legacyMissingBill" in record && record.legacyMissingBill) ||
              ("legacyAreaMissing" in record && record.legacyAreaMissing)) && (
              <p className="info-note">
                This older record has a missing bill or consumption area.
                Complete the new required field before saving changes.
              </p>
            )}
          {config
            .filter(
              (f) =>
                (!f.visible || f.visible(values)) &&
                !(
                  defaults.material === "Steel" &&
                  ["material", "type"].includes(f.key)
                ),
            )
            .map((f) => (
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
                  <select
                    aria-invalid={!!errors[f.key]}
                    {...register(f.key, {
                      onChange: (e) => {
                        if (f.key === "activityId") {
                          const activity = db.workActivities.find(
                            (r) => r.id === e.target.value,
                          );
                          setValue("unit", activity?.defaultUnit ?? "");
                        }
                      },
                    })}
                  >
                    <option value="" disabled={!f.optional}>
                      {f.optional ? "None" : `Select ${f.label.toLowerCase()}`}
                    </option>
                    {f.options
                      ? f.options.map((o) => <option key={o}>{o}</option>)
                      : choices(f.key).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    aria-invalid={!!errors[f.key]}
                    {...register(f.key)}
                    rows={3}
                    placeholder={
                      f.optional ? "Optional details…" : "Describe briefly…"
                    }
                  />
                ) : f.type === "photo" ? (
                  <PhotoUpload
                    label={f.label}
                    value={String(values[f.key] ?? "")}
                    optional={f.optional}
                    onChange={(v) =>
                      setValue(f.key, v, { shouldValidate: true })
                    }
                    onBusyChange={(busy) =>
                      setBusyCount((n) => n + (busy ? 1 : -1))
                    }
                  />
                ) : (
                  <input
                    aria-invalid={!!errors[f.key]}
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
                {money(Number(values.costPerLitre) || 0)}/L
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
              {units[material]}. Calculated from all transactions.
            </p>
          )}
          {collection === "storeUsage" && (
            <p className="hint">
              Daily usage does not reduce owned inventory.
              {values.storeItemId &&
                ` Owned: ${db.storeItems.find((r) => r.id === values.storeItemId)?.totalQuantity} ${db.storeItems.find((r) => r.id === values.storeItemId)?.unit}.`}
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
          <Button type="submit" disabled={busyCount > 0 || isSubmitting}>
            {record ? "Save changes" : "Save record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

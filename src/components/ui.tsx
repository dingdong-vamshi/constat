"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { X, ChevronLeft, ChevronRight, Search, FolderOpen } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={clsx("btn", `btn-${variant}`, className)} {...props} />
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description ??
                  "Enter the details below. Required fields are marked with an asterisk."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="overlay" />
        <AlertDialog.Content className="modal confirm">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <div className="form-actions">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <Button variant="danger" onClick={onConfirm}>
              Confirm
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  const status = String(children);
  return (
    <span
      className={clsx("badge", {
        "badge-green": ["Active", "Present", "Received"].includes(status),
        "badge-amber": ["Maintenance", "On Hold"].includes(status),
        "badge-red": ["Absent", "Inactive"].includes(status),
      })}
    >
      <span />
      {children}
    </span>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        {icon}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={28} />
      <h3>{title}</h3>
      <p>{description ?? "Add your first record to get started."}</p>
      {action}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Table<T extends { id: string }>({
  rows,
  columns,
  empty = "No records yet.",
  action,
}: {
  rows: T[];
  columns: { title: string; render: (row: T) => React.ReactNode }[];
  empty?: string;
  action?: React.ReactNode;
}) {
  const [page, setPage] = useState(0);
  const count = Math.ceil(rows.length / 15);
  const current = Math.min(page, Math.max(0, count - 1));
  if (!rows.length)
    return (
      <div className="panel">
        <Empty title={empty} action={action} />
      </div>
    );
  return (
    <div className="panel table-panel">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.title}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 15, current * 15 + 15).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.title}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          {current * 15 + 1}–{Math.min(rows.length, (current + 1) * 15)} of{" "}
          {rows.length} records
        </span>
        <div>
          <Button
            variant="secondary"
            aria-label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span>
            Page {current + 1} of {count}
          </span>
          <Button
            variant="secondary"
            aria-label="Next page"
            disabled={current + 1 >= count}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

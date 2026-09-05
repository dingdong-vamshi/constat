"use client";
import { useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { preparePhoto } from "@/lib/images";
export function PhotoUpload({
  label,
  value,
  onChange,
  onBusyChange,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
  optional?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      onChange(await preparePhoto(file));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not process this image.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <>
      <span className="upload-box">
        {value ? (
          <img src={value} alt={`${label} preview`} />
        ) : (
          <ImageIcon size={24} />
        )}
        <span className="upload-text">
          <Upload size={16} />
          {busy
            ? "Processing photo…"
            : value
              ? `Replace ${label.toLowerCase()}`
              : `Upload ${label.toLowerCase()}`}
        </span>
        <input
          aria-label={label}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <small>JPG, PNG or WebP · Compressed automatically</small>
      </span>
      {error && (
        <small role="alert" className="field-error">
          {error}
        </small>
      )}
      {value && optional && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={(e) => {
            e.preventDefault();
            onChange("");
          }}
        >
          Remove photo
        </button>
      )}
    </>
  );
}

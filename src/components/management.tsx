"use client";
import { useState } from "react";
import {
  Building2,
  Download,
  Upload,
  Database as DatabaseIcon,
  RotateCcw,
  Plus,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import {
  Company,
  Project,
  emptyDatabase,
  Collection,
  Database,
} from "@/lib/models";
import { validateDatabase } from "@/lib/repository";
import { createSeed, samplePhoto } from "@/lib/seed";
import { displayDate } from "@/lib/format";
import { useStore } from "./store";
import { Badge, Button, Confirm, PageHeading, Table } from "./ui";
import { RowActions } from "./records";
import { RecordForm } from "./record-form";
export function ProjectsPage({
  companyId,
  projectId,
  onSelectCompany,
  onSelectProject,
}: {
  companyId: string;
  projectId: string;
  onSelectCompany: (id: string) => void;
  onSelectProject: (id: string) => void;
}) {
  const { db, repo, role } = useStore();
  const isAdmin = role === "Super Admin";
  const [editing, setEditing] = useState<
    | { kind: "companies"; record?: Company }
    | { kind: "projects"; record?: Project }
    | null
  >(null);
  const [deleting, setDeleting] = useState<{
    kind: "companies" | "projects";
    id: string;
    name: string;
  } | null>(null);
  return (
    <>
      <PageHeading
        title="Companies & projects"
        description="Organize your sites. Each project keeps its own records and statistics."
        action={
          <Button
            disabled={!isAdmin}
            onClick={() => setEditing({ kind: "companies" })}
          >
            <Plus size={16} />
            Add company
          </Button>
        }
      />
      <div className="section-heading">
        <h2>
          <Building2 size={18} />
          Companies
        </h2>
        <span className="muted">{db.companies.length} total</span>
      </div>
      <Table
        rows={db.companies}
        empty="No companies yet."
        action={
          <Button
            disabled={!isAdmin}
            onClick={() => setEditing({ kind: "companies" })}
          >
            Add company
          </Button>
        }
        columns={[
          { title: "Company", render: (r) => <strong>{r.name}</strong> },
          {
            title: "Projects",
            render: (r) =>
              db.projects.filter((p) => p.companyId === r.id).length,
          },
          {
            title: "Selection",
            render: (r) =>
              r.id === companyId ? (
                <Badge>Selected</Badge>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onSelectCompany(r.id)}
                >
                  Select company
                </Button>
              ),
          },
          {
            title: "Actions",
            render: (r) => (
              <RowActions
                disabled={!isAdmin}
                onEdit={() => setEditing({ kind: "companies", record: r })}
                onDelete={() =>
                  setDeleting({ kind: "companies", id: r.id, name: r.name })
                }
              />
            ),
          },
        ]}
      />
      <div className="section-heading projects-heading">
        <h2>
          <FolderKanban size={18} />
          Projects in{" "}
          {db.companies.find((c) => c.id === companyId)?.name ??
            "selected company"}
        </h2>
        <Button
          variant="secondary"
          disabled={!companyId || !isAdmin}
          onClick={() => setEditing({ kind: "projects" })}
        >
          <Plus size={16} />
          Add project
        </Button>
      </div>
      <Table
        rows={db.projects.filter((p) => p.companyId === companyId)}
        empty="No projects yet."
        action={
          <Button
            disabled={!companyId || !isAdmin}
            onClick={() => setEditing({ kind: "projects" })}
          >
            Add project
          </Button>
        }
        columns={[
          {
            title: "Project / site",
            render: (r) => (
              <div>
                <strong>{r.name}</strong>
                <small className="cell-sub">{r.siteName}</small>
              </div>
            ),
          },
          { title: "Location", render: (r) => r.location },
          { title: "Start date", render: (r) => displayDate(r.startDate) },
          { title: "Status", render: (r) => <Badge>{r.status}</Badge> },
          {
            title: "Selection",
            render: (r) =>
              r.id === projectId ? (
                <Badge>Selected</Badge>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onSelectProject(r.id)}
                >
                  Select project
                </Button>
              ),
          },
          {
            title: "Actions",
            render: (r) => (
              <RowActions
                disabled={!isAdmin}
                onEdit={() => setEditing({ kind: "projects", record: r })}
                onDelete={() =>
                  setDeleting({ kind: "projects", id: r.id, name: r.name })
                }
              />
            ),
          },
        ]}
      />
      {editing && (
        <RecordForm
          collection={editing.kind}
          record={editing.record}
          companyId={companyId}
          projectId={projectId}
          title={`${editing.record ? "Edit" : "Add"} ${editing.kind === "companies" ? "company" : "project"}`}
          onClose={() => setEditing(null)}
        />
      )}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={`This permanently deletes this ${deleting?.kind === "companies" ? "company, all its projects" : "project"} and ALL associated machines, attendance, materials, store inventory and usage, work logs, accounts, issues, concrete, and all other project records. Export a backup first if needed.`}
        onConfirm={() => {
          try {
            repo.remove(deleting!.kind, deleting!.id);
            setDeleting(null);
            toast.success("Deleted successfully.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Unable to delete.");
          }
        }}
      />
    </>
  );
}
export function DataManagement() {
  const { db, repo, clearError, role } = useStore();
  const [action, setAction] = useState<"sample" | "reset" | "import" | null>(
    null,
  );
  const [pending, setPending] = useState<Database | null>(null);
  const [importError, setImportError] = useState("");
  const bytes = new Blob([JSON.stringify(db)]).size;
  const count = (
    Object.keys(db).filter((k) => k !== "version") as Collection[]
  ).reduce((n, k) => n + db[k].length, 0);
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `constat-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Backup exported, including meter photos.");
  }
  async function importData(file?: File) {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > 15 * 1024 * 1024)
        throw new Error("Backup is too large. Maximum import size is 15 MB.");
      const data = validateDatabase(JSON.parse(await file.text()));
      setPending(data);
      setAction("import");
    } catch (e) {
      setImportError(
        e instanceof SyntaxError
          ? "This file is not valid JSON. Choose a ConStat backup."
          : e instanceof Error
            ? `Import rejected: ${e.message}`
            : "Import failed.",
      );
    }
  }
  return (
    <>
      <PageHeading
        title="Data Management"
        description="Back up your records, restore a backup, or start fresh."
      />
      <div className="local-storage-banner">
        <DatabaseIcon size={24} />
        <div>
          <h2>Your data stays in this browser</h2>
          <p>
            {count} records · {(bytes / 1024 / 1024).toFixed(2)} MB of data.
            Export regularly to keep a backup. Other devices and browsers have
            separate data.
          </p>
        </div>
        <Badge>V1 beta</Badge>
      </div>
      <div className="management-grid">
        {[
          {
            title: "Export all data",
            description:
              "Download a JSON backup with all companies, projects, records, and meter photos.",
            icon: Download,
            button: "Export All Data",
            run: exportData,
          },
          {
            title: "Import a backup",
            description:
              "Restore a ConStat JSON export. The backup is validated before replacing current data.",
            icon: Upload,
            button: "Import Data",
            run: () => document.getElementById("backup-input")?.click(),
          },
          {
            title: "Explore sample data",
            description:
              "Load one company, one site, machines, employees, and a week of realistic activity. Replaces current data.",
            icon: DatabaseIcon,
            button: "Load Sample Data",
            run: () => setAction("sample"),
          },
          {
            title: "Reset the application",
            description:
              "Delete all companies, projects, records, and photos from this browser. This cannot be undone.",
            icon: RotateCcw,
            button: "Reset Application Data",
            run: () => setAction("reset"),
          },
        ].map((c) => (
          <div className="panel management-card" key={c.title}>
            <c.icon size={22} />
            <h2>{c.title}</h2>
            <p>{c.description}</p>
            <Button
              variant={c.title.startsWith("Reset") ? "danger" : "secondary"}
              disabled={role === "Employee" && c.button !== "Export All Data"}
              onClick={c.run}
            >
              {c.button}
            </Button>
          </div>
        ))}
      </div>
      <input
        id="backup-input"
        hidden
        type="file"
        accept=".json,application/json"
        aria-label="Import backup file"
        onChange={(e) => {
          void importData(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {importError && (
        <div className="error-message" role="alert">
          {importError}
        </div>
      )}
      <div className="info-note">
        <p>
          Local beta · The role selector is for testing only; it is not
          authentication. No sign-in or cloud sync. Clearing browser site data
          removes your records. Keep exported backups before changing browsers
          or resetting data.
        </p>
      </div>
      <Confirm
        open={!!action}
        onClose={() => {
          setAction(null);
          setPending(null);
        }}
        title={
          action === "reset"
            ? "Reset all application data?"
            : action === "sample"
              ? "Replace with sample data?"
              : "Replace data with this backup?"
        }
        description={
          action === "import"
            ? `This backup contains ${pending?.companies.length ?? 0} companies and ${pending?.projects.length ?? 0} projects. All current data will be replaced, including photos. Export first if you need a backup.`
            : "All current companies, projects, records, and photos will be replaced. Export a backup first if you need to keep them."
        }
        onConfirm={() => {
          try {
            repo.replace(
              action === "reset"
                ? emptyDatabase()
                : action === "sample"
                  ? createSeed(samplePhoto(), samplePhoto("bill"))
                  : pending,
            );
            clearError();
            setAction(null);
            setPending(null);
            toast.success("Application data updated.");
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Unable to update data.",
            );
          }
        }}
      />
    </>
  );
}

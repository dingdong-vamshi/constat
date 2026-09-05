"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { BrowserStorage, Repository, STORAGE_KEY } from "@/lib/repository";
import { createSeed, samplePhoto } from "@/lib/seed";
import { TestingRole } from "@/lib/permissions";
import { toast } from "sonner";
const Context = createContext<{
  repo: Repository;
  role: TestingRole;
  setRole: (role: TestingRole) => void;
  ready: boolean;
  error: string;
  clearError: () => void;
  selection: { companyId: string; projectId: string };
  selectWorkspace: (companyId: string, projectId: string) => void;
} | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [repo] = useState(() => new Repository(new BrowserStorage()));
  const [role, updateRole] = useState<TestingRole>("Super Admin");
  const [rolePreferences] = useState(
    () => new BrowserStorage("constat.testing-role.v1"),
  );
  function setRole(next: TestingRole) {
    repo.setRole(next);
    updateRole(next);
    try {
      rolePreferences.write(next);
    } catch {
      toast.error("Testing role could not be remembered.");
    }
  }
  const [selection, setSelection] = useState({ companyId: "", projectId: "" });
  const [preferences] = useState(
    () => new BrowserStorage("constat.workspace.v1"),
  );
  function selectWorkspace(companyId: string, projectId: string) {
    const next = { companyId, projectId };
    setSelection(next);
    try {
      preferences.write(JSON.stringify(next));
    } catch {
      toast.error(
        "Project selected, but the selection could not be remembered after refresh.",
      );
    }
  }
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (!repo.hydrate())
          repo.replace(createSeed(samplePhoto(), samplePhoto("bill")));
      } catch (e) {
        setError(
          `Could not load saved data. ${e instanceof Error ? e.message : "Invalid data."} Use Data Management to restore a backup or reset. The saved data has not been overwritten.`,
        );
      }
      try {
        const saved: unknown = JSON.parse(preferences.read() ?? "null");
        if (
          saved &&
          typeof saved === "object" &&
          "companyId" in saved &&
          "projectId" in saved &&
          typeof saved.companyId === "string" &&
          typeof saved.projectId === "string"
        )
          setSelection({
            companyId: saved.companyId,
            projectId: saved.projectId,
          });
      } catch {
        /* Missing or invalid preferences do not affect operational data. */
      }
      try {
        const savedRole = rolePreferences.read();
        if (savedRole === "Employee" || savedRole === "Super Admin") {
          repo.setRole(savedRole);
          updateRole(savedRole);
        }
      } catch {
        /* Fall back to Super Admin for local testing. */
      }
      setReady(true);
    });
    const handler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        try {
          repo.reload();
        } catch {
          toast.error("Data changed in another tab but could not be loaded.");
        }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [repo, preferences, rolePreferences]);
  return (
    <Context.Provider
      value={{
        repo,
        role,
        setRole,
        ready,
        error,
        selection,
        selectWorkspace,
        clearError: () => setError(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Store is unavailable.");
  const db = useSyncExternalStore(
    ctx.repo.subscribe,
    ctx.repo.getSnapshot,
    ctx.repo.getSnapshot,
  );
  return { ...ctx, db };
}

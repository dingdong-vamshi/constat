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
import { toast } from "sonner";
const Context = createContext<{
  repo: Repository;
  ready: boolean;
  error: string;
  clearError: () => void;
  selection: { companyId: string; projectId: string };
  selectWorkspace: (companyId: string, projectId: string) => void;
} | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [repo] = useState(() => new Repository(new BrowserStorage()));
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
        if (!repo.hydrate()) repo.replace(createSeed(samplePhoto()));
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
  }, [repo, preferences]);
  return (
    <Context.Provider
      value={{
        repo,
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

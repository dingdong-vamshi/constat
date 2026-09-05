"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Fuel,
  Truck,
  Users,
  HardHat,
  Package,
  Layers,
  FolderKanban,
  Database,
  PanelLeftClose,
  Menu,
  ChevronRight,
  Building2,
  X,
  ClipboardCheck,
} from "lucide-react";
import { useStore } from "./store";
import { Dashboard, InventoryPage } from "./dashboard";
import { RecordsPage } from "./records";
import { AttendancePage } from "./attendance";
import { DataManagement, ProjectsPage } from "./management";
import { Empty } from "./ui";
const groups = [
  {
    label: "",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "MACHINERY",
    items: [
      { href: "/diesel", label: "Diesel Log", icon: Fuel },
      { href: "/machinery", label: "Machinery", icon: Truck },
    ],
  },
  {
    label: "ATTENDANCE",
    items: [
      { href: "/employees", label: "Technical Employees", icon: Users },
      { href: "/attendance", label: "Daily Attendance", icon: ClipboardCheck },
      { href: "/labour", label: "Labour Attendance", icon: HardHat },
    ],
  },
  {
    label: "MATERIALS",
    items: [
      { href: "/materials", label: "Material Log", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Layers },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/data", label: "Data Management", icon: Database },
    ],
  },
];
export function AppShell() {
  const { db, ready, error, selection, selectWorkspace } = useStore();
  const pathname = usePathname();
  const { companyId: selectedCompany, projectId: selectedProject } = selection;
  const [mobileOpen, setMobileOpen] = useState(false);
  const companyId = db.companies.some((c) => c.id === selectedCompany)
    ? selectedCompany
    : (db.companies[0]?.id ?? "");
  const projects = db.projects.filter((p) => p.companyId === companyId);
  const projectId = projects.some((p) => p.id === selectedProject)
    ? selectedProject
    : (projects[0]?.id ?? "");
  const current = groups
    .flatMap((g) => g.items)
    .find((i) => i.href === pathname);
  const selectCompany = (id: string) => {
    selectWorkspace(id, "");
  };
  const setProject = (id: string) => selectWorkspace(companyId, id);
  if (!ready)
    return (
      <div className="loading">
        <div className="logo-mark">
          C<span />
        </div>
        <p>Opening ConStat…</p>
      </div>
    );
  const props = { projectId, companyId };
  const content =
    pathname === "/data" ? (
      <DataManagement />
    ) : pathname === "/projects" ? (
      <ProjectsPage
        {...props}
        onSelectCompany={selectCompany}
        onSelectProject={setProject}
      />
    ) : !projectId ? (
      <Empty
        title="Create your first project"
        description="Add a company and construction site to start tracking operations."
        action={
          <Link className="btn btn-primary" href="/projects">
            Set up a project
          </Link>
        }
      />
    ) : pathname === "/" ? (
      <Dashboard projectId={projectId} />
    ) : pathname === "/inventory" ? (
      <InventoryPage projectId={projectId} />
    ) : pathname === "/attendance" ? (
      <AttendancePage projectId={projectId} />
    ) : pathname === "/diesel" ? (
      <RecordsPage kind="diesel" {...props} />
    ) : pathname === "/machinery" ? (
      <RecordsPage kind="machines" {...props} />
    ) : pathname === "/employees" ? (
      <RecordsPage kind="employees" {...props} />
    ) : pathname === "/labour" ? (
      <RecordsPage kind="labour" {...props} />
    ) : pathname === "/materials" ? (
      <RecordsPage kind="transactions" {...props} />
    ) : (
      <Empty
        title="Page not found"
        action={<Link href="/">Go to dashboard</Link>}
      />
    );
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <Link href="/" className="brand">
          <div className="logo-mark">
            C<span />
          </div>
          <span>
            ConStat<small>CONSTRUCTION STATISTICS</small>
          </span>
          <span className="beta">BETA</span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          <Building2 size={17} />
          <span>Site workspace</span>
          <span className="workspace-dot" />
        </div>
        <nav aria-label="Main navigation">
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              {g.label && <span className="nav-group-label">{g.label}</span>}
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={
                    pathname === item.href ? "nav-link active" : "nav-link"
                  }
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  <item.icon size={18} />
                  {item.label}
                  {pathname === item.href && <ChevronRight size={14} />}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span />
            Local workspace
          </div>
          <p>Simple records. Clear decisions.</p>
          <div className="sidebar-version">
            ConStat V1 beta
            <PanelLeftClose size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current?.label ?? "ConStat"}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span />
              Saved locally
            </span>
            <div className="profile-avatar">CS</div>
          </div>
        </header>
        <div className="project-bar">
          <Building2 size={19} />
          <label>
            <span>Company</span>
            <select
              aria-label="Current company"
              value={companyId}
              onChange={(e) => selectCompany(e.target.value)}
            >
              {!companyId && <option value="">No company</option>}
              {db.companies.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <span className="project-divider" />
          <label className="project-selector">
            <span>Current project</span>
            <select
              aria-label="Current project"
              value={projectId}
              onChange={(e) => setProject(e.target.value)}
            >
              {!projectId && <option value="">No project selected</option>}
              {projects.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} — {p.location}
                </option>
              ))}
            </select>
          </label>
          <Link href="/projects" className="manage-projects">
            Manage projects <ChevronRight size={14} />
          </Link>
        </div>
        <main key={`${pathname}:${projectId}`} id="main-content">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          {content}
          <footer className="page-footer">
            <span>ConStat · Construction Statistics Tracker</span>
            <span>Local beta / V1.0</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Save, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { today, number, displayDate } from "@/lib/format";
import { useStore } from "./store";
import { Button, Confirm, Empty, PageHeading, Stat } from "./ui";
export function AttendancePage({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(today());
  return (
    <>
      <PageHeading
        title="Technical Attendance"
        description="Mark your team’s attendance and save the whole day together."
        action={
          <Link className="btn btn-secondary" href="/employees">
            <Users size={16} />
            Manage employees
          </Link>
        }
      />
      <div className="filters">
        <label className="inline-field">
          Attendance date
          <input
            aria-label="Attendance date"
            type="date"
            required
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
      </div>
      <DailyAttendance
        key={`${projectId}:${date}`}
        projectId={projectId}
        date={date}
      />
    </>
  );
}
function DailyAttendance({
  projectId,
  date,
}: {
  projectId: string;
  date: string;
}) {
  const { db, repo } = useStore();
  const [draft, setDraft] = useState<
    Record<string, { status: "Present" | "Absent"; notes: string }>
  >({});
  const [confirm, setConfirm] = useState(false);
  const saved = db.attendance.filter(
    (r) => r.projectId === projectId && r.date === date,
  );
  const employees = db.employees.filter(
    (e) =>
      e.projectId === projectId &&
      (e.status === "Active" || saved.some((r) => r.employeeId === e.id)),
  );
  const get = (id: string) =>
    draft[id] ?? saved.find((r) => r.employeeId === id);
  const present = saved.filter((r) => r.status === "Present").length,
    absent = saved.filter((r) => r.status === "Absent").length;
  function save() {
    const entries = employees.map((e) => ({
      employeeId: e.id,
      status: get(e.id)?.status,
      notes: get(e.id)?.notes ?? "",
    }));
    if (entries.some((e) => !e.status)) {
      toast.error("Mark Present or Absent for every employee before saving.");
      return;
    }
    try {
      repo.saveAttendance(
        projectId,
        date,
        entries as {
          employeeId: string;
          status: "Present" | "Absent";
          notes: string;
        }[],
      );
      setDraft({});
      toast.success("Attendance saved for " + displayDate(date) + ".");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save attendance.",
      );
    }
  }
  if (!employees.length)
    return (
      <div className="panel">
        <Empty
          title="No technical employees yet."
          action={
            <Link className="btn btn-primary" href="/employees">
              Add employee
            </Link>
          }
        />
      </div>
    );
  return (
    <>
      <div className="stats-grid four">
        <Stat label="Present" value={present} detail="Saved attendance" />
        <Stat label="Absent" value={absent} detail="Saved attendance" />
        <Stat
          label="Total employees"
          value={employees.length}
          detail={`${employees.length - present - absent} not marked`}
        />
        <Stat
          label="Attendance"
          value={`${number(present + absent ? (present / (present + absent)) * 100 : 0)}%`}
          detail="Present / marked employees"
        />
      </div>
      <div className="panel attendance-panel">
        <div className="attendance-header">
          <div>
            <h2>{displayDate(date)}</h2>
            <p>
              {Object.keys(draft).length
                ? "You have unsaved attendance changes."
                : saved.length
                  ? "Saved attendance · edit below to update"
                  : "No attendance saved for this date."}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              setDraft(
                Object.fromEntries(
                  employees.map((e) => [
                    e.id,
                    { status: "Present", notes: get(e.id)?.notes ?? "" },
                  ]),
                ),
              )
            }
          >
            <Check size={16} />
            Mark all present
          </Button>
        </div>
        {employees.map((e) => (
          <div className="attendance-row" key={e.id}>
            <div className="person">
              <span className="avatar">
                {e.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{e.name}</strong>
                <small>
                  {e.designation}
                  {e.status === "Inactive" ? " · Inactive" : ""}
                </small>
              </div>
            </div>
            <div className="attendance-controls">
              <div
                className="attendance-toggle"
                role="group"
                aria-label={`Attendance for ${e.name}`}
              >
                {(["Present", "Absent"] as const).map((status) => (
                  <button
                    key={status}
                    aria-pressed={get(e.id)?.status === status}
                    className={get(e.id)?.status === status ? "selected" : ""}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        [e.id]: { status, notes: get(e.id)?.notes ?? "" },
                      })
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
              <input
                aria-label={`Notes for ${e.name}`}
                placeholder="Notes (optional)"
                value={get(e.id)?.notes ?? ""}
                maxLength={2000}
                onChange={(ev) => {
                  const current = get(e.id);
                  if (!current) {
                    toast.error("Choose Present or Absent first.");
                    return;
                  }
                  setDraft({
                    ...draft,
                    [e.id]: { status: current.status, notes: ev.target.value },
                  });
                }}
              />
            </div>
          </div>
        ))}
        <div className="attendance-footer">
          {saved.length > 0 && (
            <Button variant="ghost" onClick={() => setConfirm(true)}>
              <Trash2 size={15} />
              Clear day
            </Button>
          )}
          <Button onClick={save}>
            <Save size={16} />
            Save attendance
          </Button>
        </div>
      </div>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear this day’s attendance?"
        description="All technical attendance for this project and date will be deleted. Employee records remain."
        onConfirm={() => {
          try {
            repo.replace({
              ...db,
              attendance: db.attendance.filter(
                (r) => r.projectId !== projectId || r.date !== date,
              ),
            });
            setDraft({});
            setConfirm(false);
            toast.success("Attendance cleared.");
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Could not clear attendance.",
            );
          }
        }}
      />
    </>
  );
}

import { Database, emptyDatabase } from "./models";
import { shiftDay, today } from "./format";
export function samplePhoto() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 360;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e5e5e5";
  x.fillRect(0, 0, 640, 360);
  x.fillStyle = "#222";
  x.fillRect(75, 55, 490, 235);
  x.fillStyle = "#c7cbbf";
  x.fillRect(105, 105, 430, 120);
  x.fillStyle = "#222";
  x.font = "56px monospace";
  x.fillText("001245.0", 130, 185);
  x.fillStyle = "#fff";
  x.font = "18px sans-serif";
  x.fillText("HOUR METER · SAMPLE IMAGE", 110, 265);
  return c.toDataURL("image/jpeg", 0.7);
}
export function createSeed(photo: string): Database {
  const db = emptyDatabase(),
    stamp = new Date().toISOString(),
    base = (id: string) => ({ id, createdAt: stamp, updatedAt: stamp }),
    projectId = "project-demo";
  db.companies = [{ ...base("company-demo"), name: "ABC Constructions" }];
  db.projects = [
    {
      ...base(projectId),
      companyId: "company-demo",
      name: "Residential Tower",
      siteName: "Block A · Hyderabad",
      location: "Hyderabad, Telangana",
      description: "A 12-storey residential development.",
      startDate: shiftDay(today(), -120),
      status: "Active",
    },
  ];
  db.machines = [
    {
      ...base("machine-1"),
      projectId,
      name: "Excavator 01",
      type: "Excavator",
      identification: "TS 09 EX 2041",
      status: "Active",
    },
    {
      ...base("machine-2"),
      projectId,
      name: "Concrete Mixer 01",
      type: "Concrete Mixer",
      identification: "MX-001",
      status: "Active",
    },
    {
      ...base("machine-3"),
      projectId,
      name: "Tractor 01",
      type: "Tractor",
      identification: "TS 07 TR 1165",
      status: "Maintenance",
    },
  ];
  db.employees = [
    "Ravi Kumar",
    "Ananya Reddy",
    "Suresh Rao",
    "Priya Sharma",
    "Vijay Singh",
    "Arjun Patel",
  ].map((name, i) => ({
    ...base(`employee-${i}`),
    projectId,
    name,
    designation: [
      "Site Engineer",
      "Civil Engineer",
      "Supervisor",
      "Project Engineer",
      "Machine Operator",
      "Driver",
    ][i],
    code: `EMP-00${i + 1}`,
    status: "Active",
  }));
  for (let day = 6; day >= 0; day--) {
    const date = shiftDay(today(), -day);
    db.labour.push({
      ...base(`labour-${day}`),
      projectId,
      date,
      count: [63, 58, 61, 55, 60, 57, 52][day],
      notes: "",
    });
    db.employees.forEach((e, i) =>
      db.attendance.push({
        ...base(`attendance-${day}-${i}`),
        projectId,
        employeeId: e.id,
        date,
        status: i < 4 + (day % 2) ? "Present" : "Absent",
        notes: "",
      }),
    );
    db.diesel.push({
      ...base(`diesel-${day}-1`),
      projectId,
      date,
      machineId: "machine-1",
      litres: 80 - day * 4,
      costPerLitre: 95,
      meterReading: 1245 - day * 8,
      photo,
      notes: "Morning refuelling",
    });
    if (day % 2 === 0)
      db.diesel.push({
        ...base(`diesel-${day}-2`),
        projectId,
        date,
        machineId: "machine-2",
        litres: 32 + day,
        costPerLitre: 95,
        meterReading: 560 - day * 5,
        photo,
        notes: "",
      });
  }
  (["Steel", "Cement", "Coarse Aggregate", "Fine Aggregate"] as const).forEach(
    (material, i) => {
      db.transactions.push({
        ...base(`material-${i}-received`),
        projectId,
        material,
        type: "Received",
        quantity: [42, 1000, 80, 65][i],
        date: shiftDay(today(), -6),
        supplier: [
          "Deccan Steel",
          "UltraTech Distributor",
          "Sri Sai Aggregates",
          "Sri Sai Aggregates",
        ][i],
        reference: `CH-10${i}`,
        vehicle: "",
        notes: "",
      });
      db.transactions.push({
        ...base(`material-${i}-consumed`),
        projectId,
        material,
        type: "Consumed",
        quantity: [17, 430, 45, 20][i],
        date: today(),
        supplier: "",
        reference: "",
        vehicle: "",
        notes: "Block A works",
      });
    },
  );
  return db;
}

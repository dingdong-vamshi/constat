import { initialAccountCategories } from "./operations-models";
import { Database, emptyDatabase } from "./models";
import { shiftDay, today } from "./format";
export function samplePhoto(kind: "meter" | "bill" = "meter") {
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
  if (kind === "bill") {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 640, 360);
    x.fillStyle = "#222";
    x.font = "24px sans-serif";
    x.fillText("SAMPLE DIESEL RECEIPT", 65, 70);
    x.font = "20px monospace";
    x.fillText("Diesel: 80 L x INR 95", 65, 140);
    x.fillText("Total: INR 7,600", 65, 190);
    x.fillText("Illustration for local demo", 65, 280);
  }
  return c.toDataURL("image/jpeg", 0.7);
}
export function createSeed(photo: string, billPhoto: string = photo): Database {
  const db = emptyDatabase(),
    stamp = new Date().toISOString(),
    base = (id: string) => ({ id, createdAt: stamp, updatedAt: stamp }),
    projectId = "project-demo";
  db.companies = [{ ...base("company-demo"), name: "ABC Constructions" }];
  db.projects = [
    {
      ...base(projectId),
      companyId: "company-demo",
      nextAccountNumber: 3,
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
      billPhoto,
      legacyMissingBill: false,
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
        billPhoto,
        legacyMissingBill: false,
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
        area: "",
        legacyAreaMissing: false,
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
        area: material === "Steel" ? "Foundation" : "",
        legacyAreaMissing: false,
        quantity: [17, 430, 45, 20][i],
        date: today(),
        supplier: "",
        reference: "",
        vehicle: "",
        notes: "Block A works",
      });
    },
  );
  db.storeItems = [
    {
      ...base("store-pump"),
      projectId,
      name: "Water Pump",
      category: "Pumps",
      specification: "3 HP",
      totalQuantity: 3,
      unit: "Nos",
      status: "Active",
      notes: "",
    },
    {
      ...base("store-vibrator"),
      projectId,
      name: "Vibrator",
      category: "Concrete equipment",
      specification: "",
      totalQuantity: 4,
      unit: "Nos",
      status: "Active",
      notes: "",
    },
  ];
  db.workActivities = [
    {
      ...base("activity-earthwork"),
      projectId,
      name: "Earthwork",
      defaultUnit: "m³",
      status: "Active",
    },
    {
      ...base("activity-blasting"),
      projectId,
      name: "Blasting",
      defaultUnit: "",
      status: "Active",
    },
  ];
  db.accountCategories = initialAccountCategories.map((name, i) => ({
    ...base(`category-${i}`),
    projectId,
    name,
    status: "Active",
  }));
  for (let day = 2; day >= 0; day--) {
    const date = shiftDay(today(), -day);
    db.storeUsage.push({
      ...base(`usage-${day}`),
      projectId,
      storeItemId: "store-pump",
      date,
      used: "Yes",
      quantity: 2,
      team: "Site team",
      workArea: "Block A",
      notes: "",
    });
    db.workLogs.push({
      ...base(`work-${day}`),
      projectId,
      date,
      activityId: "activity-earthwork",
      location: "Block A",
      quantity: 250 - day * 40,
      unit: "m³",
      description: "Excavation for footing area",
      status: day === 0 ? "Completed" : "Ongoing",
      notes: "",
    });
    db.concrete.push({
      ...base(`concrete-${day}`),
      projectId,
      date,
      quantity: 30 - day * 5,
      area: day === 0 ? "Structural" : "Foundation",
      grade: "M25",
      pourLocation: "Footing F1–F8",
      notes: "",
    });
  }
  db.storeUsage.push({
    ...base("usage-vibrator"),
    projectId,
    storeItemId: "store-vibrator",
    date: today(),
    used: "No",
    quantity: null,
    team: "",
    workArea: "",
    notes: "",
  });
  db.accounts = [
    {
      ...base("account-receipt"),
      projectId,
      entryNumber: "SITE-0001",
      date: shiftDay(today(), -2),
      type: "Receipt",
      categoryId: "category-7",
      description: "Site cash advance",
      amount: 50000,
      paymentMode: "Bank Transfer",
      party: "Head office",
      reference: "ADV-001",
      photo: "",
      notes: "",
    },
    {
      ...base("account-expense"),
      projectId,
      entryNumber: "SITE-0002",
      date: today(),
      type: "Expense",
      categoryId: "category-0",
      description: "Diesel purchase",
      amount: 7600,
      paymentMode: "Cash",
      party: "Local fuel station",
      reference: "BILL-01",
      photo: billPhoto,
      notes: "",
    },
  ];
  db.issues = [
    {
      ...base("issue-machine"),
      projectId,
      date: today(),
      time: "09:15",
      type: "Machinery Breakdown",
      title: "Hydraulic pressure dropped",
      description: "Hydraulic pressure dropped during excavation.",
      severity: "High",
      status: "Open",
      machineId: "machine-1",
      storeItemId: "",
      location: "Block A",
      reportedBy: "Ravi Kumar",
      photo: "",
      resolutionNotes: "",
      resolvedDate: "",
    },
  ];
  return db;
}

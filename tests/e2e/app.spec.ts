import { test, expect, Page } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=",
  "base64",
);
async function navigate(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".loading")).toHaveCount(0);
}
async function confirm(page: Page) {
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
}
async function form(page: Page, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values))
    await page
      .getByRole("dialog")
      .getByLabel(label, { exact: false })
      .fill(value);
}
test("diesel create, image compression, edit, filter, refresh, delete and dashboard recalculation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await navigate(page, "/diesel");
  const before = Number(
    (await page.locator(".stat").first().locator("strong").innerText()).replace(
      /[^\d.]/g,
      "",
    ),
  );
  await page
    .getByRole("button", { name: "Add Diesel Entry", exact: true })
    .click();
  await form(page, {
    "Diesel filled": "80",
    "Cost per litre": "95",
    "Meter reading": "1245",
  });
  await page
    .getByRole("dialog")
    .getByLabel("Machine", { exact: false })
    .selectOption("machine-1");
  await page
    .getByLabel("Meter photo", { exact: true })
    .setInputFiles({ name: "meter.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Meter photo preview")).toBeVisible();
  await page
    .getByLabel("Diesel bill photo", { exact: true })
    .setInputFiles({ name: "bill.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Diesel bill photo preview")).toBeVisible();
  await expect(page.locator(".calculation strong")).toHaveText("₹7,600");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    `${new Intl.NumberFormat("en-IN").format(before + 80)} L`,
  );
  await page.reload();
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    `${new Intl.NumberFormat("en-IN").format(before + 80)} L`,
  );
  const row = page
    .locator("tbody tr")
    .filter({ has: page.getByText("₹7,600", { exact: true }) })
    .first();
  await row.getByRole("button", { name: "Edit record" }).click();
  await form(page, { "Diesel filled": "81" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Filter machine", { exact: true })
    .selectOption("machine-2");
  await expect(
    page.locator("tbody tr").filter({ hasText: "₹7,695" }),
  ).toHaveCount(0);
  await page.getByLabel("Filter machine", { exact: true }).selectOption("");
  await page
    .locator("tbody tr")
    .filter({ hasText: "₹7,695" })
    .getByRole("button", { name: "Delete record" })
    .click();
  await confirm(page);
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    `${new Intl.NumberFormat("en-IN").format(before)} L`,
  );
  expect(errors).toEqual([]);
});
test("material create, edit, negative-stock validation, delete and inventory", async ({
  page,
}) => {
  await navigate(page, "/materials");
  await page
    .getByRole("button", { name: "Add Material Transaction", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Material", { exact: false })
    .selectOption("Steel");
  await form(page, { Quantity: "20", Invoice: "TEST-RECEIPT" });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add Material Transaction", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Transaction type")
    .selectOption("Consumed");
  await form(page, { Quantity: "1000", Invoice: "TEST-CONSUME" });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Only 45 tonnes currently available." }),
  ).toBeVisible();
  await form(page, { Quantity: "7" });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator("tbody tr")
    .filter({ hasText: "TEST-CONSUME" })
    .getByRole("button", { name: "Edit record" })
    .click();
  await form(page, { Quantity: "5" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator("tbody tr")
    .filter({ hasText: "TEST-CONSUME" })
    .getByRole("button", { name: "Delete record" })
    .click();
  await confirm(page);
  await navigate(page, "/inventory");
  await expect(
    page.locator("tbody tr").filter({ hasText: "Steel" }).locator("td").nth(3),
  ).toHaveText("45");
});
test("bulk attendance, labour uniqueness and workforce", async ({ page }) => {
  await navigate(page, "/attendance");
  await page.getByRole("button", { name: "Mark all present" }).click();
  const groups = page.getByRole("group");
  await groups
    .nth(4)
    .getByRole("button", { name: "Absent", exact: true })
    .click();
  await groups
    .nth(5)
    .getByRole("button", { name: "Absent", exact: true })
    .click();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.locator(".stat").nth(3).locator("strong")).toHaveText(
    "66.67%",
  );
  await page.reload();
  await expect(page.locator(".stat").first().locator("strong")).toHaveText("4");
  await navigate(page, "/labour");
  await page
    .getByRole("button", { name: "Add Labour Attendance", exact: true })
    .click();
  await form(page, { "Labourers present": "63" });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "already exists" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await navigate(page, "/");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Total workforce" })
      .locator("strong"),
  ).toHaveText("67");
});
test("project isolation, backup round-trip, reset persistence, and sample reload", async ({
  page,
}) => {
  await navigate(page, "/projects");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await form(page, {
    "Project name": "Second site",
    "Site name": "Block B",
    Location: "Pune",
  });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator("tbody tr")
    .filter({ hasText: "Second site" })
    .getByRole("button", { name: "Select project", exact: true })
    .click();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    "0 L",
  );
  await navigate(page, "/data");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export All Data", exact: true })
    .click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  await page
    .getByRole("button", { name: "Reset Application Data", exact: true })
    .click();
  await confirm(page);
  await page.reload();
  await expect(page.getByLabel("Current company")).toHaveText("No company");
  await page.locator("#backup-input").setInputFiles(file!);
  await confirm(page);
  await expect(page.getByLabel("Current project")).toContainText("Second site");
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await confirm(page);
  await expect(page.getByLabel("Current project")).not.toContainText(
    "Second site",
  );
});
test("all pages and mobile entry fit the viewport", async ({ page }) => {
  for (const path of [
    "/",
    "/diesel",
    "/machinery",
    "/employees",
    "/attendance",
    "/labour",
    "/materials",
    "/inventory",
    "/projects",
    "/data",
  ]) {
    await navigate(page, path);
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page, "/");
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Diesel Log", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Diesel Entry", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/diesel-mobile.png",
    fullPage: true,
  });
});

test("company, machinery and employee registry CRUD from an empty workspace", async ({
  page,
}) => {
  await navigate(page, "/data");
  await page
    .getByRole("button", { name: "Reset Application Data", exact: true })
    .click();
  await confirm(page);
  await navigate(page, "/projects");
  await page
    .getByRole("button", { name: "Add company", exact: true })
    .first()
    .click();
  await form(page, { "Company name": "Test Builders" });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add project", exact: true })
    .first()
    .click();
  await form(page, {
    "Project name": "New Tower",
    "Site name": "Site 1",
    Location: "Chennai",
  });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "/machinery");
  await page
    .getByRole("button", { name: "Add Machine", exact: true })
    .first()
    .click();
  await form(page, { "Machine name": "Test Excavator" });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit record" }).click();
  await form(page, { "Machine name": "Edited Excavator" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("Edited Excavator");
  await page.getByRole("button", { name: "Delete record" }).click();
  await confirm(page);
  await expect(page.locator(".empty")).toBeVisible();
  await navigate(page, "/employees");
  await page
    .getByRole("button", { name: "Add Employee", exact: true })
    .first()
    .click();
  await form(page, {
    Name: "Test Engineer",
    Designation: "Quality Specialist",
  });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit record" }).click();
  await form(page, { Designation: "Senior Quality Specialist" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "/attendance");
  await page.getByRole("button", { name: "Mark all present" }).click();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await navigate(page, "/employees");
  await page.getByRole("button", { name: "Delete record" }).click();
  await confirm(page);
  await navigate(page, "/attendance");
  await expect(
    page.getByText("No technical employees yet.", { exact: true }),
  ).toBeVisible();
});

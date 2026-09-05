import { test, expect, Page } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=",
  "base64",
);
async function go(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("h1")).toBeVisible();
}
async function save(page: Page, edit = false) {
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: edit ? "Save changes" : "Save record",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function fill(page: Page, values: Record<string, string>) {
  for (const [k, v] of Object.entries(values))
    await page.getByRole("dialog").getByLabel(k, { exact: false }).fill(v);
}
async function remove(page: Page, text: string) {
  await page
    .locator("tbody tr")
    .filter({ hasText: text })
    .getByRole("button", { name: "Delete record" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
}
async function project(page: Page) {
  await go(page, "/projects");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await fill(page, {
    "Project name": "Operations Test",
    "Site name": "Block T",
    Location: "Chennai",
  });
  await save(page);
  await page
    .locator("tbody tr")
    .filter({ hasText: "Operations Test" })
    .getByRole("button", { name: "Select project", exact: true })
    .click();
}

test("steel shares inventory and concrete updates its area dashboard through CRUD", async ({
  page,
}) => {
  await project(page);
  await go(page, "/materials");
  await page
    .getByRole("button", { name: "Add Material Transaction", exact: true })
    .first()
    .click();
  await fill(page, { Quantity: "20" });
  await save(page);
  await go(page, "/steel");
  await page
    .getByRole("button", { name: "Add Steel Consumption", exact: true })
    .first()
    .click();
  await fill(page, { Quantity: "7" });
  await page
    .getByRole("dialog")
    .getByLabel("Consumption area")
    .selectOption("Foundation");
  await save(page);
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Steel available" })
      .locator("strong"),
  ).toHaveText("13 tonnes");
  await page.getByRole("button", { name: "Edit record" }).click();
  await fill(page, { Quantity: "5" });
  await save(page, true);
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Steel available" })
      .locator("strong"),
  ).toHaveText("15 tonnes");
  await remove(page, "Foundation");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Steel available" })
      .locator("strong"),
  ).toHaveText("20 tonnes");
  await go(page, "/concrete");
  await page
    .getByRole("button", { name: "Add Concrete Entry", exact: true })
    .first()
    .click();
  await fill(page, {
    "Concrete quantity": "30",
    "Concrete grade": "M25",
    "Pour location": "Test pour",
  });
  await page
    .getByRole("dialog")
    .getByLabel("Consumption area")
    .selectOption("Structural");
  await save(page);
  await page.reload();
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Concrete today" })
      .locator("strong"),
  ).toHaveText("30 m³");
  await go(page, "/");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Concrete consumed" })
      .locator("strong"),
  ).toHaveText("30 m³");
  await go(page, "/concrete");
  await page.getByRole("button", { name: "Edit record" }).click();
  await fill(page, { "Concrete quantity": "25" });
  await save(page, true);
  await page.getByLabel("Filter Consumption area").selectOption("Foundation");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("Filter Consumption area").selectOption("");
  await remove(page, "Test pour");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Concrete today" })
      .locator("strong"),
  ).toHaveText("0 m³");
});

test("store admin and employee workflows preserve three owned pumps after two are used", async ({
  page,
}) => {
  await project(page);
  await go(page, "/stores");
  await page.getByRole("tab", { name: "Inventory", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Store Item", exact: true })
    .first()
    .click();
  await fill(page, {
    "Item name": "Test Water Pump",
    Specification: "3 HP",
    "Total owned quantity": "3",
  });
  await save(page);
  await page.getByLabel("Testing role").selectOption("Employee");
  await page
    .getByRole("button", { name: "Add Store Usage", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Store item", { exact: false })
    .selectOption({ label: "Test Water Pump · 3 HP" });
  await fill(page, { "Quantity used": "2", "Used by / team": "Team A" });
  await save(page);
  await page.reload();
  await expect(page.locator("tbody")).toContainText("2 Nos");
  await page.getByRole("tab", { name: "Inventory", exact: true }).click();
  await expect(
    page
      .locator("tbody tr")
      .filter({ hasText: "Test Water Pump" })
      .locator("td")
      .nth(2),
  ).toHaveText("3");
  await expect(
    page.getByRole("button", { name: "Add Store Item", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit record" })).toHaveCount(
    0,
  );
  await page.getByRole("tab", { name: "Daily usage" }).click();
  await page.getByRole("button", { name: "Edit record" }).click();
  await page.getByRole("dialog").getByLabel("Used today?").selectOption("No");
  await save(page, true);
  await expect(page.locator("tbody")).toContainText("No");
  await remove(page, "Test Water Pump");
  await page.getByLabel("Testing role").selectOption("Super Admin");
  await page.getByRole("tab", { name: "Inventory", exact: true }).click();
  await remove(page, "Test Water Pump");
});

test("daily work uses configurable activities and optional quantities", async ({
  page,
}) => {
  await project(page);
  await go(page, "/work");
  await page
    .getByRole("button", { name: "Add Work Entry", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Activity type")
    .selectOption({ label: "Earthwork" });
  await expect(
    page.getByRole("dialog").getByLabel("Unit", { exact: false }),
  ).toHaveValue("m³");
  await fill(page, {
    Quantity: "250",
    Location: "Block A",
    Description: "Footing excavation",
  });
  await page.getByRole("dialog").getByLabel("Status").selectOption("Completed");
  await save(page);
  await expect(
    page.locator(".stat").filter({ hasText: "Activities" }).locator("strong"),
  ).toHaveText("1");
  await expect(page.getByText("Earthwork (m³)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit record" }).click();
  await fill(page, { Quantity: "" });
  await save(page, true);
  await expect(page.locator("tbody")).toContainText("Footing excavation");
  await remove(page, "Footing excavation");
  await page.getByRole("tab", { name: "Activity types" }).click();
  await page
    .getByRole("button", { name: "Add Activity Type", exact: true })
    .click();
  await fill(page, { "Activity name": "Waterproofing", "Default unit": "m²" });
  await save(page);
  await expect(page.locator("tbody")).toContainText("Waterproofing");
});

test("site accounts number entries, store receipt photos and recalculate cash movement", async ({
  page,
}) => {
  await project(page);
  await go(page, "/accounts");
  await page
    .getByRole("button", { name: "Add Account Entry", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Category", { exact: false })
    .selectOption({ label: "Diesel" });
  await fill(page, {
    Description: "Test diesel expense",
    Amount: "7600",
    "Paid to": "Fuel Station",
  });
  await page
    .getByLabel("Bill / receipt photo", { exact: true })
    .setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Bill / receipt photo preview")).toBeVisible();
  await save(page);
  await expect(page.locator("tbody")).toContainText("SITE-0001");
  await expect(
    page
      .locator(".stat")
      .filter({ has: page.locator(".stat-label", { hasText: /^Expenses$/ }) })
      .locator("strong"),
  ).toHaveText("₹7,600");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Net cash movement" })
      .locator("strong"),
  ).toHaveText("₹-7,600");
  await page.reload();
  await page.getByRole("button", { name: "Preview photo" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Edit record" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Entry type")
    .selectOption("Receipt");
  await save(page, true);
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Receipts" })
      .first()
      .locator("strong"),
  ).toHaveText("₹7,600");
  await page.getByLabel("Filter Entry type").selectOption("Expense");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("Filter Entry type").selectOption("");
  await remove(page, "Test diesel expense");
});

test("site issues resolve and update dashboard counts with photo and project isolation", async ({
  page,
}) => {
  await project(page);
  await go(page, "/issues");
  await page
    .getByRole("button", { name: "Add Site Issue", exact: true })
    .first()
    .click();
  await fill(page, {
    Title: "Pump breakdown test",
    Description: "Pressure dropped while pumping",
    "Site location": "Block A",
  });
  await page.getByRole("dialog").getByLabel("Severity").selectOption("High");
  await page
    .getByLabel("Issue photo", { exact: true })
    .setInputFiles({ name: "issue.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Issue photo preview")).toBeVisible();
  await save(page);
  await expect(
    page.locator(".stat").filter({ hasText: "Open issues" }).locator("strong"),
  ).toHaveText("1");
  await go(page, "/");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Open site issues" })
      .locator("strong"),
  ).toHaveText("1");
  await go(page, "/issues");
  await page.getByRole("button", { name: "Edit record" }).click();
  await page.getByRole("dialog").getByLabel("Status").selectOption("Resolved");
  await fill(page, { "Resolution notes": "Hose replaced" });
  await save(page, true);
  await expect(
    page.locator(".stat").filter({ hasText: "Open issues" }).locator("strong"),
  ).toHaveText("0");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Resolved issues" })
      .locator("strong"),
  ).toHaveText("1");
  await page.reload();
  await expect(page.locator("tbody")).toContainText("Resolved");
  await remove(page, "Pump breakdown test");
});

test("new module pages and phone forms fit and remain usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/stores",
    "/work",
    "/accounts",
    "/issues",
    "/steel",
    "/concrete",
  ]) {
    await go(page, path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".page-heading button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  }
  expect(errors).toEqual([]);
  await go(page, "/stores");
  await page.screenshot({
    path: "test-results/stores-mobile.png",
    fullPage: true,
  });
});

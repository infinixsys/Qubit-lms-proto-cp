import { test, expect } from "@playwright/test";
test("production app reloads a downloaded reading offline and enforces access expiry", async ({
  browser,
}) => {
  const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
    }),
    page = await context.newPage();
  await page.goto("http://localhost:7313");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("button", { name: "Let’s get learning" }).click();
  await expect(
    page.getByRole("heading", { name: /Hello, Aarav/ }),
  ).toBeVisible();
  await page.goto("http://localhost:7313/lesson/laptop-diagnostics-lesson-1");
  await page
    .getByRole("button", { name: "Save reading offline", exact: true })
    .click();
  await expect(
    page.getByText("Reading saved for up to 24 hours.", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Start here · Your safe repair bench",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".lesson-reading")).toContainText(
    "Before opening a device",
  );
  await page.getByRole("button", { name: "My notes", exact: true }).click();
  await page
    .getByLabel("My lesson notes", { exact: true })
    .fill("Record observations before making measurements.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.endsWith(":queue"))
        .some((k) => JSON.parse(localStorage.getItem(k) || "[]").length > 0),
    ),
  ).toBeTruthy();
  await context.setOffline(false);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k.endsWith(":queue"))
          .every(
            (k) => JSON.parse(localStorage.getItem(k) || "[]").length === 0,
          ),
      ),
    )
    .toBeTruthy();
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage).filter((k) =>
      k.endsWith(":downloads"),
    )) {
      const rows = JSON.parse(localStorage.getItem(k) || "[]");
      rows.forEach((r: any) => (r.expires = Date.now() - 1000));
      localStorage.setItem(k, JSON.stringify(rows));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText(/Download this lesson while online before reading offline/),
  ).toBeVisible();
  await expect(page.locator(".lesson-reading")).toHaveCount(0);
  await context.close();
});

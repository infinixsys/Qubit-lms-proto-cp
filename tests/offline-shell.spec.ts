import { test, expect } from "@playwright/test";
test("production app reloads downloaded content offline and enforces download expiry", async ({
  browser,
}) => {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4174");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page
    .getByRole("button", { name: "Explore the learner demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Jamie" }),
  ).toBeVisible();
  await page.goto("http://localhost:4174/lesson/design-thinking-lesson-1");
  await page
    .getByRole("button", { name: "Download lesson", exact: true })
    .click();
  await expect(
    page.getByText("Saved for offline learning for 24 hours.", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "A different way to solve problems",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Design thinking is a human-centred, iterative approach", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Your lesson note")
    .fill("A little note captured completely offline.");
  await page
    .getByRole("button", { name: "Save a little thought", exact: false })
    .click();
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
    for (const key of Object.keys(localStorage).filter((k) =>
      k.endsWith(":downloads"),
    )) {
      const rows = JSON.parse(localStorage.getItem(key) || "[]");
      rows.forEach((r: any) => (r.expires = Date.now() - 1000));
      localStorage.setItem(key, JSON.stringify(rows));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText(
      "Download this lesson while online before reading offline. Downloads expire after 24 hours.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".lesson-prose")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});

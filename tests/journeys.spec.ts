import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const cp = "http://localhost:7311",
  app = "http://localhost:7312";
async function owner(page: any) {
  await page.goto(cp);
  await page.getByRole("button", { name: "Sign in to dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Your coaching, at a glance" }),
  ).toBeVisible();
}
async function learner(page: any) {
  await page.goto(app);
  await page.getByRole("button", { name: "Let’s get learning" }).click();
  await expect(
    page.getByRole("heading", { name: /Hello, Aarav/ }),
  ).toBeVisible();
}
test("new learner requests a package; owner verifies payment, activates separately, then blocks access", async ({
  browser,
}) => {
  const lc = await browser.newContext({
      viewport: { width: 393, height: 852 },
    }),
    oc = await browser.newContext();
  const l = await lc.newPage(),
    o = await oc.newPage();
  const email = `admission-${Date.now()}@test.in`;
  await l.goto(app);
  await l.getByRole("button", { name: /New here/ }).click();
  await l.getByLabel("Full name", { exact: true }).fill("Ananya Admission");
  await l.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await l.getByLabel("Email address", { exact: true }).fill(email);
  await l.getByLabel("Password", { exact: true }).fill("AdmissionTest2026!");
  await l.getByLabel(/I agree to/).check();
  await l
    .getByRole("button", { name: "Create my account", exact: true })
    .click();
  await expect(l.getByRole("heading", { name: /Hello, Ananya/ })).toBeVisible();
  await l.goto(app + "/plans");
  await l
    .locator(".package-card")
    .filter({
      has: l.getByRole("heading", {
        name: "JEE Physics · 90 days",
        exact: true,
      }),
    })
    .getByRole("button", { name: /Choose this package/ })
    .click();
  await l.getByRole("combobox").selectOption("UPI");
  await l.getByRole("button", { name: "Send package request" }).click();
  await expect(l.getByText("Pending payment", { exact: true })).toBeVisible();
  await l.getByRole("button", { name: /I’ve paid/ }).click();
  await l
    .getByLabel("UPI / bank reference or cash receipt number", { exact: true })
    .fill("UPI-TEST-123456");
  await l.getByRole("button", { name: "Submit for verification" }).click();
  await expect(l.getByText("Pending approval", { exact: true })).toBeVisible();
  await owner(o);
  await o.goto(cp + "/admissions");
  const row = o.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Review", exact: true }).click();
  await o.getByLabel("I have verified receipt of this payment.").check();
  await o.getByLabel("Activate the learner account as well.").uncheck();
  await o
    .getByLabel("Review note", { exact: true })
    .fill("UPI payment checked against statement");
  await o
    .getByRole("button", { name: "Approve subscription", exact: true })
    .click();
  await expect(o.getByRole("dialog")).toHaveCount(0);
  await l.goto(app + "/lesson/jee-physics-2027-lesson-1");
  await expect(
    l.getByText(/owner needs to activate your account/),
  ).toBeVisible();
  await o.goto(cp + "/learners");
  await o.getByLabel("Search learners", { exact: true }).fill(email);
  await o.getByRole("button", { name: "Manage", exact: true }).click();
  await o.getByLabel("Account status", { exact: true }).selectOption("Active");
  await o
    .getByLabel("Reason for this change", { exact: true })
    .fill("Identity verified by admissions");
  await o.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(o.getByRole("dialog")).toHaveCount(0);
  await l.goto(app + "/course/jee-physics-2027");
  await l.getByRole("button", { name: "Start learning", exact: true }).click();
  await expect(
    l.getByRole("heading", {
      name: "Welcome to your physics journey",
      exact: true,
    }),
  ).toBeVisible();
  await l
    .getByRole("button", { name: "Complete & next lesson", exact: true })
    .click();
  await expect(
    l.getByRole("heading", {
      name: "Newton’s laws · a quick revision",
      exact: true,
    }),
  ).toBeVisible();
  await o.getByRole("button", { name: "Manage", exact: true }).click();
  await o.getByLabel("Account status", { exact: true }).selectOption("Blocked");
  await o
    .getByLabel("Reason for this change", { exact: true })
    .fill("Account requires owner review");
  await o.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(o.getByRole("dialog")).toHaveCount(0);
  const status = await l.evaluate(async () => {
    const r = await fetch("/api/v1/me", {
      headers: { "X-Qubit-Surface": "learner" },
    });
    return r.status;
  });
  expect(status).toBe(401);
  await lc.close();
  await oc.close();
});
test("owner creates a course, uploads a Word resource, previews and publishes it", async ({
  page,
}) => {
  await owner(page);
  await page.goto(cp + "/courses");
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  const title = "JEE Mechanics " + Date.now();
  await page.getByLabel("Course title", { exact: true }).fill(title);
  await page.getByLabel("Faculty name", { exact: true }).fill("Dr. Ananya Rao");
  await page.getByLabel("Batch name", { exact: true }).fill("Lakshya 2027");
  await page
    .getByLabel("About this course", { exact: true })
    .fill("A focused mechanics revision course with accessible chapter notes.");
  await page
    .getByLabel("Learning outcomes", { exact: true })
    .fill("Explain Newton’s second law and draw free-body diagrams.");
  await page
    .getByRole("button", { name: "Create course draft", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add lesson", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("I have permission to share this content with learners.", {
      exact: true,
    })
    .check();
  await dialog
    .locator("input[type=file]")
    .setInputFiles("server/assets/study-workbook.docx");
  await expect(
    dialog.getByText("Attached resources (1)", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel("Lesson title", { exact: true })
    .fill("Newton’s laws revision workbook");
  await dialog
    .getByLabel("Lesson format", { exact: true })
    .selectOption("Document");
  await dialog
    .getByLabel("Reading notes or video transcript", { exact: true })
    .fill(
      "Read the attached workbook. Identify all external forces before applying Newton’s second law.",
    );
  await dialog
    .getByLabel("I have permission to publish this lesson", { exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByText("QUBIT COACHING | CHAPTER REVISION WORKBOOK", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Review & publish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm owner review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish course", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publish course", exact: true })
    .click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
});
test("learner plays protected video and renders a real PDF on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await learner(page);
  await page.goto(app + "/lesson/jee-physics-2027-lesson-2");
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(1);
  await video.evaluate((v: HTMLVideoElement) => v.play());
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await page.goto(app + "/lesson/jee-physics-2027-lesson-3");
  await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((c: HTMLCanvasElement) => c.width),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});
test("owner and learner navigation remain usable with no serious accessibility violations", async ({
  browser,
}) => {
  for (const [kind, viewport] of [
    ["owner", { width: 1440, height: 1000 }],
    ["learner", { width: 393, height: 852 }],
  ] as const) {
    const context = await browser.newContext({ viewport }),
      page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await (kind === "owner" ? owner(page) : learner(page));
    await page.waitForTimeout(300);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.filter((v) =>
        ["critical", "serious"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    for (const path of kind === "owner"
      ? [
          "/learners",
          "/courses",
          "/packages",
          "/reports",
          "/workspace",
          "/permissions",
        ]
      : ["/courses", "/tests", "/subscription", "/profile"]) {
      await page.goto((kind === "owner" ? cp : app) + path);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});

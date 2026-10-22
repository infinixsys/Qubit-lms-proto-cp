import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { totp } from "../server/security.mjs";
const cp = "http://localhost:7311",
  app = "http://localhost:7312";
async function owner(page: any) {
  await page.goto(cp);
  await page
    .getByRole("button", { name: "Sign in to dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your institute, at a glance",
      exact: true,
    }),
  ).toBeVisible();
}
async function learner(page: any) {
  await page.goto(app);
  await page
    .getByRole("button", { name: "Let’s get learning", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Hello, Aarav/ }),
  ).toBeVisible();
}
const adminPost = (p: any, path: string, data: any) =>
  p.request.post(cp + "/api/v1" + path, {
    headers: { "X-Qubit-Surface": "admin" },
    data,
  });
test("learner import validates before commit and a one-use invitation sets a password without activating access", async ({
  browser,
}) => {
  const oc = await browser.newContext(),
    lc = await browser.newContext(),
    p = await oc.newPage(),
    join = await lc.newPage();
  await owner(p);
  await p.goto(cp + "/directory");
  await p.getByRole("button", { name: "Import learners", exact: true }).click();
  const dialog = p.getByRole("dialog");
  await dialog
    .getByLabel("CSV content", { exact: true })
    .fill("name,email,phone\nA,not-email,123");
  await dialog
    .getByRole("button", { name: "Validate file", exact: true })
    .click();
  await expect(dialog.getByText("1 invalid", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Import validated learners",
      exact: true,
    }),
  ).toHaveCount(0);
  const email = "import-browser-" + Date.now() + "@test.in";
  await dialog
    .getByLabel("CSV content", { exact: true })
    .fill("name,email,phone\nAnanya Repair," + email + ",9876543210");
  await dialog
    .getByRole("button", { name: "Validate file", exact: true })
    .click();
  await expect(dialog.getByText("1 valid", { exact: true })).toBeVisible();
  await dialog
    .getByLabel("Import reason", { exact: true })
    .fill("New repair institute batch admission");
  await dialog
    .getByLabel("Confirm owner password", { exact: true })
    .fill("QubitDemo2026!");
  await dialog
    .getByRole("button", { name: "Import validated learners", exact: true })
    .click();
  await expect(
    p.getByRole("dialog", {
      name: "Your learner invitation links",
      exact: true,
    }),
  ).toBeVisible();
  const link = await p
    .getByLabel("Invitation link for Ananya Repair", { exact: true })
    .inputValue();
  await join.goto(link);
  await expect(join.getByText(email, { exact: false })).toBeVisible();
  await join
    .getByLabel("Choose a password (12+ characters)", { exact: true })
    .fill("InvitationBrowser2026!");
  await join
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect(join.getByText(/Your password is ready/)).toBeVisible();
  await join.goto(link);
  await expect(join.getByText(/expired or already used/)).toBeVisible();
  await p.getByRole("button", { name: "Close dialog", exact: true }).click();
  await p.getByLabel("Search directory", { exact: true }).fill(email);
  await expect(p.getByRole("row").filter({ hasText: email })).toContainText(
    "Pending activation",
  );
  await oc.close();
  await lc.close();
});
test("draft assessment rules survive review and publication and the learner sees the published policy", async ({
  browser,
}) => {
  const oc = await browser.newContext(),
    lc = await browser.newContext(),
    p = await oc.newPage(),
    l = await lc.newPage();
  await owner(p);
  const title = "Bench diagnostic practice " + Date.now(),
    copy = await adminPost(p, "/owner/courses/laptop-diagnostics/duplicate", {
      title,
    });
  expect(copy.ok()).toBeTruthy();
  const c = await copy.json();
  for (let i = 0; i < 3; i++) {
    const q = await adminPost(p, "/admin/resources/questions", {
      courseId: c.id,
      type: "single",
      prompt: "Which preparation protects an unpowered training board? " + i,
      options: ["Checked ESD setup", "Apply heat immediately"],
      answer: 0,
      explanation: "Use a checked ESD setup and follow the trainer's guidance.",
      reference: "Bench induction",
    });
    expect(q.ok()).toBeTruthy();
  }
  await p.goto(cp + "/assessments");
  await p.getByLabel("Search assessment courses", { exact: true }).fill(title);
  await p
    .getByRole("button", { name: "Edit assessment rules", exact: true })
    .click();
  await p.getByLabel("Duration (minutes)", { exact: true }).fill("9");
  await p.getByLabel("Maximum attempts", { exact: true }).fill("2");
  await p.getByLabel("Passing score (%)", { exact: true }).fill("75");
  await p.getByLabel("Questions per attempt", { exact: true }).fill("3");
  await p
    .getByLabel("Show answers and explanations", { exact: true })
    .selectOption("After passing");
  await p
    .getByLabel("Require a competent practical review for certification", {
      exact: true,
    })
    .check();
  await p
    .getByLabel("Reason for changing the rules", { exact: true })
    .fill("New supervised repair practice policy for this institute course");
  await p
    .getByRole("button", { name: "Save draft assessment policy", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await p.goto(cp + "/publishing");
  const row = p.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: "Review draft", exact: true }).click();
  await p
    .getByLabel("Review decision", { exact: true })
    .selectOption("Approve");
  await p
    .getByLabel("Review comments & exact lesson reference", { exact: true })
    .fill(
      "Safety transcript and assessment rules reviewed for the first module.",
    );
  await p.getByRole("button", { name: "Record review", exact: true }).click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await p.goto(cp + "/courses/" + c.id);
  await p
    .getByRole("button", { name: "Review & publish", exact: true })
    .click();
  const confirmReview = p.getByRole("button", {
    name: "Confirm owner review",
    exact: true,
  });
  if (await confirmReview.count()) await confirmReview.click();
  await p.getByRole("button", { name: "Publish course", exact: true }).click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  const grant = await adminPost(p, "/owner/learners/learner-demo/access", {
    courseIds: [c.id],
    days: 14,
    reason: "Supervised browser assessment verification",
  });
  expect(grant.ok()).toBeTruthy();
  await learner(l);
  await l.goto(app + "/quiz/" + c.id);
  await expect(l.locator(".quiz-facts")).toContainText("75%");
  await expect(l.locator(".quiz-facts")).toContainText("9");
  await expect(l.locator(".quiz-facts")).toContainText("2");
  await oc.close();
  await lc.close();
});
test("scoped announcement is published to a learner inbox and reports can save their filters", async ({
  browser,
}) => {
  const oc = await browser.newContext(),
    lc = await browser.newContext(),
    p = await oc.newPage(),
    l = await lc.newPage();
  await owner(p);
  await p.goto(cp + "/communications");
  await p
    .getByRole("button", { name: "Create announcement", exact: true })
    .click();
  await p.getByLabel("Audience", { exact: true }).selectOption("Course");
  await p
    .getByLabel("Course audience", { exact: true })
    .selectOption("laptop-diagnostics");
  const title = "Bench preparation reminder " + Date.now();
  await p.getByLabel("Announcement title", { exact: true }).fill(title);
  await p
    .getByLabel("Message", { exact: true })
    .fill(
      "Prepare your ESD setup and bring an unpowered training board to the next supervised bench class.",
    );
  await p
    .getByLabel("I reviewed the message and selected audience", { exact: true })
    .check();
  await p
    .getByRole("button", {
      name: "Publish or schedule announcement",
      exact: true,
    })
    .click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await expect(p.getByRole("row").filter({ hasText: title })).toContainText(
    "Published",
  );
  await learner(l);
  await l.goto(app + "/updates");
  await expect(l.getByText(title, { exact: true })).toBeVisible();
  await p.goto(cp + "/reports");
  await p
    .getByLabel("Course", { exact: true })
    .selectOption("laptop-diagnostics");
  await p.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(p).toHaveURL(/courseId=laptop-diagnostics/);
  await p.getByRole("button", { name: "Save this view", exact: true }).click();
  const name = "Laptop outcomes " + Date.now();
  await p.getByLabel("Report view name", { exact: true }).fill(name);
  await p
    .getByRole("button", { name: "Save report view", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await expect(
    p
      .getByLabel("Saved learning reports", { exact: true })
      .getByRole("option", { name, exact: true }),
  ).toHaveCount(1);
  await oc.close();
  await lc.close();
});
test("staff enables MFA, signs in with a recovery code and disables it with independent verification", async ({
  browser,
}) => {
  const oc = await browser.newContext(),
    sc = await browser.newContext(),
    o = await oc.newPage(),
    p = await sc.newPage();
  await owner(o);
  const email = "secure-staff-" + Date.now() + "@test.in",
    password = "StaffBrowserSecurity2026!";
  const created = await adminPost(o, "/owner/staff", {
    name: "Sandeep Security Test",
    email,
    role: "Instructor",
    initialPassword: password,
    password: "QubitDemo2026!",
    reason: "Verify staff authenticator workflow",
  });
  expect(created.ok()).toBeTruthy();
  await p.goto(cp);
  await p.getByLabel("Work email", { exact: true }).fill(email);
  await p.getByLabel("Password", { exact: true }).fill(password);
  await p
    .getByRole("button", { name: "Sign in to dashboard", exact: true })
    .click();
  await expect(
    p.getByRole("heading", {
      name: "Your institute, at a glance",
      exact: true,
    }),
  ).toBeVisible();
  await p.goto(cp + "/security");
  await p
    .getByRole("button", { name: "Set up authenticator", exact: true })
    .click();
  await p
    .getByLabel("Confirm current password", { exact: true })
    .fill(password);
  await p
    .getByRole("button", { name: "Generate setup key", exact: true })
    .click();
  const secret = await p
    .getByLabel("Authenticator setup key", { exact: true })
    .inputValue();
  await p
    .getByLabel("6-digit authenticator code", { exact: true })
    .fill(totp(secret));
  await p
    .getByRole("button", {
      name: "Confirm & enable authenticator",
      exact: true,
    })
    .click();
  await expect(
    p.getByRole("dialog", { name: "Save your recovery codes", exact: true }),
  ).toBeVisible();
  const codes = await p.locator(".recovery-codes code").allTextContents();
  expect(codes.length).toBe(8);
  await p.getByRole("button", { name: "Close dialog", exact: true }).click();
  await p.getByRole("button", { name: "Sign out", exact: true }).click();
  await p.getByLabel("Work email", { exact: true }).fill(email);
  await p.getByLabel("Password", { exact: true }).fill(password);
  await p
    .getByRole("button", { name: "Sign in to dashboard", exact: true })
    .click();
  await expect(
    p.getByRole("heading", { name: "Verify your sign-in", exact: true }),
  ).toBeVisible();
  await p
    .getByLabel("Authenticator or recovery code", { exact: true })
    .fill(codes[0]);
  await p
    .getByRole("button", { name: "Verify & sign in", exact: true })
    .click();
  await expect(
    p.getByRole("heading", {
      name: "Your institute, at a glance",
      exact: true,
    }),
  ).toBeVisible();
  await p.goto(cp + "/security");
  await p
    .getByRole("button", { name: "Manage authenticator", exact: true })
    .click();
  await p.getByLabel("Current password", { exact: true }).fill(password);
  await p
    .getByLabel("Authenticator or recovery code", { exact: true })
    .fill(codes[1]);
  await p
    .getByLabel("Reason for disabling", { exact: true })
    .fill("Completed sign-in verification for this test account");
  await p
    .getByRole("button", { name: "Disable authenticator", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await expect(p.getByText("Password only", { exact: true })).toBeVisible();
  await oc.close();
  await sc.close();
});
test("control-centre pages are keyboard searchable, responsive and free of serious automated accessibility violations", async ({
  page,
}) => {
  await owner(page);
  await page.keyboard.press("Control+k");
  await page.getByLabel("Command search", { exact: true }).fill("privacy");
  await page
    .getByRole("button", { name: /Privacy requests.*Workspace page/ })
    .click();
  await expect(page).toHaveURL(cp + "/governance");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    for (const path of [
      "/directory",
      "/assessments",
      "/publishing",
      "/communications",
      "/reports",
      "/governance",
      "/security",
      "/operations",
      "/workspace",
    ]) {
      await page.goto(cp + path);
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForTimeout(200);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        path + " overflow at " + width,
      ).toBe(false);
      if (width === 1440) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        expect(
          result.violations.filter((v) =>
            ["serious", "critical"].includes(v.impact || ""),
          ),
          path,
        ).toEqual([]);
      }
    }
  }
  expect(errors).toEqual([]);
});

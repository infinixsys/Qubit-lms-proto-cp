import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const APP = "http://localhost:5174",
  ADMIN = "http://localhost:5173";
const password = "JourneyTest2026!";
test("learner completes learning, notes, offline sync, assessment, certificate, and assignment review", async ({
  browser,
}) => {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `journey-${Date.now()}@example.test`;
  await page.goto(APP);
  await page
    .getByRole("button", { name: "Create an account", exact: false })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Taylor Journey");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password · at least 12 characters").fill(password);
  await page
    .getByLabel("I agree to the prototype terms and privacy notice.")
    .check();
  await page
    .getByRole("button", { name: "Create your space", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Welcome back", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Taylor" }),
  ).toBeVisible();
  await page.goto(APP + "/explore");
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Design thinking for everyday innovation",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("heading", {
      name: "Design thinking for everyday innovation",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Begin your journey · Free", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Start learning", exact: false }),
  ).toBeVisible();
  await page.goto(APP + "/lesson/design-thinking-lesson-1");
  await page
    .getByLabel("Your lesson note")
    .fill(
      "A prototype is a question made tangible. Start with people and listen carefully.",
    );
  await page
    .getByRole("button", { name: "Save a little thought", exact: false })
    .click();
  await expect(
    page.getByText(
      "A prototype is a question made tangible. Start with people and listen carefully.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Download lesson", exact: true })
    .click();
  await expect(
    page.getByText("Saved for offline learning for 24 hours.", { exact: true }),
  ).toBeVisible();
  // A downloaded lesson stays readable offline. Progress queues and is sent once after reconnect.
  await context.setOffline(true);
  await expect(
    page.getByText(
      "You’re offline. Downloaded lessons and local notes are available.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete & continue", exact: false })
    .click();
  await page.waitForTimeout(300);
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
  for (let i = 2; i <= 6; i++) {
    await page.goto(APP + `/lesson/design-thinking-lesson-${i}`);
    await page
      .getByRole("button", { name: "Complete & continue", exact: false })
      .click();
  }
  await page.goto(APP + "/quiz/design-thinking");
  await page
    .getByRole("button", {
      name: "Let’s give it a little thought",
      exact: false,
    })
    .click();
  for (let i = 0; i < 5; i++) {
    const prompt = await page.locator(".quiz-question h1").innerText();
    if (prompt.includes("begin with"))
      await page
        .getByText("Understanding people and their context", { exact: true })
        .click();
    else if (prompt.includes("interview"))
      await page
        .getByText("Tell me about the last time you experienced this.", {
          exact: true,
        })
        .click();
    else if (prompt.includes("criteria")) {
      for (const s of ["Desirability", "Feasibility", "Viability"])
        await page.getByText(s, { exact: true }).click();
    } else if (prompt.includes("fully functional"))
      await page.getByText("False", { exact: true }).click();
    else await page.getByLabel("Your answer", { exact: true }).fill("tangible");
    await page
      .getByRole("button", {
        name: i === 4 ? "Review answers" : "Next question",
        exact: false,
      })
      .click();
  }
  await page
    .getByRole("button", { name: "Submit your assessment", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Look at you grow." }),
  ).toBeVisible();
  await expect(page.locator(".result-score")).toHaveText("100%");
  await page.goto(APP + "/certificates");
  await page
    .getByRole("button", { name: "Check eligibility", exact: false })
    .first()
    .click();
  await expect(page.locator(".certificate-print")).toContainText(
    "Taylor Journey",
  );
  await page
    .getByRole("button", { name: "Verify authenticity", exact: false })
    .click();
  await expect(
    page.getByText("Verification: Valid.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.goto(APP + "/assignments");
  await page
    .getByRole("button", {
      name: "Your first human-centred challenge",
      exact: false,
    })
    .click();
  await page
    .getByLabel("Your reflection", { exact: true })
    .fill(
      "I interviewed a commuter to understand uncertainty. My problem statement focuses on a calmer morning. I would prototype a paper journey planner and test it with three commuters.",
    );
  await page
    .getByRole("button", { name: "Submit your work", exact: false })
    .click();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
  const admin = await browser.newContext(),
    ap = await admin.newPage();
  await ap.goto(ADMIN);
  await ap
    .getByRole("button", { name: "Enter demo workspace", exact: true })
    .click();
  await expect(
    ap.getByRole("heading", { name: "Good morning, Alex." }),
  ).toBeVisible();
  await ap.goto(ADMIN + "/submissions");
  await ap
    .getByRole("button", {
      name: "View Your first human-centred challenge",
      exact: true,
    })
    .last()
    .click();
  await ap
    .getByRole("button", { name: "Review & give feedback", exact: false })
    .click();
  await ap.getByLabel("Score (0–100)", { exact: true }).fill("92");
  await ap
    .getByLabel("Rubric feedback", { exact: true })
    .fill(
      "Thoughtful research, a clearly framed need, and a practical prototype rationale.",
    );
  await ap.getByLabel("Review outcome", { exact: true }).selectOption("Graded");
  await ap.getByRole("button", { name: "Save changes", exact: false }).click();
  await page.goto(APP + "/assignments");
  await page
    .getByRole("button", {
      name: "Your first human-centred challenge",
      exact: false,
    })
    .click();
  await expect(page.getByText("92/100", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Thoughtful research, a clearly framed need, and a practical prototype rationale.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await admin.close();
  await context.close();
});
test("admin authors, reviews, preflights and publishes a new course", async ({
  page,
}) => {
  await page.goto(ADMIN);
  await page
    .getByRole("button", { name: "Enter demo workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Good morning, Alex." }),
  ).toBeVisible();
  await page.goto(ADMIN + "/courses");
  await page
    .getByRole("button", { name: "Create a course", exact: false })
    .click();
  const title = "A little possibility " + Date.now();
  await page.getByLabel("Course title", { exact: true }).fill(title);
  await page
    .getByLabel("Course description", { exact: true })
    .fill(
      "Learn to observe everyday problems and turn insights into small, testable prototypes.",
    );
  await page.getByLabel("Instructor", { exact: true }).fill("Olivia Rhye");
  await page
    .getByLabel("Learning outcomes · separate with semicolons", { exact: true })
    .fill("Observe real needs; Build a small prototype");
  await page
    .getByRole("button", { name: "Create draft", exact: false })
    .click();
  await page.getByRole("button", { name: "Curriculum", exact: true }).click();
  await page.getByRole("button", { name: "Add lesson", exact: false }).click();
  await page
    .getByLabel("Lesson title", { exact: true })
    .fill("A first little experiment");
  await page
    .getByLabel("Lesson content or transcript", { exact: true })
    .fill(
      "Start by listening to people, noting observations, and building the smallest useful prototype to test your assumptions.",
    );
  await page
    .getByLabel("I confirm the rights to this content", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Add lesson", exact: false })
    .last()
    .click();
  await expect(
    page.getByText("A first little experiment", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publishing", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve human review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run preflight", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish version 1", exact: false }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publish version 1", exact: false })
    .click();
  await expect(
    page.getByText("Published · Version 1", { exact: false }),
  ).toBeVisible();
});
test("admin and learner overview pass automated accessibility checks on desktop and mobile", async ({
  browser,
}) => {
  for (const [url, button] of [
    [ADMIN, "Enter demo workspace"],
    [APP, "Explore the learner demo"],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(url);
    await page.getByRole("button", { name: button, exact: true }).click();
    await page.waitForTimeout(1200);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    await context.close();
  }
});
test("every admin workspace and learner screen renders without browser errors", async ({
  browser,
}) => {
  for (const [url, button, routes] of [
    [
      ADMIN,
      "Enter demo workspace",
      [
        "courses",
        "users",
        "roles",
        "groups",
        "questions",
        "assignments",
        "submissions",
        "media",
        "sessions",
        "discussions",
        "certificates",
        "analytics",
        "intelligence",
        "notifications",
        "tenants",
        "plans",
        "transactions",
        "operations",
        "jobs",
        "incidents",
        "backups",
        "audit",
        "privacy",
        "integrations",
        "flags",
        "reports",
        "prompts",
        "settings",
        "account",
        "tickets",
      ],
    ],
    [
      APP,
      "Explore the learner demo",
      [
        "explore",
        "learning",
        "course/design-thinking",
        "lesson/design-thinking-lesson-1",
        "assignments",
        "progress",
        "assistant",
        "downloads",
        "notifications",
        "community",
        "live",
        "certificates",
        "profile",
        "support",
      ],
    ],
  ] as const) {
    const context = await browser.newContext(),
      page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: url === ADMIN ? "Good morning, Alex." : "Hello, Jamie",
      }),
    ).toBeVisible();
    for (const route of routes) {
      await page.goto(url + "/" + route);
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(120);
      await expect(page.locator(".error-state")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.mjs";
let app;
const cookies = {};
async function request(method, url, body, who = "learner", headers = {}) {
  const surface = ["admin", "tenant", "support", "finance", "olivia"].includes(
    who,
  )
    ? "admin"
    : "learner";
  return app.inject({
    method,
    url: "/api/v1" + url,
    headers: {
      "x-qubit-surface": surface,
      ...(cookies[who] ? { cookie: cookies[who] } : {}),
      ...headers,
    },
    ...(body !== undefined ? { payload: body } : {}),
  });
}
async function login(who, email) {
  const r = await request(
    "POST",
    "/auth/login",
    { email: email || who + "@qubit.demo", password: "QubitDemo2026!" },
    who,
  );
  assert.equal(r.statusCode, 200, r.body);
  cookies[who] = r.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  return r;
}
before(async () => {
  app = await createApp({ dbPath: ":memory:" });
  for (const [who, email] of [
    ["admin"],
    ["learner"],
    ["tenant"],
    ["support"],
    ["finance"],
    ["studio"],
    ["olivia"],
  ])
    await login(who, email);
});
after(async () => app.close());
test("health, real password authentication and protected routes", async () => {
  assert.equal((await request("GET", "/health")).json().database, "connected");
  assert.equal(
    (
      await request("POST", "/auth/login", {
        email: "learner@qubit.demo",
        password: "wrong",
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (await app.inject({ method: "GET", url: "/api/v1/me" })).statusCode,
    401,
  );
  assert.equal(
    (
      await request(
        "POST",
        "/auth/login",
        { email: "learner@qubit.demo", password: "QubitDemo2026!" },
        "admin",
      )
    ).statusCode,
    403,
  );
});
test("server permission checks deny learners, support and finance access to users", async () => {
  for (const who of ["learner", "support", "finance"])
    assert.equal(
      (await request("GET", "/admin/users", undefined, who)).statusCode,
      403,
    );
  const users = (
    await request("GET", "/admin/users", undefined, "admin")
  ).json();
  assert.ok(users.length > 10);
  assert.ok(users.every((u) => !("password" in u)));
});
test("tenant boundaries protect catalogue and ID-based resources", async () => {
  assert.equal(
    (await request("GET", "/catalog/courses", undefined, "studio")).json()
      .length,
    0,
  );
  assert.equal(
    (
      await request(
        "GET",
        "/lessons/design-thinking-lesson-1",
        undefined,
        "studio",
      )
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/users/other-learner",
        { name: "Forbidden edit", reason: "Testing isolation" },
        "tenant",
      )
    ).statusCode,
    404,
  );
  assert.ok(
    (await request("GET", "/admin/users", undefined, "tenant"))
      .json()
      .every((u) => u.tenant === "tenant-demo"),
  );
});
test("CSRF surface and origin checks reject unsafe browser writes", async () => {
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {},
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await request("POST", "/auth/password-reset", {}, "learner", {
        origin: "https://malicious.example",
      })
    ).statusCode,
    403,
  );
});
test("enrolment is idempotent and restricted course access needs a server grant", async () => {
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await request("POST", "/courses/creative-confidence/enrolments", {}))
        .statusCode,
      200,
    );
  assert.equal(
    app.store.db
      .prepare(
        "SELECT count(*) n FROM enrolments WHERE user_id=? AND course_id=?",
      )
      .get("learner-demo", "creative-confidence").n,
    1,
  );
  assert.equal(
    (await request("POST", "/courses/systems-thinking/enrolments", {}))
      .statusCode,
    403,
  );
  assert.equal(
    (await request("GET", "/lessons/systems-thinking-lesson-1")).statusCode,
    403,
  );
});
test("progress deduplication is durable and completion never decreases", async () => {
  const body = { completed: true, position: 10, key: "progress-test-01" };
  assert.equal(
    (
      await request("PUT", "/lessons/design-thinking-lesson-3/progress", body)
    ).json().duplicate,
    false,
  );
  assert.equal(
    (
      await request("PUT", "/lessons/design-thinking-lesson-3/progress", body)
    ).json().duplicate,
    true,
  );
  await request("PUT", "/lessons/design-thinking-lesson-3/progress", {
    completed: false,
    position: 0,
    key: "progress-test-02",
  });
  const row = app.store.db
    .prepare("SELECT * FROM progress WHERE user_id=? AND lesson_id=?")
    .get("learner-demo", "design-thinking-lesson-3");
  assert.equal(row.completed, 1);
  assert.equal(row.position, 10);
  assert.equal(
    (
      await request("PUT", "/lessons/design-thinking-lesson-3/progress", {
        completed: true,
        position: 999999,
        key: "progress-test-03",
      })
    ).statusCode,
    400,
  );
});
test("quiz questions do not leak answers; the server owns grading and submission is idempotent", async () => {
  const start = await request("POST", "/quizzes/design-thinking/attempts", {});
  assert.equal(start.statusCode, 200, start.body);
  const a = start.json();
  assert.equal(a.questions.length, 5);
  assert.ok(
    a.questions.every((q) => !("answer" in q) && !("explanation" in q)),
  );
  assert.equal(
    (await request("POST", "/quiz-attempts/" + a.id + "/submit", {}, "studio"))
      .statusCode,
    404,
  );
  const answers = Object.fromEntries(
    app.store.list("questions").map((q) => [q.id, q.answer]),
  );
  assert.equal(
    (await request("PUT", "/quiz-attempts/" + a.id + "/responses", answers))
      .statusCode,
    200,
  );
  const submit = await request("POST", "/quiz-attempts/" + a.id + "/submit", {
    score: 0,
  });
  assert.equal(submit.json().score, 100);
  assert.equal(submit.json().passed, true);
  assert.equal(
    (await request("POST", "/quiz-attempts/" + a.id + "/submit", {})).json()
      .score,
    100,
  );
  assert.equal(
    (await request("PUT", "/quiz-attempts/" + a.id + "/responses", answers))
      .statusCode,
    409,
  );
});
test("assessment time limits and attempt limits are enforced by the server", async () => {
  const a = (
    await request("POST", "/quizzes/product-strategy/attempts", {})
  ).json();
  app.store.db
    .prepare("UPDATE attempts SET started=? WHERE id=?")
    .run(Date.now() - 16 * 60000, a.id);
  assert.equal(
    (await request("POST", "/quiz-attempts/" + a.id + "/submit", {}))
      .statusCode,
    409,
  );
  for (let i = 0; i < 2; i++) {
    const b = (
      await request("POST", "/quizzes/product-strategy/attempts", {})
    ).json();
    app.store.db
      .prepare("UPDATE attempts SET started=? WHERE id=?")
      .run(Date.now() - 16 * 60000, b.id);
  }
  assert.equal(
    (await request("POST", "/quizzes/product-strategy/attempts", {}))
      .statusCode,
    409,
  );
});
test("assignments flow from learner submission through staff feedback without duplicate work", async () => {
  const r = await request("POST", "/assignments/as1/submit", {
    text: "I observed a commuter struggling with uncertainty, interviewed them, and prototyped a calmer journey planner.",
  });
  assert.equal(r.statusCode, 200, r.body);
  const sub = r.json();
  assert.equal(
    (
      await request("POST", "/assignments/as1/submit", {
        text: "A second submission should not replace an immutable submission.",
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/resources/submissions/" + sub.id,
        {
          grade: 90,
          feedback: "Strong observations and a clear problem statement.",
          status: "Graded",
        },
        "olivia",
      )
    ).statusCode,
    200,
  );
  const learning = (await request("GET", "/me/learning")).json();
  assert.equal(learning.submissions[0].grade, 90);
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/resources/submissions/" + sub.id,
        { grade: 200 },
        "admin",
      )
    ).statusCode,
    400,
  );
});
test("certificate eligibility requires every required lesson and passing assessment", async () => {
  assert.equal(
    (await request("POST", "/courses/design-thinking/certificate", {}))
      .statusCode,
    409,
  );
  for (let i = 1; i <= 6; i++)
    await request("PUT", `/lessons/design-thinking-lesson-${i}/progress`, {
      completed: true,
      key: "certificate-event-" + i,
    });
  const c = await request("POST", "/courses/design-thinking/certificate", {});
  assert.equal(c.statusCode, 200, c.body);
  assert.equal(
    (await request("POST", "/courses/design-thinking/certificate", {})).json()
      .id,
    c.json().id,
  );
  assert.equal(
    (await request("GET", "/certificates/" + c.json().id + "/verify")).json()
      .status,
    "Valid",
  );
  await request(
    "PATCH",
    "/admin/resources/certificates/" + c.json().id,
    { status: "Revoked", reason: "Test revocation" },
    "admin",
  );
  assert.equal(
    (await request("GET", "/certificates/" + c.json().id + "/verify")).json()
      .status,
    "Revoked",
  );
});
test("publishing preflight blocks incomplete drafts and old course versions remain accessible", async () => {
  const r = await request(
    "POST",
    "/admin/courses",
    {
      title: "A thoughtful new course",
      description:
        "A course with clear outcomes and a practical learning experience.",
      category: "Design",
      level: "Beginner",
      instructor: "Olivia Rhye",
      outcomes: "Frame better problems",
      access: "Open",
    },
    "admin",
  );
  assert.equal(r.statusCode, 200, r.body);
  const c = r.json();
  assert.equal(
    (await request("POST", "/admin/courses/" + c.id + "/publish", {}, "admin"))
      .statusCode,
    409,
  );
  assert.equal((await request("GET", "/courses/" + c.id)).statusCode, 404);
  await request(
    "POST",
    "/admin/courses/" + c.id + "/lessons",
    {
      title: "A first little step",
      module: "01 · Discover",
      content:
        "A human-centred approach begins with listening to people and understanding their context.",
      type: "Reading",
      duration: 10,
      rights: true,
      captions: true,
    },
    "admin",
  );
  await request(
    "PATCH",
    "/admin/courses/" + c.id,
    { status: "Approved" },
    "admin",
  );
  assert.ok(
    (
      await request(
        "POST",
        "/admin/courses/" + c.id + "/preflight",
        {},
        "admin",
      )
    )
      .json()
      .every((c) => c.passed),
  );
  assert.equal(
    (await request("POST", "/admin/courses/" + c.id + "/publish", {}, "admin"))
      .statusCode,
    200,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/courses/" + c.id,
        { title: "Try mutating published content" },
        "admin",
      )
    ).statusCode,
    409,
  );
  const before = (
    await request("GET", "/lessons/design-thinking-lesson-1")
  ).json().content;
  assert.equal(
    (
      await request(
        "POST",
        "/admin/courses/design-thinking/new-version",
        {},
        "admin",
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (await request("GET", "/lessons/design-thinking-lesson-1")).statusCode,
    200,
  );
  await request(
    "PATCH",
    "/admin/lessons/design-thinking-lesson-1",
    {
      content:
        "A different lesson draft that must never overwrite an existing enrolment’s version.",
    },
    "admin",
  );
  assert.equal(
    (await request("GET", "/lessons/design-thinking-lesson-1")).json().content,
    before,
  );
  const draft = (
    await request(
      "POST",
      "/admin/courses/design-thinking/lessons",
      {
        title: "Unpublished lesson",
        module: "04 · Draft",
        content:
          "This draft learning content is private until an approved publication is made.",
        type: "Reading",
        duration: 5,
        rights: true,
        captions: true,
      },
      "admin",
    )
  ).json();
  assert.equal((await request("GET", "/lessons/" + draft.id)).statusCode, 404);
  assert.equal(
    (await request("GET", "/catalog/courses"))
      .json()
      .find((c) => c.id === "design-thinking").title,
    "Design thinking for everyday innovation",
  );
});
test("role changes need password step-up and session revocation is enforced", async () => {
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/users/support-demo",
        { role: "Finance", reason: "Test change" },
        "admin",
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/users/support-demo",
        { role: "Finance", reason: "Test change", password: "QubitDemo2026!" },
        "admin",
      )
    ).statusCode,
    200,
  );
  assert.equal(
    (await request("GET", "/me", undefined, "support")).statusCode,
    401,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/users/admin-demo",
        { status: "Suspended", reason: "Self lockout" },
        "admin",
      )
    ).statusCode,
    409,
  );
});
test("uploads enforce signatures, tenant access and 5MB limits", async () => {
  assert.equal(
    (
      await request("POST", "/uploads", {
        name: "fake.pdf",
        type: "application/pdf",
        data: Buffer.from("not a PDF").toString("base64"),
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await request("POST", "/uploads", {
        name: "script.html",
        type: "text/html",
        data: "hello",
      })
    ).statusCode,
    400,
  );
  const r = await request("POST", "/uploads", {
    name: "reflection.txt",
    type: "text/plain",
    data: Buffer.from("A little reflective learning note.").toString("base64"),
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(
    (await request("GET", "/uploads/" + r.json().id, undefined, "studio"))
      .statusCode,
    404,
  );
  assert.equal(
    (await request("GET", "/uploads/" + r.json().id)).headers[
      "x-content-type-options"
    ],
    "nosniff",
  );
});
test("assistant requires enrolment, respects feature flag and labels its non-generative fallback", async () => {
  const r = await request("POST", "/tutor", {
    lessonId: "design-thinking-lesson-1",
    question: "Explain the core idea",
    mode: "summary",
  });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().provider, null);
  assert.ok(r.json().mode.includes("Reference fallback"));
  assert.equal(
    (
      await request(
        "POST",
        "/tutor",
        {
          lessonId: "design-thinking-lesson-1",
          question: "Show private context",
          mode: "explain",
        },
        "studio",
      )
    ).statusCode,
    404,
  );
  await request(
    "PATCH",
    "/admin/resources/flags/f1",
    { enabled: false },
    "admin",
  );
  assert.equal(
    (
      await request("POST", "/tutor", {
        lessonId: "design-thinking-lesson-1",
        question: "Explain",
        mode: "explain",
      })
    ).statusCode,
    409,
  );
});
test("audit is append-only, exports are audited and unsafe retries remain blocked", async () => {
  const before = (
    await request("GET", "/admin/audit", undefined, "admin")
  ).json().length;
  assert.equal(
    (await request("POST", "/admin/export/users", {}, "admin")).statusCode,
    200,
  );
  const log = (await request("GET", "/admin/audit", undefined, "admin")).json();
  assert.ok(log.length > before);
  assert.ok(log.some((a) => a.action === "Data exported"));
  assert.equal(
    (
      await request(
        "PATCH",
        "/admin/audit/" + log[0].id,
        { actor: "forged" },
        "admin",
      )
    ).statusCode,
    404,
  );
  assert.equal(
    (await request("POST", "/admin/jobs/job3/retry", {}, "admin")).statusCode,
    409,
  );
  assert.equal(
    (await request("POST", "/admin/jobs/job2/retry", {}, "admin")).statusCode,
    409,
  );
});
test("privacy and personal data are owner-scoped and writable fields are allowlisted", async () => {
  assert.equal(
    (await request("PATCH", "/me", { role: "Super Admin" })).statusCode,
    400,
  );
  const r = await request("POST", "/me/privacy", { type: "Account deletion" });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(
    (
      await request("GET", "/learning/resources/privacy", undefined, "studio")
    ).json().length,
    0,
  );
  assert.equal(
    (await request("GET", "/me/export")).json().profile.id,
    "learner-demo",
  );
  assert.ok(
    !JSON.stringify((await request("GET", "/me/export")).json()).includes(
      "password",
    ),
  );
});
test("group membership and cohort access remain tenant-scoped and bulk enrolment is idempotent", async () => {
  assert.equal(
    (
      await request(
        "PUT",
        "/admin/groups/grp1/members",
        { userIds: ["other-learner"], reason: "Cross tenant attempt" },
        "admin",
      )
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await request(
        "PUT",
        "/admin/groups/grp1/members",
        { userIds: ["user-1", "user-2"], reason: "New design cohort" },
        "admin",
      )
    ).statusCode,
    200,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request(
          "POST",
          "/admin/groups/grp1/enrolments",
          {
            courseId: "creative-confidence",
            reason: "Learning programme assignment",
          },
          "admin",
        )
      ).json().assigned,
      2,
    );
  assert.equal(
    app.store.db
      .prepare(
        "SELECT count(*) n FROM enrolments WHERE course_id=? AND user_id IN (?,?)",
      )
      .get("creative-confidence", "user-1", "user-2").n,
    2,
  );
  assert.equal(
    (
      await request(
        "PUT",
        "/admin/groups/grp1/members",
        { userIds: ["user-1"], reason: "Forbidden membership" },
        "learner",
      )
    ).statusCode,
    403,
  );
});
test("explicit offline downloads require eligible content, access and enabled feature", async () => {
  assert.equal(
    (await request("GET", "/lessons/design-thinking-lesson-1/offline"))
      .statusCode,
    200,
  );
  assert.equal(
    (
      await request(
        "GET",
        "/lessons/design-thinking-lesson-1/offline",
        undefined,
        "studio",
      )
    ).statusCode,
    404,
  );
  await request(
    "PATCH",
    "/admin/resources/flags/f2",
    { enabled: false },
    "admin",
  );
  assert.equal(
    (await request("GET", "/lessons/design-thinking-lesson-1/offline"))
      .statusCode,
    409,
  );
});

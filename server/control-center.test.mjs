import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.mjs";
import { totp, encodeBase32 } from "./security.mjs";
import { parseCsv, csvExport } from "./control-center.mjs";
let app, owner, learner, support, course, invited, importPreview, token;
let ip = 30;
const session = (surface = "admin") => ({ surface, ip: "192.0.2." + ++ip });
async function req(method, path, body, s = owner) {
  return app.inject({
    method,
    url: "/api/v1" + path,
    remoteAddress: s?.ip || "127.0.0.1",
    headers: {
      "x-qubit-surface": s?.surface || "admin",
      ...(s?.cookie ? { cookie: s.cookie } : {}),
    },
    ...(body === undefined ? {} : { payload: body }),
  });
}
const ok = (r) => {
  assert.equal(r.statusCode, 200, r.body);
  return r.json();
};
async function login(email, surface = "admin", password = "QubitDemo2026!") {
  const s = session(surface),
    r = await req("POST", "/auth/login", { email, password }, s);
  assert.equal(r.statusCode, 200, r.body);
  return {
    ...s,
    cookie: r.cookies.map((c) => c.name + "=" + c.value).join("; "),
    user: r.json().user,
  };
}
before(async () => {
  app = await createApp({ dbPath: ":memory:" });
  owner = await login("admin@qubit.demo");
  learner = await login("learner@qubit.demo", "learner");
  support = await login("support@qubit.demo");
});
after(async () => app.close());
test("CSV parser handles quoted values and export neutralises spreadsheet formula cells", () => {
  assert.deepEqual(
    parseCsv('name,email,phone\r\n"Khan, Sana",sana@test.in,+919876543210\r\n'),
    [
      ["name", "email", "phone"],
      ["Khan, Sana", "sana@test.in", "+919876543210"],
    ],
  );
  assert.throws(() => parseCsv('name\n"open'));
  assert.ok(csvExport([["=HYPERLINK(x)"]]).startsWith("\"'=HYPERLINK"));
});
test("bulk import validates every row, rejects invalid commits and protects permissions", async () => {
  assert.equal(
    (
      await req(
        "POST",
        "/owner/imports/preview",
        { csv: "name,email,phone\nTest Name,test@test.in," },
        support,
      )
    ).statusCode,
    403,
  );
  const invalid = ok(
    await req("POST", "/owner/imports/preview", {
      csv: "name,email,phone\nA,bad,123\nDuplicate,learner@qubit.demo,",
    }),
  );
  assert.equal(invalid.invalid, 2);
  assert.equal(
    (
      await req("POST", "/owner/imports/" + invalid.id + "/commit", {
        password: "QubitDemo2026!",
        reason: "Testing validated import",
      })
    ).statusCode,
    409,
  );
  importPreview = ok(
    await req("POST", "/owner/imports/preview", {
      csv: 'name,email,phone\n"Khan, Sana",sana-import@test.in,9876543210\nRavi Import,ravi-import@test.in,9876543211',
    }),
  );
  assert.equal(importPreview.valid, 2);
  assert.equal(
    (
      await req("POST", "/owner/imports/" + importPreview.id + "/commit", {
        password: "wrong",
        reason: "Confirm owner import",
      })
    ).statusCode,
    403,
  );
  const r = ok(
    await req("POST", "/owner/imports/" + importPreview.id + "/commit", {
      password: "QubitDemo2026!",
      reason: "October institute intake",
    }),
  );
  assert.equal(r.created, 2);
  assert.equal(r.invitations.length, 2);
  invited = r.invitations[0];
  token = new URLSearchParams(invited.link.split("#")[1]).get("token");
  const again = ok(
    await req("POST", "/owner/imports/" + importPreview.id + "/commit", {
      password: "QubitDemo2026!",
      reason: "Safe retry of the import",
    }),
  );
  assert.equal(again.alreadyCommitted, true);
  assert.equal(again.invitations.length, 0);
  assert.equal(
    app.store.db
      .prepare("SELECT count(*) n FROM users WHERE email='sana-import@test.in'")
      .get().n,
    1,
  );
  assert.equal(
    app.store.db
      .prepare("SELECT status FROM users WHERE id=?")
      .get(invited.userId).status,
    "Pending activation",
  );
  const stored = app.store
    .list("invitations")
    .find((i) => i.userId === invited.userId);
  assert.ok(!JSON.stringify(stored).includes(token));
});
test("invitation redemption is single-use and does not activate accounts or grant learning access", async () => {
  assert.equal(
    ok(
      await req(
        "POST",
        "/auth/invitations/inspect",
        { token },
        session("learner"),
      ),
    ).email,
    "sana-import@test.in",
  );
  ok(
    await req(
      "POST",
      "/auth/invitations/accept",
      { token, password: "ImportedLearner2026!" },
      session("learner"),
    ),
  );
  assert.equal(
    (
      await req(
        "POST",
        "/auth/invitations/accept",
        { token, password: "TryAgainPassword2026!" },
        session("learner"),
      )
    ).statusCode,
    410,
  );
  const s = await login(
    "sana-import@test.in",
    "learner",
    "ImportedLearner2026!",
  );
  assert.equal(s.user.status, "Pending activation");
  assert.equal(
    (await req("GET", "/lessons/laptop-diagnostics-lesson-1", undefined, s))
      .statusCode,
    403,
  );
  const dir = ok(
    await req("GET", "/owner/directory?q=sana-import%40test.in&pageSize=5"),
  );
  assert.equal(dir.total, 1);
  assert.equal(dir.rows[0].password, undefined);
  assert.equal(
    (await req("GET", "/owner/directory?pageSize=1000")).statusCode,
    400,
  );
});
test("review queue records revision-specific decisions and rejects stale or unauthorised approval", async () => {
  course = ok(
    await req("POST", "/owner/courses/laptop-diagnostics/duplicate", {
      title: "Control policy test repair course",
    }),
  );
  const r = ok(
    await req("POST", "/owner/courses/" + course.id + "/review", {
      decision: "Submit for review",
      comment: "All bench transcripts and media references checked.",
      revision: course.revision,
    }),
  );
  assert.equal(r.status, "In Review");
  assert.equal(
    (
      await req("POST", "/owner/courses/" + course.id + "/review", {
        decision: "Approve",
        comment: "A stale review must not apply.",
        revision: course.revision,
      })
    ).statusCode,
    409,
  );
  const instructor = await login("olivia@qubit.demo");
  assert.equal(
    (
      await req(
        "POST",
        "/owner/courses/" + course.id + "/review",
        {
          decision: "Approve",
          comment: "Instructor cannot approve own content.",
          revision: r.revision,
        },
        instructor,
      )
    ).statusCode,
    403,
  );
  course = r;
});
test("assessment policy is published by version and enforces score, question count and answer withholding", async () => {
  for (let n = 0; n < 5; n++)
    app.store.put("questions", {
      id: course.id + "-q" + n,
      courseId: course.id,
      type: "single",
      prompt: "Which step is safe for a training board?",
      options: ["Isolate power", "Heat battery"],
      answer: 0,
      explanation: "Isolate power before inspection.",
      status: "Approved",
    });
  const policy = {
    durationMinutes: 2,
    maxAttempts: 1,
    passMark: 60,
    questionCount: 3,
    retryDelayMinutes: 10,
    reveal: "Never",
    opensAt: null,
    closesAt: null,
    requirePractical: true,
  };
  course = ok(
    await req("PATCH", "/owner/courses/" + course.id + "/assessment-policy", {
      policy,
      revision: course.revision,
      reason: "Supervised repair assessment policy",
    }),
  );
  course = ok(
    await req("POST", "/owner/courses/" + course.id + "/review", {
      decision: "Approve",
      comment: "Assessment rules reviewed by institute owner.",
      revision: course.revision,
    }),
  );
  course = ok(
    await req("POST", "/admin/courses/" + course.id + "/publish", {}),
  );
  assert.equal(
    (
      await req("PATCH", "/owner/courses/" + course.id + "/assessment-policy", {
        policy,
        revision: course.revision,
        reason: "Published rules are immutable",
      })
    ).statusCode,
    409,
  );
  ok(
    await req("POST", "/owner/learners/coaching-learner-6/access", {
      courseIds: [course.id],
      days: 10,
      reason: "Approved assessment pilot access",
    }),
  );
  const s = await login("student6@qubit.demo", "learner"),
    a = ok(await req("POST", "/quizzes/" + course.id + "/attempts", {}, s));
  assert.equal(a.questions.length, 3);
  assert.ok(a.expires - Date.now() < 121000);
  assert.equal(a.questions[0].answer, undefined);
  ok(
    await req(
      "PUT",
      "/quiz-attempts/" + a.id + "/responses",
      Object.fromEntries(a.questions.map((q) => [q.id, 0])),
      s,
    ),
  );
  const r = ok(await req("POST", "/quiz-attempts/" + a.id + "/submit", {}, s));
  assert.equal(r.score, 100);
  assert.equal(r.passed, true);
  assert.equal(r.passMark, 60);
  assert.deepEqual(r.review, []);
  assert.deepEqual(
    ok(await req("POST", "/quiz-attempts/" + a.id + "/submit", {}, s)).review,
    [],
  );
  assert.equal(
    (await req("POST", "/quizzes/" + course.id + "/attempts", {}, s))
      .statusCode,
    409,
  );
  for (const l of app.store.get("versions", course.id + "-v1").lessons)
    app.store.db
      .prepare("INSERT INTO progress VALUES(?,?,?,?,?)")
      .run(s.user.id, l.id, 1, 0, new Date().toISOString());
  assert.equal(
    (await req("POST", "/courses/" + course.id + "/certificate", {}, s))
      .statusCode,
    409,
  );
  const p = ok(
    await req(
      "POST",
      "/academy/practicals",
      {
        courseId: course.id,
        title: "Supervised board observations",
        observation:
          "An unpowered training board was inspected with the instructor. ESD preparation and battery isolation were checked. Recorded observations before further tests.",
      },
      s,
    ),
  );
  ok(
    await req("PATCH", "/owner/practicals/" + p.id, {
      status: "Competent",
      score: 85,
      feedback:
        "Safe preparation and clear observations. Verification criteria are correctly documented.",
    }),
  );
  assert.equal(
    ok(await req("POST", "/courses/" + course.id + "/certificate", {}, s))
      .issuer,
    "Refix India Institute",
  );
});
test("active assessment timers retain their snapshot after the draft policy changes", async () => {
  ok(
    await req("POST", "/owner/learners/coaching-learner-7/access", {
      courseIds: [course.id],
      days: 10,
      reason: "Approved second learner pilot access",
    }),
  );
  const s = await login("student7@qubit.demo", "learner"),
    a = ok(await req("POST", "/quizzes/" + course.id + "/attempts", {}, s));
  ok(await req("POST", "/admin/courses/" + course.id + "/new-version", {}));
  const c = app.store.get("courses", course.id);
  app.store.put("courses", {
    ...c,
    assessmentPolicy: {
      ...c.assessmentPolicy,
      durationMinutes: 60,
      maxAttempts: 5,
    },
  });
  app.store.db
    .prepare("UPDATE attempts SET started=? WHERE id=?")
    .run(Date.now() - 3 * 60000, a.id);
  assert.equal(
    (await req("PUT", "/quiz-attempts/" + a.id + "/responses", {}, s))
      .statusCode,
    409,
  );
  assert.equal(
    (await req("POST", "/quiz-attempts/" + a.id + "/submit", {}, s)).statusCode,
    409,
  );
});
test("scheduled and scoped campaigns publish once and stay out of unrelated learner inboxes", async () => {
  const future = new Date(Date.now() + 86400000).toISOString(),
    c = ok(
      await req("POST", "/owner/campaigns", {
        title: "Laptop batch lab reminder",
        message:
          "Bring your unpowered training board to the Saturday bench session.",
        audience: "Batch",
        targetId: "refix-batch-laptop",
        scheduledAt: future,
        confirm: true,
      }),
    );
  assert.equal(c.status, "Scheduled");
  app.runInstituteJobs();
  assert.equal(app.store.get("notifications", c.id), undefined);
  app.store.put("campaigns", {
    ...c,
    scheduledAt: new Date(Date.now() - 1000).toISOString(),
  });
  app.runInstituteJobs();
  app.runInstituteJobs();
  assert.equal(
    app.store
      .list("notification_deliveries")
      .filter((d) => d.campaignId === c.id).length,
    3,
  );
  assert.ok(
    ok(
      await req("GET", "/learning/resources/notifications", undefined, learner),
    ).some((n) => n.id === c.id),
  );
  const other = await login("student2@qubit.demo", "learner");
  assert.ok(
    !ok(
      await req("GET", "/learning/resources/notifications", undefined, other),
    ).some((n) => n.id === c.id),
  );
  assert.equal(
    (
      await req("POST", "/owner/campaigns/" + c.id + "/cancel", {
        reason: "Published records cannot be unsent",
      })
    ).statusCode,
    409,
  );
  const cancel = ok(
    await req("POST", "/owner/campaigns", {
      title: "Cancelable institute reminder",
      message: "A scheduled in-app announcement for this test.",
      audience: "All learners",
      targetId: "",
      scheduledAt: future,
      confirm: true,
    }),
  );
  ok(
    await req("POST", "/owner/campaigns/" + cancel.id + "/cancel", {
      reason: "Training schedule changed",
    }),
  );
  app.runInstituteJobs();
  assert.equal(app.store.get("notifications", cancel.id), undefined);
});
test("reports apply cohort filters, preserve missing scores and audit exports; saved views are private", async () => {
  const date = new Date().toISOString().slice(0, 10),
    query = "?from=" + date + "&to=" + date + "&courseId=" + course.id;
  const r = ok(await req("GET", "/owner/insights" + query));
  assert.equal(r.courses.length, 1);
  assert.equal(r.courses[0].attempts, 1);
  assert.equal(r.averageScore, 100);
  assert.equal(r.timezone, "Asia/Kolkata");
  const empty = ok(
    await req(
      "GET",
      "/owner/insights?from=2020-01-01&to=2020-01-02&courseId=" + course.id,
    ),
  );
  assert.equal(empty.averageScore, null);
  assert.equal(
    (await req("GET", "/owner/insights?from=2020-01-01&to=2026-12-30"))
      .statusCode,
    400,
  );
  const v = ok(
    await req("POST", "/owner/saved-views", {
      name: "Pilot repair outcomes",
      filters: { from: date, to: date, courseId: course.id, batchId: "" },
    }),
  );
  assert.ok(
    ok(await req("GET", "/owner/saved-views")).some((r) => r.id === v.id),
  );
  const instructor = await login("olivia@qubit.demo");
  assert.deepEqual(
    ok(await req("GET", "/owner/saved-views", undefined, instructor)),
    [],
  );
  const csv = await req("GET", "/owner/insights/export" + query);
  assert.equal(csv.statusCode, 200);
  assert.match(csv.headers["content-type"], /text\/csv/);
  assert.match(csv.body, /Control policy test repair course/);
  assert.equal(
    (await req("GET", "/owner/insights" + query, undefined, support))
      .statusCode,
    403,
  );
});
test("privacy export requires verified identity, legal holds block completion, and deactivation retains records", async () => {
  const r = ok(
    await req("POST", "/me/privacy", { type: "Data export" }, learner),
  );
  assert.equal(
    (
      await req("POST", "/owner/governance/" + r.id + "/export", {
        reason: "Prepare requested personal data export",
      })
    ).statusCode,
    409,
  );
  ok(
    await req("POST", "/owner/governance/" + r.id + "/review", {
      status: "Under review",
      identityVerified: true,
      legalHold: true,
      reason: "Identity verified; retention obligation being reviewed.",
    }),
  );
  assert.equal(
    (
      await req("POST", "/owner/governance/" + r.id + "/review", {
        status: "Completed",
        identityVerified: true,
        legalHold: true,
        reason: "A legal hold cannot be completed.",
      })
    ).statusCode,
    409,
  );
  const exported = ok(
    await req("POST", "/owner/governance/" + r.id + "/export", {
      reason: "Verified requester export for manual handover",
    }),
  );
  assert.equal(exported.profile.password, undefined);
  assert.ok(!JSON.stringify(exported).includes("policy_json"));
  const s = await login(
      "sana-import@test.in",
      "learner",
      "ImportedLearner2026!",
    ),
    del = ok(await req("POST", "/me/privacy", { type: "Account deletion" }, s));
  assert.equal(
    (
      await req("POST", "/owner/governance/" + del.id + "/review", {
        status: "Completed",
        identityVerified: true,
        legalHold: false,
        reason: "No false claim of record erasure is allowed.",
      })
    ).statusCode,
    409,
  );
  ok(
    await req("POST", "/owner/governance/" + del.id + "/review", {
      status: "Awaiting retention review",
      identityVerified: true,
      legalHold: false,
      reason: "Identity checked and access deactivation requested.",
    }),
  );
  const action = ok(
    await req("POST", "/owner/governance/" + del.id + "/deactivate", {
      password: "QubitDemo2026!",
      reason: "Deactivation approved while records await retention review.",
    }),
  );
  assert.equal(action.erased, false);
  assert.equal((await req("GET", "/me", undefined, s)).statusCode, 401);
  assert.ok(
    app.store.db.prepare("SELECT 1 FROM users WHERE id=?").get(s.user.id),
  );
});
test("command search and new control endpoints enforce permissions and tenant boundaries", async () => {
  assert.deepEqual(
    ok(await req("GET", "/owner/search?q=Aarav", undefined, support)),
    [],
  );
  assert.ok(
    ok(await req("GET", "/owner/search?q=Aarav")).some(
      (r) => r.type === "Learner",
    ),
  );
  for (const path of [
    "/owner/assessments",
    "/owner/publishing",
    "/owner/governance",
    "/owner/platform",
    "/owner/directory",
  ]) {
    assert.equal((await req("GET", path, undefined, learner)).statusCode, 403);
  }
  app.store.put(
    "privacy",
    {
      id: "foreign-request",
      userId: "other-learner",
      type: "Data export",
      status: "Pending verification",
    },
    "tenant-studio",
  );
  assert.equal(
    (
      await req("POST", "/owner/governance/foreign-request/review", {
        status: "Under review",
        identityVerified: true,
        legalHold: false,
        reason: "Cross-tenant requests must remain inaccessible.",
      })
    ).statusCode,
    404,
  );
  assert.equal((await req("GET", "/admin/resources/mfa")).statusCode, 404);
  assert.equal(
    (await req("POST", "/admin/export/invitations", {})).statusCode,
    404,
  );
  const platform = ok(await req("GET", "/owner/platform"));
  assert.equal(platform.database, "ok");
  assert.ok(
    platform.flags.every((f) =>
      ["tutor", "offline", "certificates"].includes(f.key),
    ),
  );
  assert.ok(
    platform.integrations.find((i) => i.name === "AI provider").status ===
      "Not configured",
  );
});
test("TOTP implementation matches RFC vectors and MFA gates session issuance with one-use recovery", async () => {
  assert.equal(
    totp(encodeBase32(Buffer.from("12345678901234567890")), 1),
    "287082",
  );
  assert.equal(
    (await req("POST", "/owner/security/enrol", { password: "wrong" }))
      .statusCode,
    403,
  );
  const setup = ok(
    await req("POST", "/owner/security/enrol", { password: "QubitDemo2026!" }),
  );
  assert.ok(setup.uri.startsWith("otpauth://totp/"));
  assert.ok(
    !JSON.stringify(app.store.get("mfa_pending", owner.user.id)).includes(
      setup.secret,
    ),
  );
  const codes = ok(
    await req("POST", "/owner/security/confirm", { code: totp(setup.secret) }),
  ).recoveryCodes;
  assert.equal(codes.length, 8);
  assert.ok(
    !JSON.stringify(app.store.get("mfa", owner.user.id)).includes(codes[0]),
  );
  const guest = session(),
    challenge = await req(
      "POST",
      "/auth/login",
      { email: "admin@qubit.demo", password: "QubitDemo2026!" },
      guest,
    );
  assert.equal(challenge.statusCode, 202);
  assert.equal(challenge.cookies.length, 0);
  const token = challenge.json().challenge;
  assert.equal(
    (
      await req(
        "POST",
        "/auth/mfa",
        { challenge: token, code: totp(setup.secret) },
        guest,
      )
    ).statusCode,
    401,
  );
  const signed = await req(
    "POST",
    "/auth/mfa",
    { challenge: token, code: codes[0] },
    guest,
  );
  assert.equal(signed.statusCode, 200, signed.body);
  assert.ok(signed.cookies.length > 0);
  assert.equal(
    (
      await req(
        "POST",
        "/auth/mfa",
        { challenge: token, code: codes[1] },
        guest,
      )
    ).statusCode,
    401,
  );
  const next = await req(
    "POST",
    "/auth/login",
    { email: "admin@qubit.demo", password: "QubitDemo2026!" },
    session(),
  );
  assert.equal(
    (
      await req(
        "POST",
        "/auth/mfa",
        { challenge: next.json().challenge, code: codes[0] },
        session(),
      )
    ).statusCode,
    401,
  );
  ok(
    await req("POST", "/owner/security/disable", {
      password: "QubitDemo2026!",
      code: codes[1],
      reason: "Finished MFA integration verification",
    }),
  );
  assert.equal(ok(await req("GET", "/owner/security")).enabled, false);
});

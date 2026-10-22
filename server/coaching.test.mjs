import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, unlinkSync } from "node:fs";
import { createApp } from "./app.mjs";
let app, owner;
let clientNumber = 0;
const clientAddress = () => "192.0.2." + ++clientNumber;
const password = "CoachingTests2026!";
async function req(method, path, body, session = owner, extra = {}) {
  return app.inject({
    method,
    remoteAddress: session?.ip || "127.0.0.1",
    url: "/api/v1" + path,
    headers: {
      "x-qubit-surface": session?.surface || "learner",
      ...(session?.cookie ? { cookie: session.cookie } : {}),
      ...extra,
    },
    ...(body !== undefined ? { payload: body } : {}),
  });
}
async function login(
  email,
  pw = "QubitDemo2026!",
  surface = "learner",
  extra = {},
) {
  const ip = clientAddress();
  const r = await req(
    "POST",
    "/auth/login",
    { email, password: pw },
    { surface, ip },
    extra,
  );
  assert.equal(r.statusCode, 200, r.body);
  return {
    cookie: r.cookies.map((c) => c.name + "=" + c.value).join("; "),
    surface,
    ip,
    data: r.json(),
  };
}
async function student() {
  const email = "student-" + crypto.randomUUID() + "@test.in";
  const r = await req(
    "POST",
    "/auth/register",
    {
      name: "Ananya Test",
      phone: "9876543210",
      email,
      password,
      consent: true,
    },
    { surface: "learner", ip: clientAddress() },
  );
  assert.equal(r.statusCode, 201, r.body);
  return login(email, password);
}
const jsonOK = (r) => {
  assert.equal(r.statusCode, 200, r.body);
  return r.json();
};
async function apply(s, p = "pkg-jee") {
  return jsonOK(
    await req(
      "POST",
      "/coaching/requests",
      { packageId: p, paymentMethod: "UPI" },
      s,
    ),
  );
}
async function approve(r, activateLearner = true) {
  return jsonOK(
    await req("POST", "/owner/requests/" + r.id + "/approve", {
      paymentConfirmed: true,
      activateLearner,
      reason: "Payment verified in test bank statement",
    }),
  );
}
before(async () => {
  app = await createApp({ dbPath: ":memory:" });
  owner = await login("admin@qubit.demo", "QubitDemo2026!", "admin");
});
after(async () => {
  for (const a of app.store
    .list("coaching_assets")
    .filter((a) => a.purpose === "course" || a.purpose === "receipt"))
    try {
      unlinkSync(a.diskPath);
    } catch {}
  await app.close();
});
test("coaching access requires both an approved subscription and account activation", async () => {
  const s = await student(),
    id = s.data.user.id;
  assert.equal(s.data.user.status, "Pending activation");
  assert.equal(
    (await req("GET", "/lessons/jee-physics-2027-lesson-1", undefined, s))
      .statusCode,
    403,
  );
  const a = await apply(s);
  assert.equal(a.status, "Pending payment");
  assert.equal(
    jsonOK(
      await req(
        "POST",
        "/coaching/requests",
        { packageId: "pkg-jee", paymentMethod: "Cash" },
        s,
      ),
    ).id,
    a.id,
  );
  assert.equal(
    (
      await req("POST", "/owner/requests/" + a.id + "/approve", {
        paymentConfirmed: false,
        activateLearner: true,
        reason: "Unverified",
      })
    ).statusCode,
    400,
  );
  await approve(a, false);
  assert.equal(
    (await req("GET", "/lessons/jee-physics-2027-lesson-1", undefined, s))
      .statusCode,
    403,
  );
  jsonOK(
    await req("PATCH", "/owner/learners/" + id + "/status", {
      status: "Active",
      reason: "Identity verified",
    }),
  );
  assert.equal(
    (await req("GET", "/lessons/jee-physics-2027-lesson-1", undefined, s))
      .statusCode,
    200,
  );
  assert.equal(
    (await req("GET", "/lessons/neet-biology-2027-lesson-1", undefined, s))
      .statusCode,
    403,
  );
});
test("package snapshots, payment references, approval idempotency and renewal dates remain consistent", async () => {
  const s = await student(),
    a = await apply(s),
    p = jsonOK(await req("GET", "/owner/packages")).find(
      (p) => p.id === "pkg-jee",
    );
  jsonOK(
    await req("PATCH", "/owner/packages/pkg-jee", {
      name: p.name,
      description: p.description,
      price: 3999,
      validityDays: 30,
      courseIds: p.courseIds,
      status: "Active",
    }),
  );
  jsonOK(
    await req(
      "POST",
      "/coaching/requests/" + a.id + "/payment",
      { reference: "BANK-123456" },
      s,
    ),
  );
  const sub = await approve(a);
  assert.equal(sub.paidAmount, 2499);
  assert.equal(
    Math.round((Date.parse(sub.expires) - Date.parse(sub.starts)) / 86400000),
    90,
  );
  assert.equal((await approve(a)).id, sub.id);
  const b = await apply(s),
    renewal = await approve(b);
  assert.equal(renewal.starts, sub.expires);
  assert.equal(renewal.status, "Scheduled");
  assert.equal(renewal.paidAmount, 3999);
  assert.equal(
    app.store.db
      .prepare("SELECT count(*) n FROM subscriptions WHERE request_id=?")
      .get(a.id).n,
    1,
  );
  jsonOK(
    await req("PATCH", "/owner/packages/pkg-jee", {
      name: p.name,
      description: p.description,
      price: p.price,
      validityDays: p.validityDays,
      courseIds: p.courseIds,
      status: "Active",
    }),
  );
});
test("private media supports seeking and block/cancel/expiry revoke issued media grants", async () => {
  const s = await student(),
    a = await apply(s),
    sub = await approve(a),
    access = jsonOK(
      await req("GET", "/assets/sample-physics-video/access", undefined, s),
    );
  assert.equal(access.diskPath, undefined);
  const url = access.url.replace("/api/v1", "");
  const streamed = await req("GET", url, undefined, null, {
    range: "bytes=0-31",
  });
  assert.equal(streamed.statusCode, 206, streamed.body);
  assert.equal(streamed.rawPayload.length, 32);
  assert.match(streamed.headers["content-range"], /^bytes 0-31\//);
  assert.equal(
    (await req("GET", url, undefined, null, { range: "bytes=99999999-" }))
      .statusCode,
    416,
  );
  jsonOK(
    await req("PATCH", "/owner/subscriptions/" + sub.id, {
      status: "Cancelled",
      reason: "Payment reversed",
    }),
  );
  assert.equal((await req("GET", url, undefined, null)).statusCode, 403);
  jsonOK(
    await req("PATCH", "/owner/subscriptions/" + sub.id, {
      status: "Active",
      reason: "Payment restored",
    }),
  );
  app.store.db
    .prepare("UPDATE subscriptions SET expires=? WHERE id=?")
    .run(new Date(Date.now() - 1000).toISOString(), sub.id);
  assert.equal((await req("GET", url, undefined, null)).statusCode, 403);
  app.store.db
    .prepare("UPDATE subscriptions SET expires=? WHERE id=?")
    .run(new Date(Date.now() + 86400000).toISOString(), sub.id);
  jsonOK(
    await req("PATCH", "/owner/learners/" + s.data.user.id + "/status", {
      status: "Blocked",
      reason: "Account review required",
    }),
  );
  assert.equal((await req("GET", "/me", undefined, s)).statusCode, 401);
  assert.equal((await req("GET", url, undefined, null)).statusCode, 403);
});
async function upload(filename, bytes, s = owner, purpose = "course") {
  const boundary = "qubitBoundary123";
  const start = `--${boundary}\r\nContent-Disposition: form-data; name="rights"\r\n\r\ntrue\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  return req(
    "POST",
    purpose === "receipt" ? "/coaching/receipt" : "/owner/assets",
    Buffer.concat([
      Buffer.from(start),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
    s,
    { "content-type": "multipart/form-data; boundary=" + boundary },
  );
}
test("real multipart PDF, DOCX, images and video are validated, previewed and attached to published lessons", async () => {
  const pdf = jsonOK(
    await upload(
      "chapter.pdf",
      readFileSync(new URL("./assets/study-workbook.pdf", import.meta.url)),
    ),
  );
  const doc = jsonOK(
    await upload(
      "notes.docx",
      readFileSync(new URL("./assets/study-workbook.docx", import.meta.url)),
    ),
  );
  assert.ok(doc.previewText.includes("CHAPTER REVISION WORKBOOK"));
  const video = jsonOK(
    await upload(
      "lecture.mp4",
      readFileSync(new URL("./assets/physics-revision.mp4", import.meta.url)),
    ),
  );
  assert.equal(video.type, "video/mp4");
  assert.equal(
    (await upload("bad.pdf", Buffer.from("this is not PDF"))).statusCode,
    400,
  );
  const c = jsonOK(
    await req("POST", "/admin/courses", {
      title: "JEE sample uploaded course",
      description: "An uploaded course to verify protected learning content.",
      category: "JEE",
      level: "Class 11",
      instructor: "Test Faculty",
      outcomes: "Understand Newton’s laws",
      access: "Restricted",
    }),
  );
  const l = jsonOK(
    await req("POST", "/admin/courses/" + c.id + "/lessons", {
      title: "Uploaded chapter notes",
      content:
        "Study the attached notes and explain Newton’s second law in your own words.",
      module: "01 · Mechanics",
      type: "Document",
      assetIds: [pdf.id, doc.id],
      duration: 15,
      rights: true,
      captions: true,
    }),
  );
  jsonOK(await req("PATCH", "/admin/courses/" + c.id, { status: "Approved" }));
  jsonOK(await req("POST", "/admin/courses/" + c.id + "/publish"));
  const p = jsonOK(
    await req("POST", "/owner/packages", {
      name: "Uploaded course access",
      description: "Access to uploaded sample materials.",
      price: 499,
      validityDays: 30,
      courseIds: [c.id],
      status: "Active",
    }),
  );
  const s = await student();
  assert.equal(
    (await req("GET", "/assets/" + doc.id + "/access", undefined, s))
      .statusCode,
    403,
  );
  await approve(await apply(s, p.id));
  const lesson = jsonOK(await req("GET", "/lessons/" + l.id, undefined, s));
  assert.deepEqual(lesson.assetIds, [pdf.id, doc.id]);
  const granted = jsonOK(
    await req("GET", "/assets/" + doc.id + "/access", undefined, s),
  );
  assert.ok(granted.previewText);
  assert.equal(granted.diskPath, undefined);
  assert.equal(
    (await req("GET", granted.url.replace("/api/v1", ""), undefined, null))
      .statusCode,
    200,
  );
});
test("learner receipts remain private and cannot be substituted by another learner", async () => {
  const a = await student(),
    b = await student(),
    ra = await apply(a),
    rb = await apply(b);
  const receipt = jsonOK(
    await upload(
      "receipt.pdf",
      readFileSync(new URL("./assets/study-workbook.pdf", import.meta.url)),
      a,
      "receipt",
    ),
  );
  assert.equal(
    (
      await req(
        "POST",
        "/coaching/requests/" + rb.id + "/payment",
        { reference: "BANK-OTHER", receiptId: receipt.id },
        b,
      )
    ).statusCode,
    403,
  );
  jsonOK(
    await req(
      "POST",
      "/coaching/requests/" + ra.id + "/payment",
      { reference: "UPI-123456", receiptId: receipt.id },
      a,
    ),
  );
  assert.equal(
    (await req("GET", "/assets/" + receipt.id + "/access", undefined, b))
      .statusCode,
    403,
  );
  assert.equal(
    (await req("GET", "/assets/" + receipt.id + "/access")).statusCode,
    200,
  );
});
test("custom staff permissions are enforced and role changes revoke staff sessions", async () => {
  const role = jsonOK(
    await req("POST", "/owner/roles", {
      name: "Admissions review only",
      permissions: ["billing"],
    }),
  );
  const staff = await login("finance@qubit.demo", "QubitDemo2026!", "admin");
  jsonOK(
    await req("POST", "/owner/staff/" + staff.data.user.id + "/role", {
      roleId: role.id,
      password: "QubitDemo2026!",
      reason: "Admissions review duty",
    }),
  );
  assert.equal(
    (await req("GET", "/owner/packages", undefined, staff)).statusCode,
    401,
  );
  const again = await login("finance@qubit.demo", "QubitDemo2026!", "admin");
  assert.equal(
    (await req("GET", "/owner/packages", undefined, again)).statusCode,
    200,
  );
  assert.equal(
    (await req("GET", "/owner/learners", undefined, again)).statusCode,
    403,
  );
  assert.equal(
    (await req("GET", "/owner/roles", undefined, again)).statusCode,
    403,
  );
  jsonOK(
    await req("PATCH", "/owner/roles/" + role.id, {
      name: "No admissions",
      permissions: [],
    }),
  );
  assert.equal(
    (await req("GET", "/owner/packages", undefined, again)).statusCode,
    401,
  );
});
test("native bearer sessions, course-specific questions and analytics reflect server state", async () => {
  const s = await login("learner@qubit.demo", "QubitDemo2026!", "learner", {
    "x-qubit-platform": "android",
  });
  assert.ok(s.data.nativeToken);
  const r = await req("GET", "/me", undefined, null, {
    authorization: "Bearer " + s.data.nativeToken,
  });
  assert.equal(r.statusCode, 200);
  const quiz = jsonOK(
    await req("POST", "/quizzes/jee-physics-2027/attempts", {}, s),
  );
  assert.equal(quiz.questions.length, 5);
  assert.ok(
    quiz.questions.every(
      (q) =>
        q.courseId === "jee-physics-2027" &&
        q.answer === undefined &&
        q.explanation === undefined,
    ),
  );
  const overview = jsonOK(await req("GET", "/owner/overview"));
  assert.ok(overview.counts.activePaidUsers > 0);
  assert.ok(overview.counts.renewals >= 2);
  const analytics = jsonOK(await req("GET", "/owner/analytics?days=7"));
  assert.equal(analytics.daily.length, 7);
  assert.equal(analytics.currency, "INR");
  assert.ok(analytics.revenue >= 0);
});
test("a shared workbook is available through any included course and upgrades preserve published versions", async () => {
  const s = await student();
  await approve(await apply(s, "pkg-neet"));
  assert.equal(
    (await req("GET", "/assets/sample-study-pdf/access", undefined, s))
      .statusCode,
    200,
  );
  const c = app.store.get("courses", "neet-biology-2027");
  jsonOK(await req("POST", "/admin/courses/" + c.id + "/new-version"));
  const l = jsonOK(
    await req("POST", "/admin/courses/" + c.id + "/lessons", {
      title: "New biology revision lesson",
      module: "03 · Additional revision",
      type: "Reading",
      content:
        "Use active recall to compare prokaryotic and eukaryotic cells. Write down the key differences.",
      duration: 15,
      captions: true,
      rights: true,
    }),
  );
  jsonOK(await req("PATCH", "/admin/courses/" + c.id, { status: "Approved" }));
  jsonOK(await req("POST", "/admin/courses/" + c.id + "/publish"));
  assert.equal(
    (await req("GET", "/lessons/" + l.id, undefined, s)).statusCode,
    404,
  );
  const result = jsonOK(
    await req("POST", "/owner/courses/" + c.id + "/upgrade-enrolments", {
      confirm: true,
      reason: "New chapter reviewed for current learners",
    }),
  );
  assert.ok(result.updated >= 1);
  assert.equal(
    (await req("GET", "/lessons/" + l.id, undefined, s)).statusCode,
    200,
  );
  assert.equal(app.store.get("versions", c.id + "-v1").lessons.length, 5);
});
test("only the owner creates and manages staff accounts; blocked staff cannot sign in", async () => {
  const payload = {
    name: "Neha Admissions",
    email: "neha-" + crypto.randomUUID() + "@test.in",
    role: "Support",
    initialPassword: "StaffAccess2026!",
    password: "QubitDemo2026!",
    reason: "Learner support shift",
  };
  assert.equal(
    (await req("POST", "/owner/staff", { ...payload, password: "wrong" }))
      .statusCode,
    403,
  );
  const created = jsonOK(await req("POST", "/owner/staff", payload));
  assert.equal(created.password, undefined);
  const staff = await login(payload.email, payload.initialPassword, "admin");
  assert.equal(
    (await req("GET", "/owner/learners", undefined, staff)).statusCode,
    403,
  );
  const tenant = await login("tenant@qubit.demo", "QubitDemo2026!", "admin");
  assert.equal(
    (
      await req(
        "PATCH",
        "/admin/users/admin-demo",
        { status: "Blocked", reason: "Not permitted" },
        tenant,
      )
    ).statusCode,
    403,
  );
  jsonOK(
    await req("PATCH", "/admin/users/" + created.id, {
      status: "Blocked",
      reason: "Support access no longer required",
    }),
  );
  assert.equal((await req("GET", "/me", undefined, staff)).statusCode, 401);
  assert.equal(
    (
      await req(
        "POST",
        "/auth/login",
        { email: payload.email, password: payload.initialPassword },
        { surface: "admin" },
      )
    ).statusCode,
    401,
  );
});
test("native bearer identity takes precedence over a stale WebView cookie", async () => {
  const old = await student(),
    native = await login("learner@qubit.demo", "QubitDemo2026!", "learner", {
      "x-qubit-platform": "android",
    });
  const me = jsonOK(
    await req("GET", "/me", undefined, old, {
      authorization: "Bearer " + native.data.nativeToken,
    }),
  );
  assert.equal(me.user.id, "learner-demo");
});
test("an owner media preview grant works when the browser also has a learner cookie", async () => {
  const privateFile = jsonOK(
    await upload(
      "owner-private.pdf",
      readFileSync(new URL("./assets/study-workbook.pdf", import.meta.url)),
    ),
  );
  const grant = jsonOK(
    await req("GET", "/assets/" + privateFile.id + "/access"),
  );
  const s = await student();
  assert.equal(
    (await req("GET", "/assets/" + privateFile.id + "/access", undefined, s))
      .statusCode,
    403,
  );
  assert.equal(
    (await req("GET", grant.url.replace("/api/v1", ""), undefined, s))
      .statusCode,
    200,
  );
});
test("login rate limiting still rejects repeated attempts from one client", async () => {
  const client = { surface: "learner", ip: "203.0.113.1" };
  for (let i = 0; i < 15; i++)
    assert.equal(
      (
        await req(
          "POST",
          "/auth/login",
          { email: "missing@test.in", password: "incorrect" },
          client,
        )
      ).statusCode,
      401,
    );
  assert.equal(
    (
      await req(
        "POST",
        "/auth/login",
        { email: "missing@test.in", password: "incorrect" },
        client,
      )
    ).statusCode,
    429,
  );
});

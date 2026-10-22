import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.mjs";
import { seedAcademy } from "./academy-data.mjs";
let app, owner, learner, instructor;
async function login(email, surface = "admin") {
  const r = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { "x-qubit-surface": surface },
    payload: { email, password: "QubitDemo2026!" },
  });
  assert.equal(r.statusCode, 200, r.body);
  return {
    cookie: r.cookies.map((c) => c.name + "=" + c.value).join("; "),
    "x-qubit-surface": surface,
  };
}
const req = (method, path, body, headers = owner) =>
  app.inject({
    method,
    url: "/api/v1" + path,
    headers,
    ...(body === undefined ? {} : { payload: body }),
  });
const ok = (r) => {
  assert.equal(r.statusCode, 200, r.body);
  return r.json();
};
before(async () => {
  app = await createApp({ dbPath: ":memory:" });
  owner = await login("admin@qubit.demo");
  learner = await login("learner@qubit.demo", "learner");
  instructor = await login("olivia@qubit.demo");
});
after(async () => app.close());
test("repair migration is idempotent and preserves owner edits and archived version history", () => {
  assert.match(
    app.store.get("notifications", "coaching-welcome").description,
    /Refix India Institute/,
  );
  const c = app.store.get("courses", "laptop-diagnostics");
  app.store.put("courses", { ...c, title: "Owner-edited laptop training" });
  const count = app.store.db
    .prepare("SELECT count(*) n FROM subscriptions")
    .get().n;
  seedAcademy(app.store);
  assert.equal(
    app.store.get("courses", c.id).title,
    "Owner-edited laptop training",
  );
  assert.equal(
    app.store.db.prepare("SELECT count(*) n FROM subscriptions").get().n,
    count,
  );
  assert.equal(app.store.get("courses", "jee-physics-2027").status, "Archived");
  assert.equal(
    app.store.get("versions", "jee-physics-2027-v1").lessons.length,
    5,
  );
});
test("batch validation enforces capacity, dates and academy boundaries without granting paid access", async () => {
  const b = {
    name: "Repair test cohort",
    trainer: "Neha Test",
    courseIds: ["laptop-diagnostics"],
    learnerIds: ["coaching-learner-6"],
    capacity: 1,
    starts: "2026-10-22",
    ends: "2026-11-22",
    schedule: "Saturdays 10:00 AM IST",
    status: "Upcoming",
    notes: "",
  };
  assert.equal(
    (await req("POST", "/owner/batches", { ...b, capacity: 0 })).statusCode,
    400,
  );
  assert.equal(
    (await req("POST", "/owner/batches", { ...b, ends: "2025-01-01" }))
      .statusCode,
    400,
  );
  assert.equal(
    (
      await req("POST", "/owner/batches", {
        ...b,
        learnerIds: ["learner-demo", "coaching-learner-6"],
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (await req("POST", "/owner/batches", { ...b, learnerIds: ["admin-demo"] }))
      .statusCode,
    404,
  );
  const result = ok(await req("POST", "/owner/batches", b));
  assert.equal(result.learnerIds.length, 1);
  assert.equal(
    app.store.db
      .prepare(
        "SELECT count(*) n FROM subscriptions WHERE user_id='coaching-learner-6' AND status='Active'",
      )
      .get().n,
    0,
  );
  app.store.put(
    "academy_batches",
    { ...b, id: "foreign-batch" },
    "other-tenant",
  );
  assert.equal(
    (await req("PATCH", "/owner/batches/foreign-batch", b)).statusCode,
    404,
  );
  assert.equal(
    (await req("GET", "/owner/batches", undefined, learner)).statusCode,
    403,
  );
});
test("complimentary access needs billing and user permissions, activation, reason and published courses", async () => {
  const target = "coaching-learner-6",
    payload = {
      courseIds: ["laptop-diagnostics"],
      days: 14,
      reason: "Sponsored practice access approved by academy owner",
    };
  assert.equal(
    (
      await req(
        "POST",
        "/owner/learners/" + target + "/access",
        payload,
        instructor,
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (await req("POST", "/owner/learners/coaching-learner-12/access", payload))
      .statusCode,
    409,
  );
  assert.equal(
    (
      await req("POST", "/owner/learners/" + target + "/access", {
        ...payload,
        courseIds: ["jee-physics-2027"],
      })
    ).statusCode,
    409,
  );
  const grant = ok(
    await req("POST", "/owner/learners/" + target + "/access", payload),
  );
  assert.equal(
    app.store.db
      .prepare("SELECT paid_paise FROM subscriptions WHERE id=?")
      .get(grant.id).paid_paise,
    0,
  );
  const s = await login("student6@qubit.demo", "learner");
  assert.equal(
    (await req("GET", "/lessons/laptop-diagnostics-lesson-1", undefined, s))
      .statusCode,
    200,
  );
  assert.ok(
    ok(await req("GET", "/owner/learners/" + target + "/devices")).length > 0,
  );
  const signed = ok(
    await req("POST", "/owner/learners/" + target + "/sign-out", {
      reason: "Academy owner requested device reset",
    }),
  );
  assert.ok(signed.revoked > 0);
  assert.equal((await req("GET", "/me", undefined, s)).statusCode, 401);
});
test("course copy, reorder, removal and archive keep published versions unchanged and reject stale revisions", async () => {
  assert.equal(
    (
      await req("POST", "/owner/courses/laptop-diagnostics/curriculum", {
        lessonIds: [],
        revision: 1,
        reason: "Cannot mutate published curriculum",
      })
    ).statusCode,
    409,
  );
  const copy = ok(
    await req("POST", "/owner/courses/laptop-diagnostics/duplicate", {
      title: "Laptop repair duplicate for review",
    }),
  );
  const ls = app.store.list("lessons").filter((l) => l.courseId === copy.id),
    order = ls
      .slice(0, 4)
      .reverse()
      .map((l) => l.id);
  assert.equal(copy.status, "Draft");
  assert.equal(copy.version, 0);
  assert.equal(
    (
      await req("POST", "/owner/courses/" + copy.id + "/curriculum", {
        lessonIds: [order[0], order[0]],
        revision: 1,
        reason: "Duplicate lesson IDs are invalid",
      })
    ).statusCode,
    400,
  );
  ok(
    await req("POST", "/owner/courses/" + copy.id + "/curriculum", {
      lessonIds: order,
      revision: 1,
      reason: "Move the safety lesson before inspection",
    }),
  );
  assert.equal(
    app.store.list("lessons").filter((l) => l.courseId === copy.id).length,
    4,
  );
  assert.equal(
    (
      await req("POST", "/owner/courses/" + copy.id + "/curriculum", {
        lessonIds: order,
        revision: 1,
        reason: "Stale editor must be rejected",
      })
    ).statusCode,
    409,
  );
  assert.equal(
    app.store.get("versions", "laptop-diagnostics-v1").lessons.length,
    5,
  );
  ok(
    await req("POST", "/owner/courses/" + copy.id + "/lifecycle", {
      action: "Archive",
      reason: "Retire duplicate draft after testing",
    }),
  );
  assert.equal(app.store.get("courses", copy.id).status, "Archived");
  ok(
    await req("POST", "/owner/courses/" + copy.id + "/lifecycle", {
      action: "Restore draft",
      reason: "Reopen duplicate for trainer review",
    }),
  );
  assert.equal(app.store.get("courses", copy.id).status, "Draft");
});
test("practical submissions require approved course access; trainer reviews become visible only to their learner", async () => {
  const b = {
    courseId: "laptop-diagnostics",
    title: "Safe board inspection task",
    observation:
      "Power isolated on a training board. ESD setup checked with trainer. Recorded loose connector and documented observations before any further measurements.",
  };
  assert.equal(
    (await req("POST", "/academy/practicals", b, owner)).statusCode,
    403,
  );
  const p = ok(await req("POST", "/academy/practicals", b, learner));
  assert.equal(
    (
      await req(
        "PATCH",
        "/owner/practicals/" + p.id,
        {
          status: "Competent",
          score: 85,
          feedback:
            "Useful observations and safe bench preparation. Add model-specific verification criteria.",
        },
        learner,
      )
    ).statusCode,
    403,
  );
  const review = ok(
    await req("PATCH", "/owner/practicals/" + p.id, {
      status: "Competent",
      score: 85,
      feedback:
        "Useful observations and safe bench preparation. Add model-specific verification criteria.",
    }),
  );
  assert.equal(review.score, 85);
  assert.equal(
    ok(await req("GET", "/academy/practicals", undefined, learner)).find(
      (x) => x.id === p.id,
    ).status,
    "Competent",
  );
  const other = await login("student1@qubit.demo", "learner");
  assert.ok(
    !ok(await req("GET", "/academy/practicals", undefined, other)).some(
      (x) => x.id === p.id,
    ),
  );
  app.store.db
    .prepare(
      "UPDATE subscriptions SET status='Cancelled' WHERE user_id='coaching-learner-1'",
    )
    .run();
  assert.equal(
    (await req("POST", "/academy/practicals", b, other)).statusCode,
    403,
  );
});
test("billing export is restricted and neutralises spreadsheet formula cells", async () => {
  assert.equal(
    (await req("GET", "/owner/billing/export", undefined, learner)).statusCode,
    403,
  );
  app.store.db
    .prepare("UPDATE users SET name=? WHERE id='coaching-learner-4'")
    .run('=HYPERLINK("bad")');
  const r = await req("GET", "/owner/billing/export");
  assert.equal(r.statusCode, 200);
  assert.match(r.headers["content-type"], /text\/csv/);
  assert.ok(r.body.includes("\"'=HYPERLINK"));
  assert.ok(!r.body.includes('"=HYPERLINK'));
});

test("removing a lesson from a new draft preserves access through the learner's published version", async () => {
  const c = app.store.get("courses", "precision-soldering"),
    id = c.id + "-lesson-1";
  ok(await req("POST", "/admin/courses/" + c.id + "/new-version", {}));
  const draft = app.store.get("courses", c.id),
    order = app.store
      .list("lessons")
      .filter((l) => l.courseId === c.id && l.id !== id)
      .map((l) => l.id);
  ok(
    await req("POST", "/owner/courses/" + c.id + "/curriculum", {
      lessonIds: order,
      revision: draft.revision,
      reason: "Replace introduction in the upcoming course version",
    }),
  );
  assert.equal(app.store.get("lessons", id), undefined);
  assert.equal(
    ok(await req("GET", "/lessons/" + id, undefined, learner)).id,
    id,
  );
  assert.equal(app.store.get("versions", c.id + "-v1").lessons.length, 5);
});

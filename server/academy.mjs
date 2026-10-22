import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { assertCoachingAccess } from "./coaching.mjs";

const stamp = () => new Date().toISOString();
const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};
const reasonSchema = z
  .object({ reason: z.string().trim().min(5).max(1000) })
  .strict();

export function registerAcademy({ app, store, auth, permit }) {
  const { db, get, list, put, audit } = store;
  const owned = (u, kind, id) => {
    const row = list(kind, u.tenant).find((r) => r.id === id);
    if (!row) fail(404, "Record not found in this institute.");
    return row;
  };
  const student = (u, id) => {
    const row = db
      .prepare(
        "SELECT id,name,status FROM users WHERE id=? AND tenant=? AND role='Learner'",
      )
      .get(id, u.tenant);
    if (!row) fail(404, "Learner not found in this institute.");
    return row;
  };
  const sessionId = (s) =>
    createHash("sha256").update(s.hash).digest("hex").slice(0, 24);
  app.get("/api/v1/owner/learners/:id/devices", async (req) => {
    const u = permit(req, "users");
    student(u, req.params.id);
    return db
      .prepare(
        "SELECT hash,device,created,expires FROM sessions WHERE user_id=? AND expires>?",
      )
      .all(req.params.id, Date.now())
      .map((s) => ({
        id: sessionId(s),
        device: s.device,
        created: s.created,
        expires: new Date(s.expires).toISOString(),
      }));
  });
  app.post("/api/v1/owner/learners/:id/sign-out", async (req) => {
    const u = permit(req, "users"),
      target = student(u, req.params.id),
      b = reasonSchema.parse(req.body);
    const result = db
      .prepare("DELETE FROM sessions WHERE user_id=?")
      .run(target.id);
    audit(u, "All learner devices signed out", target.id, b.reason);
    return { revoked: result.changes };
  });
  app.post("/api/v1/owner/learners/:id/access", async (req) => {
    const u = permit(req, "billing");
    permit(req, "users");
    const target = student(u, req.params.id),
      b = z
        .object({
          courseIds: z.array(z.string()).min(1).max(50),
          days: z.number().int().min(1).max(730),
          reason: z.string().trim().min(5).max(1000),
        })
        .strict()
        .parse(req.body);
    if (new Set(b.courseIds).size !== b.courseIds.length)
      fail(400, "Choose each course only once.");
    const courses = b.courseIds.map((id) => owned(u, "courses", id));
    if (courses.some((c) => !c.coaching || c.status !== "Published"))
      fail(409, "Choose published institute courses.");
    if (target.status !== "Active")
      fail(409, "Activate this learner separately before granting access.");
    const id = randomUUID(),
      starts = stamp(),
      expires = new Date(Date.now() + b.days * 86400000).toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "INSERT INTO subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        u.tenant,
        target.id,
        "owner-grant",
        null,
        "Owner access grant",
        JSON.stringify(b.courseIds),
        0,
        starts,
        expires,
        "Active",
        starts,
      );
      for (const c of courses)
        db.prepare(
          "INSERT INTO enrolments VALUES(?,?,?,?,?) ON CONFLICT(user_id,course_id) DO UPDATE SET state='Active'",
        ).run(target.id, c.id, c.version, "Active", starts);
      audit(
        u,
        "Complimentary course access granted",
        target.id,
        b.reason + " · " + b.days + " days · " + b.courseIds.join(", "),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { id, starts, expires };
  });
  app.post("/api/v1/owner/courses/:id/duplicate", async (req) => {
    const u = permit(req, "courses"),
      c = owned(u, "courses", req.params.id),
      b = z
        .object({ title: z.string().trim().min(5).max(150) })
        .strict()
        .parse(req.body);
    const id = randomUUID();
    db.exec("BEGIN IMMEDIATE");
    try {
      const copy = put(
        "courses",
        {
          ...c,
          id,
          title: b.title,
          status: "Draft",
          version: 0,
          revision: 1,
          enrolled: 0,
          rating: 0,
          demo: false,
        },
        u.tenant,
      );
      for (const l of list("lessons", u.tenant).filter(
        (l) => l.courseId === c.id,
      ))
        put("lessons", { ...l, id: randomUUID(), courseId: id }, u.tenant);
      audit(u, "Course duplicated", id, "Source: " + c.id);
      db.exec("COMMIT");
      return copy;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  });
  app.post("/api/v1/owner/courses/:id/lifecycle", async (req) => {
    const u = permit(req, "courses"),
      c = owned(u, "courses", req.params.id),
      b = z
        .object({
          action: z.enum(["Archive", "Restore draft"]),
          reason: z.string().trim().min(5).max(1000),
        })
        .strict()
        .parse(req.body);
    if (b.action === "Restore draft" && c.status !== "Archived")
      fail(409, "Only archived courses can be restored as drafts.");
    const result = put(
      "courses",
      {
        ...c,
        status: b.action === "Archive" ? "Archived" : "Draft",
        revision: (c.revision || 1) + 1,
      },
      u.tenant,
    );
    audit(u, "Course " + b.action, c.id, b.reason);
    return result;
  });
  app.post("/api/v1/owner/courses/:id/curriculum", async (req) => {
    const u = permit(req, "courses"),
      c = owned(u, "courses", req.params.id),
      b = z
        .object({
          lessonIds: z.array(z.string()).max(500),
          reason: z.string().trim().min(5).max(1000),
          revision: z.number().int(),
        })
        .strict()
        .parse(req.body);
    if (c.status === "Published" || c.status === "Archived")
      fail(409, "Create or restore a draft before changing its curriculum.");
    if (b.revision !== (c.revision || 1))
      fail(409, "Course changed. Reload before saving.");
    const lessons = list("lessons", u.tenant).filter(
      (l) => l.courseId === c.id,
    );
    if (
      new Set(b.lessonIds).size !== b.lessonIds.length ||
      b.lessonIds.some((id) => !lessons.some((l) => l.id === id))
    )
      fail(400, "Invalid or duplicate lesson IDs.");
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const l of lessons) {
        const pos = b.lessonIds.indexOf(l.id);
        if (pos < 0)
          db.prepare(
            "DELETE FROM records WHERE kind='lessons' AND id=? AND tenant=?",
          ).run(l.id, u.tenant);
        else put("lessons", { ...l, position: pos }, u.tenant);
      }
      put("courses", { ...c, revision: b.revision + 1 }, u.tenant);
      audit(u, "Draft curriculum reordered or trimmed", c.id, b.reason);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return {
      saved: b.lessonIds.length,
      removed: lessons.length - b.lessonIds.length,
    };
  });
  const batchSchema = z
    .object({
      name: z.string().trim().min(3).max(120),
      courseIds: z.array(z.string()).min(1).max(50),
      trainer: z.string().trim().min(2).max(100),
      capacity: z.number().int().min(1).max(1000),
      starts: z.iso.date(),
      ends: z.iso.date(),
      schedule: z.string().trim().min(5).max(300),
      status: z.enum(["Upcoming", "Active", "Completed", "Archived"]),
      learnerIds: z.array(z.string()).max(1000),
      notes: z.string().max(2000).default(""),
    })
    .strict()
    .refine((b) => b.ends >= b.starts, "End date must follow start date.")
    .refine(
      (b) => b.learnerIds.length <= b.capacity,
      "Batch capacity exceeded.",
    )
    .refine(
      (b) => new Set(b.learnerIds).size === b.learnerIds.length,
      "Duplicate learner membership.",
    );
  app.get("/api/v1/owner/batches", async (req) => {
    const u = permit(req, "courses");
    return list("academy_batches", u.tenant).map((b) => ({
      ...b,
      learners: b.learnerIds.length,
    }));
  });
  for (const method of ["post", "patch"])
    app[method](
      "/api/v1/owner/batches" + (method === "patch" ? "/:id" : ""),
      async (req) => {
        const u = permit(req, "courses"),
          b = batchSchema.parse(req.body);
        if (method === "patch") owned(u, "academy_batches", req.params.id);
        b.courseIds.forEach((id) => owned(u, "courses", id));
        b.learnerIds.forEach((id) => student(u, id));
        const id = method === "patch" ? req.params.id : randomUUID();
        const result = put("academy_batches", { ...b, id }, u.tenant);
        audit(u, "Training batch saved", id);
        return result;
      },
    );
  app.get("/api/v1/academy/batches", async (req) => {
    const u = auth(req);
    return list("academy_batches", u.tenant)
      .filter((b) => b.status !== "Archived" && b.learnerIds.includes(u.id))
      .map(({ learnerIds, notes, ...b }) => b);
  });
  app.get("/api/v1/owner/practicals", async (req) => {
    const u = permit(req, "assessments");
    return list("academy_practicals", u.tenant).map((p) => ({
      ...p,
      learner: student(u, p.userId).name,
      course: owned(u, "courses", p.courseId).title,
    }));
  });
  app.patch("/api/v1/owner/practicals/:id", async (req) => {
    const u = permit(req, "assessments"),
      p = owned(u, "academy_practicals", req.params.id),
      b = z
        .object({
          status: z.enum(["Changes requested", "Competent"]),
          feedback: z.string().trim().min(10).max(5000),
          score: z.number().int().min(0).max(100),
        })
        .strict()
        .parse(req.body);
    const result = put(
      "academy_practicals",
      { ...p, ...b, reviewer: u.name, reviewed: stamp() },
      u.tenant,
    );
    audit(u, "Practical work reviewed", p.id, b.status);
    return result;
  });
  app.get("/api/v1/academy/practicals", async (req) => {
    const u = auth(req);
    return list("academy_practicals", u.tenant).filter(
      (p) => p.userId === u.id,
    );
  });
  app.post("/api/v1/academy/practicals", async (req) => {
    const u = auth(req);
    if (u.role !== "Learner")
      fail(403, "Use a learner account to submit bench work.");
    const b = z
        .object({
          courseId: z.string(),
          title: z.string().trim().min(5).max(150),
          observation: z.string().trim().min(60).max(10000),
        })
        .strict()
        .parse(req.body),
      c = owned(u, "courses", b.courseId);
    assertCoachingAccess(store, u, c);
    if (
      !db
        .prepare(
          "SELECT 1 FROM enrolments WHERE user_id=? AND course_id=? AND state='Active'",
        )
        .get(u.id, c.id)
    )
      fail(403, "Join this course before submitting practical work.");
    const result = put(
      "academy_practicals",
      {
        ...b,
        id: randomUUID(),
        userId: u.id,
        status: "Submitted",
        feedback: "",
        score: null,
        created: stamp(),
      },
      u.tenant,
    );
    audit(u, "Practical work submitted", result.id);
    return result;
  });
  app.get("/api/v1/owner/billing/export", async (req, reply) => {
    const u = permit(req, "billing"),
      records = db
        .prepare(
          "SELECT s.*,u.name,u.email FROM subscriptions s JOIN users u ON s.user_id=u.id WHERE s.tenant=? ORDER BY s.created DESC",
        )
        .all(u.tenant);
    // Quote all cells and neutralise spreadsheet formula prefixes in user-controlled text.
    const cell = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Subscription",
        "Learner",
        "Email",
        "Package",
        "INR",
        "Starts UTC",
        "Expires UTC",
        "Status",
      ],
      ...records.map((s) => [
        s.id,
        s.name,
        s.email,
        s.package_name,
        (s.paid_paise / 100).toFixed(2),
        s.starts,
        s.expires,
        s.status,
      ]),
    ];
    reply
      .header(
        "Content-Disposition",
        'attachment; filename="refix-subscriptions.csv"',
      )
      .type("text/csv; charset=utf-8");
    return rows.map((r) => r.map(cell).join(",")).join("\r\n");
  });
}

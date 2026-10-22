import { registerAcademy } from "./academy.mjs";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { openDb, safeUser, hashPassword, verifyPassword } from "./db.mjs";
import { now, lessonsFor } from "./seed.mjs";
import {
  registerCoaching,
  assertCoachingAccess,
  userPermissions,
} from "./coaching.mjs";
const digest = (s) => createHash("sha256").update(s).digest("hex");
const perms = {
  "Super Admin": ["*"],
  "Tenant Admin": [
    "users",
    "groups",
    "courses",
    "assessments",
    "analytics",
    "notifications",
    "certificates",
    "tickets",
    "privacy",
    "reports",
    "audit",
  ],
  Instructor: [
    "courses",
    "assessments",
    "media",
    "analytics",
    "discussions",
    "sessions",
  ],
  Support: ["tickets", "notifications"],
  Finance: ["plans", "transactions", "analytics", "reports", "billing"],
  Learner: [],
};
const areas = {
  groups: "groups",
  assignments: "assessments",
  submissions: "assessments",
  questions: "assessments",
  notifications: "notifications",
  sessions: "sessions",
  discussions: "discussions",
  media: "media",
  jobs: "operations",
  tickets: "tickets",
  tenants: "tenants",
  plans: "plans",
  transactions: "transactions",
  certificates: "certificates",
  privacy: "privacy",
  integrations: "settings",
  flags: "settings",
  reports: "reports",
  incidents: "operations",
  backups: "operations",
  prompts: "ai",
};
const fields = {
  groups: ["name", "description", "owner", "status", "members"],
  assignments: [
    "title",
    "description",
    "courseId",
    "due",
    "reviewer",
    "status",
  ],
  questions: [
    "prompt",
    "type",
    "options",
    "answer",
    "explanation",
    "reference",
    "courseId",
  ],
  notifications: [
    "title",
    "description",
    "audience",
    "channel",
    "status",
    "scheduledAt",
  ],
  sessions: [
    "title",
    "instructor",
    "courseId",
    "date",
    "duration",
    "url",
    "provider",
    "status",
  ],
  discussions: ["title", "description", "courseId", "status"],
  media: ["title", "type", "rights", "captions"],
  tickets: [
    "title",
    "description",
    "category",
    "priority",
    "status",
    "assignee",
    "responses",
  ],
  tenants: ["name", "slug", "plan", "accent", "domain", "status"],
  plans: ["name", "price", "interval", "learners", "status"],
  certificates: ["status", "reason"],
  privacy: ["status", "reason"],
  integrations: ["provider"],
  flags: ["enabled", "status"],
  reports: ["name", "type", "frequency", "description", "status"],
  incidents: ["title", "service", "severity", "description", "status"],
  prompts: ["name", "version", "description", "status"],
  submissions: ["status", "feedback", "grade"],
};
function fail(status, message, code = "REQUEST_FAILED") {
  throw Object.assign(new Error(message), { statusCode: status, code });
}
export async function createApp({ dbPath, logger = false } = {}) {
  const app = Fastify({ logger, bodyLimit: 8 * 1024 * 1024 });
  const store = openDb(dbPath);
  const { db, get, list, put, audit } = store;
  const permissionsFor = (u) => userPermissions(store, u, perms);
  app.store = store;
  const origins = (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:7311,http://127.0.0.1:7311,http://localhost:7312,http://127.0.0.1:7312,http://localhost:7313,http://127.0.0.1:7313,capacitor://localhost,http://localhost,https://localhost"
  ).split(",");
  await app.register(cookie);
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(rateLimit, { max: 500, timeWindow: "1 minute" });
  const surface = (req) =>
    req.headers["x-qubit-surface"] === "admin" ? "admin" : "learner";
  const cookieName = (req) => "qubit_" + surface(req);
  app.addHook("onRequest", async (req) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      if (!["admin", "learner"].includes(req.headers["x-qubit-surface"]))
        fail(
          403,
          "A valid application surface header is required.",
          "CSRF_REJECTED",
        );
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin))
        fail(403, "This origin is not allowed.", "ORIGIN_REJECTED");
    }
    const token =
      (surface(req) === "learner" &&
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null) || req.cookies[cookieName(req)];
    if (token) {
      const s = db
        .prepare("SELECT * FROM sessions WHERE hash=? AND expires>?")
        .get(digest(token), Date.now());
      if (s) {
        const u = db.prepare("SELECT * FROM users WHERE id=?").get(s.user_id);
        if (
          ["Active", "Pending activation"].includes(u?.status) &&
          get("tenants", u.tenant)?.status !== "Suspended"
        ) {
          req.user = u;
          req.session = s.hash;
          if (
            !u.last_seen ||
            Date.now() - new Date(u.last_seen).getTime() > 60000
          )
            db.prepare("UPDATE users SET last_seen=? WHERE id=?").run(
              now(),
              u.id,
            );
        }
      }
    }
  });
  app.setErrorHandler((err, req, reply) => {
    const status = err instanceof z.ZodError ? 400 : err.statusCode || 500;
    reply.code(status).send({
      error: {
        code:
          err instanceof z.ZodError
            ? "VALIDATION_FAILED"
            : err.code || "INTERNAL_ERROR",
        message:
          err instanceof z.ZodError
            ? err.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : status >= 500
              ? "Something went wrong. Please try again."
              : err.message,
        request_id: req.id,
        retryable: status >= 500,
      },
    });
  });
  const auth = (req) => {
    if (!req.user) fail(401, "Sign in to continue.", "UNAUTHENTICATED");
    return req.user;
  };
  const permit = (req, area) => {
    const u = auth(req);
    if (!permissionsFor(u).some((p) => p === "*" || p === area))
      fail(403, "Your role does not have access to this action.", "FORBIDDEN");
    return u;
  };
  const scoped = (req, kind, id) => {
    const row = db
      .prepare("SELECT tenant,body FROM records WHERE kind=? AND id=?")
      .get(kind, id);
    if (
      !row ||
      (auth(req).role !== "Super Admin" && row.tenant !== req.user.tenant)
    )
      fail(404, "This record is not available.", "NOT_FOUND");
    return JSON.parse(row.body);
  };
  const rows = (req, kind) =>
    list(kind, auth(req).role === "Super Admin" ? undefined : req.user.tenant);
  const courseFor = (u, id) => {
    const c = get("courses", id);
    const row = db
      .prepare("SELECT tenant FROM records WHERE kind=? AND id=?")
      .get("courses", id);
    if (!c || row.tenant !== u.tenant)
      fail(404, "This course is not available.");
    const e = db
      .prepare(
        "SELECT * FROM enrolments WHERE user_id=? AND course_id=? AND state=?",
      )
      .get(u.id, id, "Active");
    if (e) {
      const snapshot = get("versions", id + "-v" + e.version);
      if (snapshot) return snapshot.course;
    }
    if (c.status !== "Published") fail(404, "This course is not available.");
    return c;
  };
  const enrolled = (u, id) => {
    const c = courseFor(u, id);
    if (u.status !== "Active")
      fail(
        403,
        "Your institute owner needs to activate your account before learning.",
        "ACTIVATION_REQUIRED",
      );
    assertCoachingAccess(store, u, c);
    const e = db
      .prepare(
        "SELECT * FROM enrolments WHERE user_id=? AND course_id=? AND state=?",
      )
      .get(u.id, id, "Active");
    if (!e)
      fail(
        403,
        "Enrol in this course to access the lesson.",
        "ENROLMENT_REQUIRED",
      );
    return { c, e };
  };
  const lessonFor = (u, id) => {
    // Draft removal must not make an enrolled immutable version inaccessible.
    const l =
      get("lessons", id) ||
      list("versions", u.tenant)
        .flatMap((v) => v.lessons || [])
        .find((l) => l.id === id);
    if (!l) fail(404, "Lesson not found.");
    const { e } = enrolled(u, l.courseId);
    const v = get("versions", l.courseId + "-v" + e.version);
    const published = v?.lessons.find((x) => x.id === id);
    if (!published)
      fail(404, "This lesson is not part of your enrolled course version.");
    return published;
  };
  const personal = (u, kind) =>
    db
      .prepare("SELECT body FROM personal WHERE user_id=? AND kind=?")
      .all(u.id, kind)
      .map((r) => JSON.parse(r.body));
  const savePersonal = (u, kind, obj) => {
    db.prepare(
      "INSERT INTO personal VALUES(?,?,?,?) ON CONFLICT(user_id,kind,id) DO UPDATE SET body=excluded.body",
    ).run(u.id, kind, obj.id, JSON.stringify(obj));
    return obj;
  };
  app.get("/api/v1/health", async () => ({
    status: "ok",
    database: "connected",
    mode: "prototype",
    integrations: "not configured",
    timestamp: now(),
  }));
  app.post(
    "/api/v1/auth/login",
    { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const b = z
        .object({ email: z.string().email(), password: z.string().min(1) })
        .parse(req.body);
      const u = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(b.email.toLowerCase().trim());
      if (
        !u ||
        !verifyPassword(b.password, u.password) ||
        !["Active", "Pending activation"].includes(u.status)
      ) {
        audit(
          null,
          "Login rejected",
          "account",
          "Invalid credentials",
          "Denied",
        );
        fail(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
      }
      if (surface(req) === "admin" && u.role === "Learner")
        fail(403, "Use the learner application with this account.");
      const token = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions VALUES(?,?,?,?,?)").run(
        digest(token),
        u.id,
        Date.now() + 86400000,
        now(),
        (req.headers["user-agent"] || "Development client").slice(0, 160),
      );
      reply.setCookie(cookieName(req), token, {
        path: "/api",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400,
      });
      audit(u, "Signed in", u.id);
      return {
        user: safeUser(u),
        permissions: permissionsFor(u),
        nativeToken:
          req.headers["x-qubit-platform"] === "android" &&
          surface(req) === "learner"
            ? token
            : undefined,
        mfa: {
          enforced: false,
          note: "Prototype authentication. Production MFA must be configured before deployment.",
        },
      };
    },
  );
  app.post(
    "/api/v1/auth/register",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const b = z
        .object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          password: z.string().min(12).max(128),
          consent: z.literal(true),
          phone: z
            .string()
            .regex(/^(?:\+91)?[6-9][0-9]{9}$/)
            .optional(),
        })
        .parse(req.body);
      if (
        db
          .prepare("SELECT id FROM users WHERE email=?")
          .get(b.email.toLowerCase())
      )
        fail(
          409,
          "Unable to create this account. Try signing in or recovering your account.",
        );
      const id = randomUUID();
      db.prepare(
        "INSERT INTO users(id,tenant,email,name,role,status,password) VALUES(?,?,?,?,?,?,?)",
      ).run(
        id,
        "tenant-demo",
        b.email.toLowerCase(),
        b.name,
        "Learner",
        "Pending activation",
        hashPassword(b.password),
      );
      if (b.phone)
        db.prepare("UPDATE users SET phone=? WHERE id=?").run(b.phone, id);
      audit(null, "Account registered", id);
      return reply.code(201).send({
        message:
          "Your account is created. Sign in to choose a package. Your institute owner will verify your subscription and activate learning access.",
      });
    },
  );
  app.post("/api/v1/auth/password-reset", async () => ({
    message:
      "If an account exists, recovery instructions will be sent when an email provider is configured. No email is sent in this prototype.",
  }));
  app.post("/api/v1/auth/logout", async (req, reply) => {
    if (req.session)
      db.prepare("DELETE FROM sessions WHERE hash=?").run(req.session);
    reply.clearCookie(cookieName(req), { path: "/api" });
    return { ok: true };
  });
  app.get("/api/v1/me", async (req) => ({
    user: safeUser(auth(req)),
    permissions: permissionsFor(req.user),
    mfa: { enforced: false },
  }));
  app.patch("/api/v1/me", async (req) => {
    const u = auth(req);
    const b = z
      .object({
        name: z.string().min(2).max(100).optional(),
        preferences: z
          .object({
            language: z.string().max(30).optional(),
            timezone: z.string().max(60).optional(),
            weeklyGoal: z.number().int().min(15).max(1200).optional(),
            theme: z.enum(["light", "dark"]).optional(),
            textSize: z.enum(["standard", "large"]).optional(),
            emailNotifications: z.boolean().optional(),
            pushNotifications: z.boolean().optional(),
            aiConsent: z.boolean().optional(),
            analyticsConsent: z.boolean().optional(),
            quietHours: z.string().max(40).optional(),
            interests: z.array(z.string()).optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .parse(req.body);
    db.prepare("UPDATE users SET name=?,preferences=? WHERE id=?").run(
      b.name || u.name,
      JSON.stringify({ ...JSON.parse(u.preferences), ...b.preferences }),
      u.id,
    );
    audit(u, "Profile updated", u.id);
    return safeUser(db.prepare("SELECT * FROM users WHERE id=?").get(u.id));
  });
  app.post("/api/v1/me/password", async (req) => {
    const u = auth(req);
    const b = z
      .object({ current: z.string(), password: z.string().min(12).max(128) })
      .parse(req.body);
    if (!verifyPassword(b.current, u.password))
      fail(400, "Your current password is incorrect.");
    db.prepare("UPDATE users SET password=? WHERE id=?").run(
      hashPassword(b.password),
      u.id,
    );
    db.prepare("DELETE FROM sessions WHERE user_id=? AND hash<>?").run(
      u.id,
      req.session,
    );
    audit(u, "Password changed", u.id);
    return { ok: true };
  });
  app.get("/api/v1/me/sessions", async (req) => {
    const u = auth(req);
    return db
      .prepare(
        "SELECT hash,created,device FROM sessions WHERE user_id=? AND expires>?",
      )
      .all(u.id, Date.now())
      .map((s) => ({
        id: s.hash,
        created: s.created,
        device: s.device,
        current: s.hash === req.session,
      }));
  });
  app.delete("/api/v1/me/sessions/:id", async (req) => {
    const u = auth(req);
    db.prepare("DELETE FROM sessions WHERE user_id=? AND hash=?").run(
      u.id,
      req.params.id,
    );
    audit(u, "Session revoked", u.id);
    return { ok: true };
  });
  app.get("/api/v1/catalog/courses", async (req) => {
    const u = auth(req);
    const es = db
      .prepare("SELECT * FROM enrolments WHERE user_id=? AND state=?")
      .all(u.id, "Active");
    const ps = db.prepare("SELECT * FROM progress WHERE user_id=?").all(u.id);
    return list("courses", u.tenant)
      .filter(
        (c) => c.status === "Published" || es.some((e) => e.course_id === c.id),
      )
      .map((current) => {
        const e = es.find((e) => e.course_id === current.id);
        const c = e
          ? get("versions", current.id + "-v" + e.version)?.course || current
          : current;
        const ls = e
          ? get("versions", c.id + "-v" + e.version)?.lessons || []
          : list("lessons", u.tenant).filter((l) => l.courseId === c.id);
        return {
          ...c,
          joined: !!e,
          enrolledVersion: e?.version,
          completed: ls.filter((l) =>
            ps.some((p) => p.lesson_id === l.id && p.completed),
          ).length,
          total: ls.length,
          progress: Math.round(
            (100 *
              ls.filter((l) =>
                ps.some((p) => p.lesson_id === l.id && p.completed),
              ).length) /
              (ls.length || 1),
          ),
        };
      });
  });
  app.get("/api/v1/courses/:id", async (req) => {
    const u = auth(req),
      c = courseFor(u, req.params.id);
    const e = db
      .prepare(
        "SELECT * FROM enrolments WHERE user_id=? AND course_id=? AND state=?",
      )
      .get(u.id, c.id, "Active");
    const ls = e
      ? get("versions", c.id + "-v" + e.version)?.lessons || []
      : list("lessons", u.tenant).filter((l) => l.courseId === c.id);
    const ps = db.prepare("SELECT * FROM progress WHERE user_id=?").all(u.id);
    return {
      ...c,
      joined: !!e,
      lessons: ls.map(({ content, ...l }) => ({
        ...l,
        completed: !!ps.find((p) => p.lesson_id === l.id && p.completed),
        positionSaved: ps.find((p) => p.lesson_id === l.id)?.position || 0,
      })),
      quiz: { count: 5, timeMinutes: 15, passMark: 80, maxAttempts: 3 },
    };
  });
  app.post("/api/v1/courses/:id/enrolments", async (req) => {
    const u = auth(req),
      c = courseFor(u, req.params.id);
    assertCoachingAccess(store, u, c);
    if (c.access !== "Open" && !c.coaching)
      fail(
        403,
        "This course requires an access grant from your organisation.",
        "RESTRICTED",
      );
    db.prepare("INSERT OR IGNORE INTO enrolments VALUES(?,?,?,?,?)").run(
      u.id,
      c.id,
      c.version,
      "Active",
      now(),
    );
    audit(u, "Course enrolment", c.id);
    return { ok: true };
  });
  app.get("/api/v1/lessons/:id", async (req) =>
    lessonFor(auth(req), req.params.id),
  );
  app.get("/api/v1/lessons/:id/offline", async (req) => {
    const u = auth(req),
      l = lessonFor(u, req.params.id);
    if (!list("flags").find((f) => f.key === "offline")?.enabled)
      fail(409, "Offline downloads are disabled by your administrator.");
    if (!l.downloadable || !l.rights)
      fail(403, "This lesson is not eligible for offline access.");
    const c = get("courses", l.courseId);
    const subscriptions = c.coaching
      ? db
          .prepare(
            "SELECT expires,course_ids FROM subscriptions WHERE user_id=? AND status='Active' AND starts<=? AND expires>?",
          )
          .all(u.id, now(), now())
          .filter((s) => JSON.parse(s.course_ids).includes(c.id))
      : [];
    const accessEnd = subscriptions.length
      ? Math.max(...subscriptions.map((s) => new Date(s.expires).getTime()))
      : Date.now() + 86400000;
    return { ...l, expires: Math.min(Date.now() + 86400000, accessEnd) };
  });
  app.put("/api/v1/lessons/:id/progress", async (req) => {
    const u = auth(req),
      l = lessonFor(u, req.params.id);
    const b = z
      .object({
        completed: z.boolean().default(false),
        position: z
          .number()
          .int()
          .min(0)
          .max(l.duration * 60)
          .default(0),
        key: z.string().min(8).max(100),
      })
      .strict()
      .parse(req.body);
    db.exec("BEGIN");
    try {
      const exists = db
        .prepare("SELECT key FROM events WHERE user_id=? AND key=?")
        .get(u.id, b.key);
      if (!exists) {
        db.prepare("INSERT INTO events VALUES(?,?)").run(u.id, b.key);
        db.prepare(
          "INSERT INTO progress VALUES(?,?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed=MAX(completed,excluded.completed),position=MAX(position,excluded.position),updated=excluded.updated",
        ).run(u.id, l.id, b.completed ? 1 : 0, b.position, now());
      }
      db.exec("COMMIT");
      return { ok: true, duplicate: !!exists };
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  });
  app.get("/api/v1/me/learning", async (req) => {
    const u = auth(req);
    return {
      progress: db.prepare("SELECT * FROM progress WHERE user_id=?").all(u.id),
      attempts: db
        .prepare(
          "SELECT id,course_id,status,score,submitted,started FROM attempts WHERE user_id=? ORDER BY started DESC",
        )
        .all(u.id),
      notes: personal(u, "notes"),
      bookmarks: personal(u, "bookmarks"),
      saved: personal(u, "saved"),
      read: personal(u, "read"),
      submissions: list("submissions", u.tenant).filter(
        (s) => s.userId === u.id,
      ),
      certificates: list("certificates", u.tenant).filter(
        (c) => c.userId === u.id,
      ),
    };
  });
  app.put("/api/v1/me/:kind/:id", async (req) => {
    const u = auth(req),
      kind = req.params.kind;
    if (!["notes", "bookmarks", "saved", "read", "downloads"].includes(kind))
      fail(404, "Not found.");
    const b = z
      .object({
        text: z.string().max(10000).optional(),
        lessonId: z.string().optional(),
        courseId: z.string().optional(),
        position: z.number().min(0).optional(),
        title: z.string().max(300).optional(),
      })
      .strict()
      .parse(req.body);
    if (b.lessonId) lessonFor(u, b.lessonId);
    return savePersonal(u, kind, { ...b, id: req.params.id, updated: now() });
  });
  app.delete("/api/v1/me/:kind/:id", async (req) => {
    const u = auth(req);
    if (
      !["notes", "bookmarks", "saved", "read", "downloads"].includes(
        req.params.kind,
      )
    )
      fail(404, "Not found.");
    db.prepare("DELETE FROM personal WHERE user_id=? AND kind=? AND id=?").run(
      u.id,
      req.params.kind,
      req.params.id,
    );
    return { ok: true };
  });
  app.post("/api/v1/quizzes/:id/attempts", async (req) => {
    const u = auth(req);
    enrolled(u, req.params.id);
    const open = db
      .prepare(
        "SELECT * FROM attempts WHERE user_id=? AND course_id=? AND status=?",
      )
      .get(u.id, req.params.id, "In progress");
    if (open && Date.now() - open.started < 15 * 60000)
      return {
        id: open.id,
        questions: JSON.parse(open.questions).map(
          ({ answer, explanation, ...q }) => q,
        ),
        responses: JSON.parse(open.responses),
        expires: open.started + 15 * 60000,
      };
    const count = db
      .prepare(
        "SELECT count(*) n FROM attempts WHERE user_id=? AND course_id=?",
      )
      .get(u.id, req.params.id).n;
    if (count >= 3)
      fail(
        409,
        "You have used all three attempts. Ask your instructor for help.",
        "ATTEMPTS_EXHAUSTED",
      );
    if (open)
      db.prepare("UPDATE attempts SET status=? WHERE id=?").run(
        "Expired",
        open.id,
      );
    const qs = list("questions", u.tenant)
      .filter((q) =>
        get("courses", req.params.id)?.coaching
          ? q.courseId === req.params.id
          : !q.courseId,
      )
      .slice(0, 5)
      .sort(() => Math.random() - 0.5);
    if (!qs.length) fail(409, "No approved questions are available.");
    const id = randomUUID(),
      started = Date.now();
    db.prepare(
      "INSERT INTO attempts(id,user_id,course_id,questions,status,started) VALUES(?,?,?,?,?,?)",
    ).run(id, u.id, req.params.id, JSON.stringify(qs), "In progress", started);
    return {
      id,
      questions: qs.map(({ answer, explanation, ...q }) => q),
      responses: {},
      expires: started + 15 * 60000,
    };
  });
  const attemptFor = (req) => {
    const a = db
      .prepare("SELECT * FROM attempts WHERE id=? AND user_id=?")
      .get(req.params.id, auth(req).id);
    if (!a) fail(404, "Attempt not found.");
    enrolled(auth(req), a.course_id);
    return a;
  };
  app.put("/api/v1/quiz-attempts/:id/responses", async (req) => {
    const a = attemptFor(req);
    if (a.status !== "In progress" || Date.now() > a.started + 15 * 60000)
      fail(409, "This assessment is no longer open.");
    const b = z
      .record(
        z.string(),
        z.union([
          z.string().max(2000),
          z.number().int().min(0).max(20),
          z.array(z.number().int().min(0).max(20)).max(20),
        ]),
      )
      .parse(req.body);
    const ids = JSON.parse(a.questions).map((q) => q.id);
    if (Object.keys(b).some((k) => !ids.includes(k)))
      fail(400, "Unknown question.");
    db.prepare("UPDATE attempts SET responses=? WHERE id=?").run(
      JSON.stringify(b),
      a.id,
    );
    return { ok: true };
  });
  app.post("/api/v1/quiz-attempts/:id/submit", async (req) => {
    const a = attemptFor(req);
    if (a.status === "Submitted")
      return {
        score: a.score,
        passed: a.score >= 80,
        review: JSON.parse(a.questions),
        id: a.id,
      };
    if (a.status !== "In progress" || Date.now() > a.started + 15 * 60000)
      fail(409, "The assessment time limit has passed.");
    const responses = JSON.parse(a.responses),
      qs = JSON.parse(a.questions);
    const correct = (q) =>
      Array.isArray(q.answer)
        ? JSON.stringify([...q.answer].sort()) ===
          JSON.stringify(
            Array.isArray(responses[q.id]) ? [...responses[q.id]].sort() : [],
          )
        : typeof q.answer === "string"
          ? String(responses[q.id] || "")
              .trim()
              .toLowerCase() === q.answer.toLowerCase()
          : responses[q.id] === q.answer;
    const score = Math.round((qs.filter(correct).length / qs.length) * 100);
    db.prepare(
      "UPDATE attempts SET status=?,score=?,submitted=? WHERE id=?",
    ).run("Submitted", score, now(), a.id);
    audit(req.user, "Assessment submitted", a.course_id);
    return {
      score,
      passed: score >= 80,
      review: qs.map((q) => ({
        ...q,
        correct: correct(q),
        response: responses[q.id],
      })),
      id: a.id,
    };
  });
  app.get("/api/v1/learning/resources/:kind", async (req) => {
    const u = auth(req),
      kind = req.params.kind;
    if (
      ![
        "assignments",
        "notifications",
        "sessions",
        "discussions",
        "tickets",
        "certificates",
        "privacy",
      ].includes(kind)
    )
      fail(404, "Not found.");
    return list(kind, u.tenant).filter((r) =>
      kind === "notifications"
        ? r.status === "Published" &&
          r.channel === "In-app" &&
          (r.audience === "All learners" ||
            list("groups", u.tenant).some(
              (g) => g.name === r.audience && g.userIds?.includes(u.id),
            ))
        : kind === "certificates" || kind === "tickets" || kind === "privacy"
          ? r.userId === u.id
          : !r.courseId ||
            (get("courses", r.courseId)?.coaching &&
            (() => {
              try {
                assertCoachingAccess(store, u, get("courses", r.courseId));
                return true;
              } catch {
                return false;
              }
            })() === false
              ? false
              : !!db
                  .prepare(
                    "SELECT user_id FROM enrolments WHERE user_id=? AND course_id=? AND state=?",
                  )
                  .get(u.id, r.courseId, "Active")),
    );
  });
  app.post("/api/v1/assignments/:id/submit", async (req) => {
    const u = auth(req),
      a = scoped(req, "assignments", req.params.id);
    enrolled(u, a.courseId);
    if (a.status !== "Open") fail(409, "This assignment is closed.");
    const b = z
      .object({
        text: z.string().min(30).max(20000),
        attachmentId: z.string().optional(),
      })
      .strict()
      .parse(req.body);
    if (b.attachmentId) {
      const f = scoped(req, "uploads", b.attachmentId);
      if (f.userId !== u.id)
        fail(403, "That attachment belongs to another learner.");
    }
    const existing = list("submissions", u.tenant).find(
      (x) => x.assignmentId === a.id && x.userId === u.id,
    );
    if (existing && existing.status !== "Returned")
      fail(
        409,
        "Already submitted. A reviewer can return it for resubmission.",
      );
    return put(
      "submissions",
      {
        id: existing?.id || randomUUID(),
        assignmentId: a.id,
        title: a.title,
        userId: u.id,
        learner: u.name,
        courseId: a.courseId,
        text: b.text,
        attachmentId: b.attachmentId,
        status: "Submitted",
        submitted: now(),
        grade: null,
        feedback: "",
      },
      u.tenant,
    );
  });
  app.post("/api/v1/support", async (req) => {
    const u = auth(req),
      b = z
        .object({
          title: z.string().min(5).max(150),
          description: z.string().min(15).max(5000),
          category: z.string().max(50),
        })
        .strict()
        .parse(req.body);
    return put(
      "tickets",
      {
        ...b,
        id: randomUUID(),
        userId: u.id,
        learner: u.name,
        status: "Open",
        priority: "Normal",
        assignee: "Support team",
        responses: [],
        created: now(),
      },
      u.tenant,
    );
  });
  app.post("/api/v1/discussions/:id/replies", async (req) => {
    const u = auth(req),
      d = scoped(req, "discussions", req.params.id);
    enrolled(u, d.courseId);
    if (d.status !== "Open") fail(409, "This discussion is closed.");
    const b = z.object({ text: z.string().min(2).max(2000) }).parse(req.body);
    return put(
      "discussions",
      {
        ...d,
        replies: [
          ...(d.replies || []),
          { id: randomUUID(), author: u.name, text: b.text, created: now() },
        ],
      },
      u.tenant,
    );
  });
  app.post("/api/v1/me/privacy", async (req) => {
    const u = auth(req),
      b = z
        .object({ type: z.enum(["Data export", "Account deletion"]) })
        .parse(req.body);
    audit(u, "Privacy request created", u.id, b.type);
    return put(
      "privacy",
      {
        id: randomUUID(),
        name: u.name,
        userId: u.id,
        type: b.type,
        status: "Pending verification",
        created: now(),
        reason: "Retention and identity review required before execution.",
      },
      u.tenant,
    );
  });
  app.get("/api/v1/me/export", async (req) => {
    const u = auth(req);
    audit(u, "Personal data exported", u.id);
    return {
      profile: safeUser(u),
      progress: db.prepare("SELECT * FROM progress WHERE user_id=?").all(u.id),
      notes: personal(u, "notes"),
      submissions: list("submissions", u.tenant).filter(
        (x) => x.userId === u.id,
      ),
      attempts: db
        .prepare(
          "SELECT id,course_id,status,score,submitted FROM attempts WHERE user_id=?",
        )
        .all(u.id),
      exported: now(),
    };
  });
  app.post("/api/v1/courses/:id/certificate", async (req) => {
    const u = auth(req),
      { c, e } = enrolled(u, req.params.id);
    if (!list("flags").find((f) => f.key === "certificates")?.enabled)
      fail(409, "Certificates are disabled.");
    const ls = get("versions", c.id + "-v" + e.version)?.lessons || [];
    const ps = db
      .prepare("SELECT lesson_id FROM progress WHERE user_id=? AND completed=1")
      .all(u.id);
    const done =
      ls.length > 0 &&
      ls
        .filter((l) => l.required)
        .every((l) => ps.some((p) => p.lesson_id === l.id));
    const pass = db
      .prepare(
        "SELECT id FROM attempts WHERE user_id=? AND course_id=? AND status=? AND score>=80",
      )
      .get(u.id, c.id, "Submitted");
    if (!done || !pass)
      fail(
        409,
        "Complete every required lesson and pass the assessment with at least 80% to earn this certificate.",
      );
    const existing = list("certificates", u.tenant).find(
      (x) =>
        x.userId === u.id && x.courseId === c.id && x.version === e.version,
    );
    if (existing) return existing;
    const cert = put(
      "certificates",
      {
        id: "QBT-" + randomBytes(6).toString("hex").toUpperCase(),
        title: c.title,
        name: u.name,
        userId: u.id,
        courseId: c.id,
        version: e.version,
        issuer: "Qubit Institute",
        issued: now(),
        status: "Valid",
      },
      u.tenant,
    );
    audit(u, "Certificate issued", cert.id);
    return cert;
  });
  app.get("/api/v1/certificates/:id/verify", async (req) => {
    const c = get("certificates", req.params.id);
    if (!c) fail(404, "Certificate not found.");
    return {
      id: c.id,
      title: c.title,
      name: c.name,
      issuer: c.issuer,
      issued: c.issued,
      status: c.status,
    };
  });
  app.post("/api/v1/tutor", async (req) => {
    const u = auth(req);
    if (!list("flags").find((f) => f.key === "tutor")?.enabled)
      fail(409, "The learning assistant is disabled.");
    const b = z
      .object({
        lessonId: z.string(),
        question: z.string().min(2).max(2000),
        mode: z
          .enum(["explain", "summary", "practice", "flashcards"])
          .default("explain"),
      })
      .parse(req.body);
    const l = lessonFor(u, b.lessonId);
    const paragraphs = l.content.split("\n\n");
    const result =
      b.mode === "flashcards"
        ? `Concept: ${l.title}\nDefinition: ${paragraphs[0]}\n\nReflection: ${paragraphs.at(-1)}`
        : b.mode === "practice"
          ? `Try this open-ended practice exercise:\n\n${paragraphs.at(-1)}\n\nThis is optional practice; it does not affect your grade.`
          : b.mode === "summary"
            ? `${l.subtitle}\n\n${paragraphs[0]}`
            : `Here is the course reference for “${l.title}”.\n\n${paragraphs[0]}\n\n${paragraphs[1]}\n\nFor a personalised answer to your question, connect an approved AI provider. This reference assistant only retrieves approved lesson material.`;
    return {
      answer: result,
      source: { lessonId: l.id, title: l.title },
      mode: "Reference fallback · no generative AI provider",
      provider: null,
    };
  });
  app.post("/api/v1/uploads", async (req) => {
    const u = auth(req),
      b = z
        .object({
          name: z.string().min(1).max(150),
          type: z.enum([
            "application/pdf",
            "text/plain",
            "image/png",
            "image/jpeg",
          ]),
          data: z.string().max(7 * 1024 * 1024),
        })
        .strict()
        .parse(req.body);
    const bytes = Buffer.from(b.data, "base64");
    if (bytes.length > 5 * 1024 * 1024)
      fail(400, "Files must be 5 MB or smaller.");
    if (
      b.type === "application/pdf" &&
      !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
    )
      fail(400, "This file is not a valid PDF.");
    if (
      b.type === "image/png" &&
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    )
      fail(400, "This file is not a valid PNG.");
    if (
      b.type === "image/jpeg" &&
      bytes.subarray(0, 3).toString("hex") !== "ffd8ff"
    )
      fail(400, "This file is not a valid JPEG.");
    if (b.type === "text/plain" && bytes.includes(0))
      fail(400, "Binary data is not allowed as text.");
    const id = randomUUID();
    put(
      "uploads",
      {
        id,
        name: b.name,
        type: b.type,
        data: bytes.toString("base64"),
        userId: u.id,
        size: bytes.length,
      },
      u.tenant,
    );
    if (u.role !== "Learner")
      put(
        "media",
        {
          id,
          title: b.name,
          type: b.type,
          size: Math.ceil(bytes.length / 1024) + " KB",
          status: "Ready",
          rights: "Uploader attested",
          captions: "Not applicable",
          uploadId: id,
        },
        u.tenant,
      );
    audit(u, "File uploaded", id);
    return { id, name: b.name, size: bytes.length };
  });
  app.get("/api/v1/uploads/:id", async (req, reply) => {
    const u = auth(req),
      f = scoped(req, "uploads", req.params.id);
    if (
      f.userId !== u.id &&
      !perms[u.role]?.some(
        (p) => p === "*" || p === "media" || p === "assessments",
      )
    )
      fail(403, "This file is private.");
    return reply
      .header(
        "Content-Disposition",
        `attachment; filename="${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      )
      .header("X-Content-Type-Options", "nosniff")
      .type(f.type)
      .send(Buffer.from(f.data, "base64"));
  });
  // Admin routes enforce permissions and tenant ownership independently of the UI.
  app.get("/api/v1/admin/dashboard", async (req) => {
    permit(req, "analytics");
    const users = db
      .prepare(
        "SELECT id,role,status FROM users" +
          (req.user.role === "Super Admin" ? "" : " WHERE tenant=?"),
      )
      .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]));
    const cs = rows(req, "courses");
    const es = db
      .prepare(
        "SELECT e.* FROM enrolments e JOIN users u ON u.id=e.user_id" +
          (req.user.role === "Super Admin" ? "" : " WHERE u.tenant=?"),
      )
      .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]));
    const attempts = db
      .prepare(
        "SELECT a.score,a.status FROM attempts a JOIN users u ON u.id=a.user_id" +
          (req.user.role === "Super Admin" ? "" : " WHERE u.tenant=?"),
      )
      .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]));
    return {
      users: users.length,
      active: users.filter((x) => x.status === "Active").length,
      courses: cs.length,
      published: cs.filter((c) => c.status === "Published").length,
      enrolments: es.length,
      attempts: attempts.length,
      average: attempts.filter((a) => a.status === "Submitted").length
        ? Math.round(
            attempts
              .filter((a) => a.status === "Submitted")
              .reduce((s, a) => s + a.score, 0) /
              attempts.filter((a) => a.status === "Submitted").length,
          )
        : null,
      certificates: rows(req, "certificates").length,
      submissions: rows(req, "submissions").filter(
        (x) => x.status === "Submitted",
      ).length,
      series: [
        { name: "Mon", learners: 24, completions: 8 },
        { name: "Tue", learners: 38, completions: 12 },
        { name: "Wed", learners: 31, completions: 15 },
        { name: "Thu", learners: 54, completions: 22 },
        { name: "Fri", learners: 45, completions: 18 },
        { name: "Sat", learners: 63, completions: 30 },
        { name: "Sun", learners: 58, completions: 26 },
      ],
      seriesLabel: "Illustrative pilot trend · synthetic data",
      audit: db
        .prepare(
          "SELECT * FROM audit" +
            (req.user.role === "Super Admin" ? "" : " WHERE tenant=?") +
            " ORDER BY created DESC LIMIT 6",
        )
        .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant])),
    };
  });
  app.get("/api/v1/admin/users", async (req) => {
    permit(req, "users");
    return db
      .prepare(
        "SELECT * FROM users" +
          (req.user.role === "Super Admin" ? "" : " WHERE tenant=?"),
      )
      .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]))
      .map(safeUser);
  });
  app.post("/api/v1/admin/users", async (req) => {
    const u = permit(req, "users"),
      b = z
        .object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          role: z
            .enum([
              "Learner",
              "Instructor",
              "Support",
              "Finance",
              "Tenant Admin",
            ])
            .default("Learner"),
          status: z.enum(["Active", "Invited"]).default("Invited"),
          reason: z.string().min(3),
        })
        .strict()
        .parse(req.body);
    if (u.role !== "Super Admin" && b.role !== "Learner")
      fail(403, "Only Super Admin can grant staff roles.");
    if (
      db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(b.email.toLowerCase())
    )
      fail(409, "This email is already in use.");
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users(id,tenant,email,name,role,status,password) VALUES(?,?,?,?,?,?,?)",
    ).run(
      id,
      u.tenant,
      b.email.toLowerCase(),
      b.name,
      b.role,
      b.status,
      hashPassword(randomBytes(32).toString("hex")),
    );
    audit(u, "User created", id, b.reason);
    return {
      id,
      message: "Invitation recorded. Email delivery requires a provider.",
    };
  });
  app.patch("/api/v1/admin/users/:id", async (req) => {
    const u = permit(req, "users");
    const target = db
      .prepare("SELECT * FROM users WHERE id=?")
      .get(req.params.id);
    if (!target || (u.role !== "Super Admin" && target.tenant !== u.tenant))
      fail(404, "User not found.");
    const b = z
      .object({
        name: z.string().min(2).max(100).optional(),
        role: z.enum(Object.keys(perms)).optional(),
        status: z
          .enum([
            "Active",
            "Inactive",
            "Blocked",
            "Pending activation",
            "Suspended",
            "Deactivated",
            "Invited",
          ])
          .optional(),
        reason: z.string().min(3).max(1000),
        password: z.string().optional(),
      })
      .strict()
      .parse(req.body);
    if (target.role !== "Learner" && u.role !== "Super Admin")
      fail(403, "Only the institute owner can manage staff accounts.");
    if (b.role && b.role !== target.role) {
      if (u.role !== "Super Admin")
        fail(403, "Only Super Admin can change roles.");
      if (!b.password || !verifyPassword(b.password, u.password))
        fail(
          403,
          "Confirm your password to change a role.",
          "STEP_UP_REQUIRED",
        );
    }
    if (
      target.id === u.id &&
      ((b.role && b.role !== u.role) || (b.status && b.status !== "Active"))
    )
      fail(409, "You cannot remove your own administrative access.");
    db.prepare("UPDATE users SET name=?,role=?,status=? WHERE id=?").run(
      b.name || target.name,
      b.role || target.role,
      b.status || target.status,
      target.id,
    );
    if (
      (b.status && b.status !== "Active") ||
      (b.role && b.role !== target.role)
    )
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
    audit(u, "User updated", target.id, b.reason);
    return safeUser(
      db.prepare("SELECT * FROM users WHERE id=?").get(target.id),
    );
  });
  app.post("/api/v1/admin/users/:id/revoke", async (req) => {
    const u = permit(req, "users"),
      b = z.object({ reason: z.string().min(3) }).parse(req.body);
    const target = db
      .prepare("SELECT * FROM users WHERE id=?")
      .get(req.params.id);
    if (!target || (u.role !== "Super Admin" && target.tenant !== u.tenant))
      fail(404, "User not found.");
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
    audit(u, "All sessions revoked", target.id, b.reason);
    return { ok: true };
  });
  app.post("/api/v1/admin/enrolments", async (req) => {
    const u = permit(req, "users"),
      b = z
        .object({
          userId: z.string(),
          courseId: z.string(),
          state: z.enum(["Active", "Suspended"]).default("Active"),
          reason: z.string().min(3),
        })
        .strict()
        .parse(req.body);
    const target = db.prepare("SELECT * FROM users WHERE id=?").get(b.userId),
      c = scoped(req, "courses", b.courseId);
    const owner = db
      .prepare("SELECT tenant FROM records WHERE kind=? AND id=?")
      .get("courses", c.id);
    if (
      !target ||
      target.tenant !== owner.tenant ||
      (u.role !== "Super Admin" && target.tenant !== u.tenant)
    )
      fail(403, "User and course must belong to the same tenant.");
    if (c.status !== "Published")
      fail(409, "Only published courses can be assigned.");
    db.prepare(
      "INSERT INTO enrolments VALUES(?,?,?,?,?) ON CONFLICT(user_id,course_id) DO UPDATE SET state=excluded.state",
    ).run(target.id, c.id, c.version, b.state, now());
    audit(u, "Enrolment updated", `${target.id}/${c.id}`, b.reason);
    return { ok: true };
  });
  app.put("/api/v1/admin/groups/:id/members", async (req) => {
    const u = permit(req, "groups"),
      g = scoped(req, "groups", req.params.id),
      b = z
        .object({
          userIds: z.array(z.string()).max(1000),
          reason: z.string().min(3),
        })
        .strict()
        .parse(req.body);
    const tenant = db
      .prepare("SELECT tenant FROM records WHERE kind=? AND id=?")
      .get("groups", g.id).tenant;
    const ids = [...new Set(b.userIds)];
    for (const id of ids) {
      const member = db.prepare("SELECT tenant FROM users WHERE id=?").get(id);
      if (!member || member.tenant !== tenant)
        fail(400, "Every group member must belong to the same organisation.");
    }
    const result = put(
      "groups",
      { ...g, userIds: ids, members: ids.length },
      tenant,
    );
    audit(u, "Group membership updated", g.id, b.reason);
    return result;
  });
  app.post("/api/v1/admin/groups/:id/enrolments", async (req) => {
    const u = permit(req, "groups"),
      g = scoped(req, "groups", req.params.id),
      b = z
        .object({ courseId: z.string(), reason: z.string().min(3) })
        .strict()
        .parse(req.body),
      c = scoped(req, "courses", b.courseId);
    const tenant = db
      .prepare("SELECT tenant FROM records WHERE kind=? AND id=?")
      .get("groups", g.id).tenant;
    const courseTenant = db
      .prepare("SELECT tenant FROM records WHERE kind=? AND id=?")
      .get("courses", c.id).tenant;
    if (tenant !== courseTenant || c.status !== "Published")
      fail(409, "Choose a published course in the group’s organisation.");
    const ids = g.userIds || [];
    if (!ids.length) fail(409, "Add members to this group first.");
    db.exec("BEGIN");
    try {
      for (const id of ids) {
        const member = db
          .prepare("SELECT tenant FROM users WHERE id=?")
          .get(id);
        if (!member || member.tenant !== tenant)
          fail(409, "Group membership needs review.");
        db.prepare(
          "INSERT INTO enrolments VALUES(?,?,?,?,?) ON CONFLICT(user_id,course_id) DO UPDATE SET state=excluded.state",
        ).run(id, c.id, c.version, "Active", now());
      }
      audit(u, "Group course assigned", g.id, b.reason);
      db.exec("COMMIT");
      return { assigned: ids.length };
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  });
  app.get("/api/v1/admin/courses", async (req) => {
    permit(req, "courses");
    return rows(req, "courses");
  });
  app.post("/api/v1/admin/courses", async (req) => {
    const u = permit(req, "courses"),
      b = z
        .object({
          title: z.string().min(5).max(150),
          description: z.string().min(20).max(5000),
          category: z.string(),
          level: z.string(),
          instructor: z.string().min(2),
          outcomes: z.string().min(10),
          access: z.enum(["Open", "Restricted"]).default("Open"),
          language: z.string().default("Hindi + English"),
          image: z.string().max(2000).optional(),
          thumbnailAssetId: z.string().optional(),
          exam: z.string().max(100).optional(),
          batch: z.string().max(100).optional(),
        })
        .strict()
        .parse(req.body);
    const id = randomUUID();
    const c = put(
      "courses",
      {
        ...b,
        id,
        coaching: true,
        requiresSubscription: true,
        image: b.image || "/images/repair-laptop.jpg",
        status: "Draft",
        version: 0,
        color: "sage",
        initials: b.instructor
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2),
        duration: "Self-paced",
        enrolled: 0,
        rating: 0,
        revision: 1,
      },
      u.tenant,
    );
    audit(u, "Course draft created", id);
    return c;
  });
  app.patch("/api/v1/admin/courses/:id", async (req) => {
    const u = permit(req, "courses"),
      c = scoped(req, "courses", req.params.id);
    const b = z
      .object({
        title: z.string().min(5).max(150).optional(),
        description: z.string().min(20).optional(),
        outcomes: z.string().min(10).optional(),
        category: z.string().optional(),
        level: z.string().optional(),
        instructor: z.string().min(2).optional(),
        access: z.enum(["Open", "Restricted"]).optional(),
        image: z.string().max(2000).optional(),
        thumbnailAssetId: z.string().optional(),
        language: z.string().max(100).optional(),
        exam: z.string().max(100).optional(),
        batch: z.string().max(100).optional(),
        status: z
          .enum(["Draft", "In Review", "Approved", "Archived"])
          .optional(),
        revision: z.number().int().optional(),
      })
      .strict()
      .parse(req.body);
    if (b.revision !== undefined && b.revision !== (c.revision || 1))
      fail(
        409,
        "This course changed. Reload before saving.",
        "VERSION_CONFLICT",
      );
    if (c.status === "Published" && b.status !== "Archived")
      fail(409, "Create a new draft version before editing published content.");
    if (
      b.status === "Approved" &&
      !["Super Admin", "Tenant Admin"].includes(u.role)
    )
      fail(403, "A reviewer must approve this draft.");
    const result = put(
      "courses",
      { ...c, ...b, revision: (c.revision || 1) + 1 },
      u.tenant,
    );
    audit(u, "Course updated", c.id);
    return result;
  });
  app.get("/api/v1/admin/courses/:id/lessons", async (req) => {
    permit(req, "courses");
    scoped(req, "courses", req.params.id);
    return rows(req, "lessons").filter((l) => l.courseId === req.params.id);
  });
  app.post("/api/v1/admin/courses/:id/lessons", async (req) => {
    const u = permit(req, "courses"),
      c = scoped(req, "courses", req.params.id);
    if (c.status === "Published")
      fail(409, "Create a new draft version first.");
    const b = z
      .object({
        title: z.string().min(3),
        content: z.string().min(30).max(30000),
        module: z.string().min(3),
        type: z.enum([
          "Reading",
          "Audio",
          "Video",
          "Document",
          "Image",
          "Link",
        ]),
        assetIds: z.array(z.string()).max(10).default([]),
        duration: z.number().min(1).max(600),
        captions: z.boolean(),
        rights: z.boolean(),
        downloadable: z.boolean().default(true),
      })
      .strict()
      .parse(req.body);
    for (const id of b.assetIds) scoped(req, "coaching_assets", id);
    return put(
      "lessons",
      {
        ...b,
        id: randomUUID(),
        courseId: c.id,
        position: rows(req, "lessons").filter((l) => l.courseId === c.id)
          .length,
        required: true,
      },
      u.tenant,
    );
  });
  app.patch("/api/v1/admin/lessons/:id", async (req) => {
    const u = permit(req, "courses"),
      l = scoped(req, "lessons", req.params.id),
      c = scoped(req, "courses", l.courseId);
    if (c.status === "Published")
      fail(409, "Published lessons are immutable. Create a new draft.");
    const b = z
      .object({
        title: z.string().min(3).optional(),
        content: z.string().min(30).max(30000).optional(),
        position: z.number().int().min(0).optional(),
        assetIds: z.array(z.string()).max(10).optional(),
        type: z
          .enum(["Reading", "Audio", "Video", "Document", "Image", "Link"])
          .optional(),
        duration: z.number().min(1).max(600).optional(),
        captions: z.boolean().optional(),
        rights: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    for (const id of b.assetIds || []) scoped(req, "coaching_assets", id);
    return put("lessons", { ...l, ...b }, u.tenant);
  });
  const preflight = (c) => {
    const ls = list("lessons").filter((l) => l.courseId === c.id);
    return [
      {
        label: "Uploaded resources are ready",
        passed: ls.every(
          (l) =>
            !c.coaching ||
            !["Video", "Document", "Image"].includes(l.type) ||
            (l.assetIds?.length &&
              l.assetIds.every(
                (id) => get("coaching_assets", id)?.status === "Ready",
              )),
        ),
        field: "lessons",
      },
      {
        label: "Clear learning outcomes",
        passed: !!c.outcomes?.trim(),
        field: "outcomes",
      },
      {
        label: "Course description and instructor",
        passed: !!c.description?.trim() && !!c.instructor?.trim(),
        field: "description",
      },
      {
        label: "At least one complete lesson",
        passed: ls.length > 0 && ls.every((l) => l.content.length >= 30),
        field: "lessons",
      },
      {
        label: "Rights confirmed for every lesson",
        passed: ls.length > 0 && ls.every((l) => l.rights),
        field: "rights",
      },
      {
        label: "Captions / transcript for audio and video",
        passed: ls.every(
          (l) => !["Audio", "Video"].includes(l.type) || l.captions,
        ),
        field: "captions",
      },
      {
        label: "Human review approved",
        passed: c.status === "Approved",
        field: "status",
      },
    ];
  };
  app.post("/api/v1/admin/courses/:id/preflight", async (req) => {
    permit(req, "courses");
    return preflight(scoped(req, "courses", req.params.id));
  });
  app.post("/api/v1/admin/courses/:id/publish", async (req) => {
    const u = permit(req, "courses");
    if (!["Super Admin", "Tenant Admin"].includes(u.role))
      fail(403, "Publishing requires reviewer permission.");
    const c = scoped(req, "courses", req.params.id);
    const checks = preflight(c);
    if (checks.some((x) => !x.passed))
      fail(
        409,
        "Publishing preflight failed. Resolve the highlighted checks.",
        "PREFLIGHT_FAILED",
      );
    const version = c.version + 1,
      ls = list("lessons").filter((l) => l.courseId === c.id);
    const result = put(
      "courses",
      { ...c, status: "Published", version, revision: (c.revision || 1) + 1 },
      u.tenant,
    );
    put(
      "versions",
      {
        id: c.id + "-v" + version,
        courseId: c.id,
        version,
        course: result,
        lessons: ls,
        published: now(),
      },
      u.tenant,
    );
    audit(
      u,
      "Course published",
      c.id,
      `Version ${version}; existing enrolments retain their original version.`,
    );
    return result;
  });
  app.post("/api/v1/admin/courses/:id/new-version", async (req) => {
    const u = permit(req, "courses"),
      c = scoped(req, "courses", req.params.id);
    if (c.status !== "Published")
      fail(409, "Only published courses can create a new version.");
    audit(u, "New course draft version", c.id);
    return put(
      "courses",
      { ...c, status: "Draft", revision: (c.revision || 1) + 1 },
      u.tenant,
    );
  });
  app.get("/api/v1/admin/roles", async (req) => {
    permit(req, "users");
    return Object.entries(perms).map(([name, permissions]) => ({
      name,
      permissions,
    }));
  });
  app.get("/api/v1/admin/audit", async (req) => {
    permit(req, "audit");
    return db
      .prepare(
        "SELECT * FROM audit" +
          (req.user.role === "Super Admin" ? "" : " WHERE tenant=?") +
          " ORDER BY created DESC LIMIT 500",
      )
      .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]));
  });
  app.get("/api/v1/admin/resources/:kind", async (req) => {
    const kind = req.params.kind;
    permit(req, areas[kind] || "denied");
    return rows(req, kind);
  });
  app.post("/api/v1/admin/resources/:kind", async (req) => {
    const kind = req.params.kind,
      u = permit(req, areas[kind] || "denied");
    if (
      [
        "jobs",
        "transactions",
        "certificates",
        "privacy",
        "backups",
        "integrations",
        "flags",
        "submissions",
      ].includes(kind)
    )
      fail(405, "This resource is created through its workflow.");
    const allowed = fields[kind];
    if (!allowed) fail(404, "Not found.");
    const raw = z.record(z.string(), z.unknown()).parse(req.body);
    if (Object.keys(raw).some((k) => !allowed.includes(k)))
      fail(400, "Unknown fields are not allowed.");
    const name = raw.name || raw.title || raw.prompt;
    if (typeof name !== "string" || name.trim().length < 3)
      fail(400, "A name or title of at least 3 characters is required.");
    if (kind === "questions")
      z.object({
        type: z.enum(["single", "multiple", "boolean", "text"]),
        prompt: z.string().min(5),
        options: z.array(z.string()),
        answer: z.union([z.string(), z.number(), z.array(z.number())]),
        explanation: z.string().min(5),
      })
        .passthrough()
        .parse(raw);
    if (kind === "sessions" && raw.url && !/^https:\/\//.test(String(raw.url)))
      fail(400, "Live session links must use HTTPS.");
    const row = put(
      kind,
      {
        ...raw,
        id: randomUUID(),
        status: raw.status || "Draft",
        created: now(),
        author: u.name,
      },
      u.tenant,
    );
    audit(u, kind + " created", row.id);
    return row;
  });
  app.patch("/api/v1/admin/resources/:kind/:id", async (req) => {
    const kind = req.params.kind,
      u = permit(req, areas[kind] || "denied"),
      row = scoped(req, kind, req.params.id);
    const allowed = fields[kind];
    if (!allowed) fail(405, "Use the dedicated workflow.");
    const raw = z.record(z.string(), z.unknown()).parse(req.body);
    if (Object.keys(raw).some((k) => !allowed.includes(k)))
      fail(400, "Unknown fields are not allowed.");
    if (kind === "submissions" && raw.grade !== undefined)
      z.number().min(0).max(100).parse(raw.grade);
    if (kind === "certificates" && raw.status !== "Revoked")
      fail(400, "Only revocation is supported here.");
    if (kind === "integrations") raw.status = "Not configured";
    if (kind === "flags" && typeof raw.enabled !== "boolean")
      fail(400, "An enabled value is required.");
    if (kind === "flags") raw.status = raw.enabled ? "Enabled" : "Disabled";
    if (
      kind === "notifications" &&
      raw.status === "Published" &&
      row.channel !== "In-app"
    )
      fail(
        409,
        "Configure a delivery provider before sending external notifications.",
      );
    const result = put(kind, { ...row, ...raw }, u.tenant);
    audit(u, kind + " updated", row.id, raw.reason || "");
    return result;
  });
  app.post("/api/v1/admin/jobs/:id/retry", async (req) => {
    const u = permit(req, "operations"),
      j = scoped(req, "jobs", req.params.id);
    if (j.status !== "Failed" || !j.idempotent)
      fail(409, "This job cannot be retried safely.");
    if (j.type === "Media processing")
      fail(
        409,
        "Connect a media-processing provider before retrying this job.",
        "PROVIDER_REQUIRED",
      );
    const r = put(
      "jobs",
      { ...j, status: "Queued", attempts: j.attempts + 1 },
      u.tenant,
    );
    audit(u, "Job retry queued", j.id);
    return r;
  });
  app.get("/api/v1/admin/settings", async (req) => {
    permit(req, "settings");
    return get("settings", "platform");
  });
  app.patch("/api/v1/admin/settings", async (req) => {
    const u = permit(req, "settings"),
      b = z
        .object({
          name: z.string().min(2).optional(),
          tagline: z.string().max(200).optional(),
          locale: z.string().optional(),
          timezone: z.string().optional(),
          maintenance: z.boolean().optional(),
          weeklyGoal: z.number().min(15).max(1200).optional(),
          retentionDays: z.number().min(30).max(3650).optional(),
          aiBudget: z.number().min(0).max(100000).optional(),
        })
        .strict()
        .parse(req.body);
    audit(u, "Platform settings updated", "platform");
    return put("settings", { ...get("settings", "platform"), ...b });
  });
  app.post("/api/v1/admin/export/:kind", async (req) => {
    const kind = req.params.kind;
    let data;
    if (kind === "users") {
      permit(req, "users");
      data = db
        .prepare(
          "SELECT * FROM users" +
            (req.user.role === "Super Admin" ? "" : " WHERE tenant=?"),
        )
        .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]))
        .map(safeUser);
    } else if (kind === "audit") {
      permit(req, "audit");
      data = db
        .prepare(
          "SELECT * FROM audit" +
            (req.user.role === "Super Admin" ? "" : " WHERE tenant=?") +
            " ORDER BY created DESC LIMIT 10000",
        )
        .all(...(req.user.role === "Super Admin" ? [] : [req.user.tenant]));
    } else {
      permit(req, kind === "courses" ? "courses" : areas[kind] || "denied");
      data = rows(req, kind);
    }
    audit(req.user, "Data exported", kind);
    return { data, exported: now() };
  });
  await registerCoaching({
    app,
    store,
    auth,
    permit,
    scoped,
    rows,
    courseFor,
    permissionsFor,
  });
  registerAcademy({ app, store, auth, permit });
  app.addHook("onClose", async () => db.close());
  return app;
}

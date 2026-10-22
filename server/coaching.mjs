import {
  randomUUID,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { z } from "zod";
import { safeUser, verifyPassword, hashPassword } from "./db.mjs";
const now = () => new Date().toISOString();
const error = (status, message, code = "COACHING_REQUEST_FAILED") => {
  throw Object.assign(new Error(message), { statusCode: status, code });
};
export const ownerAreas = [
  "analytics",
  "users",
  "courses",
  "sessions",
  "discussions",
  "certificates",
  "assessments",
  "media",
  "billing",
  "permissions",
  "notifications",
  "tickets",
  "audit",
  "settings",
  "privacy",
  "operations",
];
export function userPermissions(store, u, defaults) {
  if (u.role === "Super Admin") return ["*"];
  const role = store.db
    .prepare(
      "SELECT r.permissions FROM coaching_role_assignments a JOIN coaching_roles r ON r.id=a.role_id WHERE a.user_id=? AND r.tenant=?",
    )
    .get(u.id, u.tenant);
  return role ? JSON.parse(role.permissions) : defaults[u.role] || [];
}
export function activeSubscriptions(store, userId) {
  const at = now();
  return store.db
    .prepare(
      "SELECT * FROM subscriptions WHERE user_id=? AND status='Active' AND starts<=? AND expires>?",
    )
    .all(userId, at, at);
}
export function assertCoachingAccess(store, u, c) {
  if (!c.coaching) return;
  if (u.status !== "Active")
    error(
      403,
      "Your institute owner needs to activate your account before you can learn.",
      "ACTIVATION_REQUIRED",
    );
  if (
    !activeSubscriptions(store, u.id).some((s) =>
      JSON.parse(s.course_ids).includes(c.id),
    )
  )
    error(
      403,
      "An approved, active package is required for this course. Check My subscription or contact your institute centre.",
      "SUBSCRIPTION_REQUIRED",
    );
}
const pkgView = (p) => ({
  ...p,
  courseIds: JSON.parse(p.course_ids),
  price: p.price_paise / 100,
  currency: "INR",
  validityDays: p.validity_days,
});
const subView = (s) => ({
  ...s,
  courseIds: JSON.parse(s.course_ids),
  paidAmount: s.paid_paise / 100,
  status:
    s.status !== "Active"
      ? s.status
      : s.expires <= now()
        ? "Expired"
        : s.starts > now()
          ? "Scheduled"
          : "Active",
});
export async function registerCoaching({
  app,
  store,
  auth,
  permit,
  scoped,
  rows,
  courseFor,
  permissionsFor,
}) {
  const { db, get, list, put, audit } = store;
  const grantSecret = randomBytes(32);
  const assetRoot =
    store.path === ":memory:"
      ? join(
          fileURLToPath(new URL("../.data/", import.meta.url)),
          "test-uploads",
        )
      : join(dirname(store.path), "uploads");
  await app.register(multipart, {
    limits: {
      files: 1,
      fields: 6,
      fileSize: 300 * 1024 * 1024,
      fieldSize: 4096,
    },
  });
  const can = (u, area) =>
    u.role === "Super Admin" || permissionsFor(u).includes(area);
  const learner = (req) => {
    const u = auth(req);
    if (u.role !== "Learner")
      error(403, "Use a learner account for this action.");
    return u;
  };
  const own = (req, id) => {
    const u = auth(req),
      target = db
        .prepare("SELECT * FROM users WHERE id=? AND tenant=?")
        .get(id, u.tenant);
    if (!target) error(404, "Learner not found.");
    return target;
  };
  const requestRow = (u, id) => {
    const r = db
      .prepare("SELECT * FROM subscription_requests WHERE id=? AND tenant=?")
      .get(id, u.tenant);
    if (!r) error(404, "Subscription request not found.");
    return r;
  };
  const ownRequests = (u) =>
    db
      .prepare(
        "SELECT * FROM subscription_requests WHERE user_id=? ORDER BY created DESC",
      )
      .all(u.id)
      .map((r) => ({ ...r, package: JSON.parse(r.package_snapshot) }));
  const mySubs = (u) =>
    db
      .prepare(
        "SELECT * FROM subscriptions WHERE user_id=? ORDER BY expires DESC",
      )
      .all(u.id)
      .map(subView);
  const courseRows = (u) =>
    list("courses", u.tenant).filter(
      (c) => c.coaching && c.status === "Published",
    );
  const settings = () => get("settings", "coaching");
  app.get("/api/v1/coaching/config", async (req) => {
    auth(req);
    return settings();
  });
  app.get("/api/v1/coaching/catalog", async (req) => {
    const u = auth(req),
      subs = activeSubscriptions(store, u.id),
      progress = db.prepare("SELECT * FROM progress WHERE user_id=?").all(u.id);
    return courseRows(u)
      .sort(
        (a, b) =>
          Number(!!b.academy) - Number(!!a.academy) ||
          a.title.localeCompare(b.title),
      )
      .map((c) => {
        const enrollment = db
          .prepare(
            "SELECT * FROM enrolments WHERE user_id=? AND course_id=? AND state='Active'",
          )
          .get(u.id, c.id);
        const ls = enrollment
          ? get("versions", c.id + "-v" + enrollment.version)?.lessons || []
          : list("lessons", u.tenant).filter((l) => l.courseId === c.id);
        const completed = ls.filter((l) =>
          progress.some((p) => p.lesson_id === l.id && p.completed),
        ).length;
        const hasPackage = subs.some((s) =>
          JSON.parse(s.course_ids).includes(c.id),
        );
        return {
          ...c,
          joined: !!enrollment,
          hasPackage,
          accessible: hasPackage && u.status === "Active",
          completed,
          total: ls.length,
          progress: Math.round((completed / (ls.length || 1)) * 100),
          expires:
            subs
              .filter((s) => JSON.parse(s.course_ids).includes(c.id))
              .map((s) => s.expires)
              .sort()
              .at(-1) || null,
        };
      });
  });
  app.get("/api/v1/coaching/me", async (req) => {
    const u = auth(req);
    return {
      user: safeUser(u),
      subscriptions: mySubs(u),
      requests: ownRequests(u),
      activation: u.status,
      settings: settings(),
    };
  });
  app.get("/api/v1/coaching/packages", async (req) => {
    const u = auth(req);
    return db
      .prepare(
        "SELECT * FROM coaching_packages WHERE tenant=? AND status='Active' ORDER BY price_paise",
      )
      .all(u.tenant)
      .map(pkgView);
  });
  app.post("/api/v1/coaching/requests", async (req) => {
    const u = learner(req),
      b = z
        .object({
          packageId: z.string(),
          paymentMethod: z
            .enum(["Cash", "UPI", "Bank transfer"])
            .default("Cash"),
        })
        .strict()
        .parse(req.body);
    const p = db
      .prepare(
        "SELECT * FROM coaching_packages WHERE id=? AND tenant=? AND status='Active'",
      )
      .get(b.packageId, u.tenant);
    if (!p) error(404, "This package is not available.");
    const existing = db
      .prepare(
        "SELECT * FROM subscription_requests WHERE user_id=? AND package_id=? AND status IN ('Pending payment','Pending approval')",
      )
      .get(u.id, p.id);
    if (existing)
      return { ...existing, package: JSON.parse(existing.package_snapshot) };
    const id = randomUUID(),
      status = p.price_paise === 0 ? "Pending approval" : "Pending payment";
    db.prepare(
      "INSERT INTO subscription_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      u.tenant,
      u.id,
      p.id,
      JSON.stringify(p),
      status,
      b.paymentMethod,
      "",
      null,
      now(),
      null,
      null,
      "",
    );
    audit(u, "Package requested", id, p.name);
    return { ...requestRow(u, id), package: p };
  });
  app.post("/api/v1/coaching/requests/:id/payment", async (req) => {
    const u = learner(req),
      r = requestRow(u, req.params.id);
    if (r.user_id !== u.id) error(404, "Request not found.");
    if (!["Pending payment", "Pending approval"].includes(r.status))
      error(409, "This request has already been reviewed.");
    const b = z
      .object({
        reference: z.string().min(6).max(120),
        receiptId: z.string().optional(),
      })
      .strict()
      .parse(req.body);
    if (b.receiptId) {
      const asset = get("coaching_assets", b.receiptId);
      if (!asset || asset.userId !== u.id)
        error(403, "Upload your own payment receipt.");
    }
    db.prepare(
      "UPDATE subscription_requests SET status='Pending approval',payment_reference=?,receipt_id=? WHERE id=?",
    ).run(b.reference, b.receiptId || null, r.id);
    audit(u, "Payment reference submitted", r.id);
    return { ...requestRow(u, r.id), package: JSON.parse(r.package_snapshot) };
  });
  app.get("/api/v1/owner/overview", async (req) => {
    const u = permit(req, "analytics"),
      users = db
        .prepare("SELECT * FROM users WHERE tenant=? AND role='Learner'")
        .all(u.tenant),
      at = now(),
      week = new Date(Date.now() + 7 * 86400000).toISOString();
    const subscriptions = db
        .prepare("SELECT * FROM subscriptions WHERE tenant=?")
        .all(u.tenant),
      valid = subscriptions.filter(
        (s) => s.status === "Active" && s.starts <= at && s.expires > at,
      ),
      activePaid = new Set(
        valid
          .filter(
            (s) =>
              s.paid_paise > 0 &&
              users.some((x) => x.id === s.user_id && x.status === "Active"),
          )
          .map((s) => s.user_id),
      );
    const requests = db
      .prepare(
        "SELECT r.*,u.name,u.email,u.status AS accountStatus FROM subscription_requests r JOIN users u ON u.id=r.user_id WHERE r.tenant=? ORDER BY r.created DESC",
      )
      .all(u.tenant);
    const upcoming = users
      .map((user) => {
        const coverage = subscriptions
          .filter(
            (s) =>
              s.user_id === user.id && s.status === "Active" && s.expires > at,
          )
          .sort((a, b) => b.expires.localeCompare(a.expires));
        return coverage.length
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              expires: coverage[0].expires,
              package: coverage[0].package_name,
              daysLeft: Math.ceil(
                (new Date(coverage[0].expires) - Date.now()) / 86400000,
              ),
            }
          : null;
      })
      .filter((x) => x && x.expires <= week)
      .sort((a, b) => a.expires.localeCompare(b.expires));
    const counts = {
      learners: users.length,
      activeUsers: users.filter((x) => x.status === "Active").length,
      onlineUsers: users.filter(
        (x) =>
          x.last_seen &&
          new Date(x.last_seen).getTime() > Date.now() - 5 * 60000 &&
          x.status === "Active",
      ).length,
      activePaidUsers: activePaid.size,
      pendingActivation: users.filter((x) => x.status === "Pending activation")
        .length,
      pendingPayment: requests.filter((r) => r.status === "Pending payment")
        .length,
      pendingApproval: requests.filter((r) => r.status === "Pending approval")
        .length,
      renewals: upcoming.length,
      publishedCourses: courseRows(u).length,
      revenue:
        subscriptions
          .filter((s) => s.status !== "Cancelled")
          .reduce((n, s) => n + s.paid_paise, 0) / 100,
    };
    const activity = db
      .prepare(
        "SELECT * FROM audit WHERE tenant=? ORDER BY created DESC LIMIT 6",
      )
      .all(u.tenant);
    return {
      counts,
      upcoming,
      requests: requests
        .filter((r) => r.status.startsWith("Pending"))
        .slice(0, 5)
        .map((r) => ({ ...r, package: JSON.parse(r.package_snapshot) })),
      activity,
      settings: settings(),
      definitions: {
        onlineUsers:
          "Active accounts with an authenticated request in the last 5 minutes.",
        activePaidUsers:
          "Activated learners with a paid, approved subscription currently within its access dates.",
        revenue:
          "Recorded owner-verified subscription payments in INR. This is not a payment-provider balance.",
      },
    };
  });
  app.get("/api/v1/owner/learners", async (req) => {
    const u = permit(req, "users");
    return db
      .prepare(
        "SELECT * FROM users WHERE tenant=? AND role='Learner' ORDER BY name",
      )
      .all(u.tenant)
      .map((user) => {
        const subs = mySubs(user),
          valid = subs.filter((s) => s.status === "Active");
        const pending = ownRequests(user).find((r) =>
          r.status.startsWith("Pending"),
        );
        return {
          ...safeUser(user),
          subscription:
            valid[0]?.package_name || pending?.status || "No active package",
          subscriptionStatus: valid.length
            ? "Active"
            : pending?.status || "Not subscribed",
          expires: valid[0]?.expires || null,
          paid: valid.some((s) => s.paid_paise > 0),
          online:
            user.status === "Active" &&
            !!user.last_seen &&
            new Date(user.last_seen).getTime() > Date.now() - 5 * 60000,
        };
      });
  });
  app.get("/api/v1/owner/learners/:id", async (req) => {
    permit(req, "users");
    const user = own(req, req.params.id);
    return {
      user: safeUser(user),
      subscriptions: mySubs(user),
      requests: ownRequests(user),
      progress: db
        .prepare("SELECT * FROM progress WHERE user_id=?")
        .all(user.id),
      attempts: db
        .prepare(
          "SELECT id,course_id,status,score,submitted FROM attempts WHERE user_id=?",
        )
        .all(user.id),
    };
  });
  app.patch("/api/v1/owner/learners/:id/status", async (req) => {
    const u = permit(req, "users"),
      target = own(req, req.params.id);
    if (target.role !== "Learner")
      error(403, "Use Team & permissions for staff access.");
    const b = z
      .object({
        status: z.enum(["Active", "Inactive", "Blocked", "Pending activation"]),
        reason: z.string().min(3).max(1000),
      })
      .strict()
      .parse(req.body);
    db.prepare("UPDATE users SET status=? WHERE id=?").run(b.status, target.id);
    if (b.status !== "Active")
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
    audit(u, "Learner " + b.status.toLowerCase(), target.id, b.reason);
    return safeUser(
      db.prepare("SELECT * FROM users WHERE id=?").get(target.id),
    );
  });
  app.get("/api/v1/owner/requests", async (req) => {
    const u = permit(req, "billing");
    return db
      .prepare(
        "SELECT r.*,u.name,u.email,u.phone,u.status AS accountStatus FROM subscription_requests r JOIN users u ON u.id=r.user_id WHERE r.tenant=? ORDER BY r.created DESC",
      )
      .all(u.tenant)
      .map((r) => ({ ...r, package: JSON.parse(r.package_snapshot) }));
  });
  app.post("/api/v1/owner/requests/:id/approve", async (req) => {
    const u = permit(req, "billing"),
      r = requestRow(u, req.params.id),
      b = z
        .object({
          paymentConfirmed: z.literal(true),
          activateLearner: z.boolean(),
          reason: z.string().min(3).max(1000),
        })
        .strict()
        .parse(req.body);
    const existing = db
      .prepare("SELECT * FROM subscriptions WHERE request_id=?")
      .get(r.id);
    if (existing) return subView(existing);
    if (!["Pending payment", "Pending approval"].includes(r.status))
      error(409, "This request is not awaiting approval.");
    const target = db
      .prepare("SELECT * FROM users WHERE id=? AND tenant=?")
      .get(r.user_id, u.tenant);
    if (
      !target ||
      ["Blocked", "Deactivated", "Suspended"].includes(target.status)
    )
      error(
        409,
        "Review and restore this learner’s account before approving a subscription.",
      );
    if (b.activateLearner && !can(u, "users"))
      error(
        403,
        "Learner-management permission is required to activate an account.",
      );
    const p = JSON.parse(r.package_snapshot),
      latest = db
        .prepare(
          "SELECT expires FROM subscriptions WHERE user_id=? AND package_id=? AND status='Active' AND expires>? ORDER BY expires DESC LIMIT 1",
        )
        .get(target.id, p.id, now());
    const starts = latest?.expires || now(),
      expires = new Date(
        new Date(starts).getTime() + p.validity_days * 86400000,
      ).toISOString(),
      id = randomUUID();
    const courseIds = JSON.parse(p.course_ids);
    for (const cid of courseIds) {
      const c = get("courses", cid);
      if (!c || c.status !== "Published")
        error(
          409,
          "A package course is no longer published. Review the package before approval.",
        );
      const row = db
        .prepare("SELECT tenant FROM records WHERE kind=? AND id=?")
        .get("courses", cid);
      if (row.tenant !== u.tenant)
        error(
          403,
          "Package and course must belong to the same institute centre.",
        );
    }
    db.exec("BEGIN");
    try {
      db.prepare(
        "INSERT INTO subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        u.tenant,
        target.id,
        p.id,
        r.id,
        p.name,
        p.course_ids,
        p.price_paise,
        starts,
        expires,
        "Active",
        now(),
      );
      for (const cid of courseIds) {
        const c = get("courses", cid);
        db.prepare(
          "INSERT INTO enrolments VALUES(?,?,?,?,?) ON CONFLICT(user_id,course_id) DO UPDATE SET state='Active'",
        ).run(target.id, cid, c.version, "Active", now());
      }
      if (b.activateLearner)
        db.prepare("UPDATE users SET status='Active' WHERE id=?").run(
          target.id,
        );
      db.prepare(
        "UPDATE subscription_requests SET status='Approved',reviewed=?,reviewer=?,reason=? WHERE id=?",
      ).run(now(), u.name, b.reason, r.id);
      audit(u, "Subscription approved", r.id, b.reason);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return subView(
      db.prepare("SELECT * FROM subscriptions WHERE id=?").get(id),
    );
  });
  app.post("/api/v1/owner/requests/:id/reject", async (req) => {
    const u = permit(req, "billing"),
      r = requestRow(u, req.params.id),
      b = z
        .object({ reason: z.string().min(3).max(1000) })
        .strict()
        .parse(req.body);
    if (!r.status.startsWith("Pending"))
      error(409, "This request has already been reviewed.");
    db.prepare(
      "UPDATE subscription_requests SET status='Rejected',reviewed=?,reviewer=?,reason=? WHERE id=?",
    ).run(now(), u.name, b.reason, r.id);
    audit(u, "Subscription rejected", r.id, b.reason);
    return { ok: true };
  });
  app.get("/api/v1/owner/subscriptions", async (req) => {
    const u = permit(req, "billing");
    return db
      .prepare(
        "SELECT s.*,u.name,u.email FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.tenant=? ORDER BY s.expires",
      )
      .all(u.tenant)
      .map(subView);
  });
  app.patch("/api/v1/owner/subscriptions/:id", async (req) => {
    const u = permit(req, "billing"),
      b = z
        .object({
          status: z.enum(["Active", "Cancelled"]),
          reason: z.string().min(3),
        })
        .strict()
        .parse(req.body);
    const sub = db
      .prepare("SELECT * FROM subscriptions WHERE id=? AND tenant=?")
      .get(req.params.id, u.tenant);
    if (!sub) error(404, "Subscription not found.");
    db.prepare("UPDATE subscriptions SET status=? WHERE id=?").run(
      b.status,
      sub.id,
    );
    audit(u, "Subscription " + b.status.toLowerCase(), sub.id, b.reason);
    return subView({ ...sub, status: b.status });
  });
  app.get("/api/v1/owner/packages", async (req) => {
    const u = permit(req, "billing");
    return db
      .prepare(
        "SELECT * FROM coaching_packages WHERE tenant=? ORDER BY created",
      )
      .all(u.tenant)
      .map(pkgView);
  });
  const packageSchema = z
    .object({
      name: z.string().min(3).max(100),
      price: z.number().min(0).max(1000000),
      validityDays: z.number().int().min(1).max(1095),
      description: z.string().min(10).max(2000),
      courseIds: z.array(z.string()).min(1).max(100),
      status: z.enum(["Active", "Archived"]),
    })
    .strict();
  const savePackage = (u, b, id) => {
    for (const cid of b.courseIds) {
      const c = scoped({ user: u }, "courses", cid);
      if (c.status !== "Published" || !c.coaching)
        error(400, "Choose published institute courses for the package.");
    }
    db.prepare(
      "INSERT INTO coaching_packages VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,price_paise=excluded.price_paise,validity_days=excluded.validity_days,description=excluded.description,course_ids=excluded.course_ids,status=excluded.status",
    ).run(
      id,
      u.tenant,
      b.name,
      Math.round(b.price * 100),
      b.validityDays,
      b.description,
      JSON.stringify([...new Set(b.courseIds)]),
      b.status,
      now(),
    );
    audit(u, "Package saved", id);
    return pkgView(
      db.prepare("SELECT * FROM coaching_packages WHERE id=?").get(id),
    );
  };
  app.post("/api/v1/owner/packages", async (req) =>
    savePackage(
      permit(req, "billing"),
      packageSchema.parse(req.body),
      randomUUID(),
    ),
  );
  app.patch("/api/v1/owner/packages/:id", async (req) => {
    const u = permit(req, "billing");
    if (
      !db
        .prepare("SELECT id FROM coaching_packages WHERE id=? AND tenant=?")
        .get(req.params.id, u.tenant)
    )
      error(404, "Package not found.");
    return savePackage(u, packageSchema.parse(req.body), req.params.id);
  });
  app.get("/api/v1/owner/analytics", async (req) => {
    const u = permit(req, "analytics"),
      b = z
        .object({ days: z.coerce.number().int().min(7).max(365).default(30) })
        .parse(req.query),
      cutoff = new Date(Date.now() - b.days * 86400000).toISOString();
    const subs = db
        .prepare("SELECT * FROM subscriptions WHERE tenant=? AND created>=?")
        .all(u.tenant, cutoff),
      requests = db
        .prepare(
          "SELECT * FROM subscription_requests WHERE tenant=? AND created>=?",
        )
        .all(u.tenant, cutoff);
    const daily = Array.from({ length: b.days }, (_, i) => {
      const date = new Date(Date.now() - (b.days - 1 - i) * 86400000)
          .toISOString()
          .slice(0, 10),
        r = subs.filter(
          (s) => s.created.startsWith(date) && s.status !== "Cancelled",
        );
      return {
        date,
        label: new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        revenue: r.reduce((n, s) => n + s.paid_paise / 100, 0),
        admissions: r.length,
      };
    });
    const courses = list("courses", u.tenant)
      .filter((c) => c.coaching && !c.legacyDemo)
      .map((c) => {
        const enrolled = db
          .prepare(
            "SELECT count(*) n FROM enrolments e JOIN users u ON u.id=e.user_id WHERE u.tenant=? AND e.course_id=? AND e.state='Active'",
          )
          .get(u.tenant, c.id).n;
        const ls = list("lessons", u.tenant).filter((l) => l.courseId === c.id);
        const completed = db
          .prepare(
            "SELECT count(*) n FROM progress p JOIN users u ON u.id=p.user_id WHERE u.tenant=? AND p.completed=1 AND p.lesson_id IN (SELECT id FROM records WHERE kind=?)",
          )
          .get(u.tenant, "lessons").n;
        const count = ls.reduce(
          (n, l) =>
            n +
            db
              .prepare(
                "SELECT count(*) n FROM progress p JOIN users u ON u.id=p.user_id WHERE u.tenant=? AND p.lesson_id=? AND p.completed=1",
              )
              .get(u.tenant, l.id).n,
          0,
        );
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          learners: enrolled,
          lessons: ls.length,
          completedLessons: count,
          completion:
            enrolled && ls.length
              ? Math.round((count / (enrolled * ls.length)) * 100)
              : 0,
        };
      });
    return {
      days: b.days,
      daily,
      courses,
      revenue: subs
        .filter((s) => s.status !== "Cancelled")
        .reduce((n, s) => n + s.paid_paise / 100, 0),
      approvals: subs.length,
      requests: requests.length,
      conversion: requests.length
        ? Math.round(
            (subs.filter(
              (s) =>
                s.request_id && requests.some((r) => r.id === s.request_id),
            ).length /
              requests.length) *
              100,
          )
        : 0,
      currency: "INR",
      definition:
        "Revenue is owner-verified recorded payments in this date range. Course completion is acknowledged lessons, not exam readiness.",
    };
  });
  app.get("/api/v1/owner/roles", async (req) => {
    const u = permit(req, "permissions");
    return {
      areas: ownerAreas,
      roles: db
        .prepare("SELECT * FROM coaching_roles WHERE tenant=? ORDER BY name")
        .all(u.tenant)
        .map((r) => ({ ...r, permissions: JSON.parse(r.permissions) })),
      staff: db
        .prepare(
          "SELECT u.id,u.name,u.email,u.role,u.status,a.role_id FROM users u LEFT JOIN coaching_role_assignments a ON a.user_id=u.id WHERE u.tenant=? AND u.role<>'Learner'",
        )
        .all(u.tenant),
    };
  });
  app.post("/api/v1/owner/staff", async (req) => {
    const u = permit(req, "permissions");
    const b = z
      .object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        role: z.enum(["Instructor", "Support", "Finance", "Tenant Admin"]),
        initialPassword: z.string().min(12).max(128),
        password: z.string(),
        reason: z.string().min(3).max(1000),
      })
      .strict()
      .parse(req.body);
    if (u.role !== "Super Admin" || !verifyPassword(b.password, u.password))
      error(
        403,
        "The institute owner must confirm their password to create staff access.",
      );
    if (
      db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(b.email.toLowerCase())
    )
      error(409, "This email is already in use.");
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users(id,tenant,email,name,role,status,password) VALUES(?,?,?,?,?,?,?)",
    ).run(
      id,
      u.tenant,
      b.email.toLowerCase(),
      b.name,
      b.role,
      "Active",
      hashPassword(b.initialPassword),
    );
    audit(u, "Staff account created", id, b.reason);
    return safeUser(db.prepare("SELECT * FROM users WHERE id=?").get(id));
  });

  const roleSchema = z
    .object({
      name: z.string().min(3).max(80),
      permissions: z.array(z.enum(ownerAreas)).max(ownerAreas.length),
    })
    .strict();
  app.post("/api/v1/owner/roles", async (req) => {
    const u = permit(req, "permissions"),
      b = roleSchema.parse(req.body),
      id = randomUUID();
    db.prepare("INSERT INTO coaching_roles VALUES(?,?,?,?,?)").run(
      id,
      u.tenant,
      b.name,
      JSON.stringify([...new Set(b.permissions)]),
      now(),
    );
    audit(u, "Custom role created", id);
    return { id, ...b };
  });
  app.patch("/api/v1/owner/roles/:id", async (req) => {
    const u = permit(req, "permissions"),
      b = roleSchema.parse(req.body);
    if (
      !db
        .prepare("SELECT id FROM coaching_roles WHERE id=? AND tenant=?")
        .get(req.params.id, u.tenant)
    )
      error(404, "Role not found.");
    db.prepare("UPDATE coaching_roles SET name=?,permissions=? WHERE id=?").run(
      b.name,
      JSON.stringify([...new Set(b.permissions)]),
      req.params.id,
    );
    db.prepare(
      "DELETE FROM sessions WHERE user_id IN (SELECT user_id FROM coaching_role_assignments WHERE role_id=?)",
    ).run(req.params.id);
    audit(u, "Role permissions updated", req.params.id);
    return { id: req.params.id, ...b };
  });
  app.post("/api/v1/owner/staff/:id/role", async (req) => {
    const u = permit(req, "permissions"),
      target = own(req, req.params.id),
      b = z
        .object({
          roleId: z.string().nullable(),
          password: z.string(),
          reason: z.string().min(3),
        })
        .strict()
        .parse(req.body);
    if (u.role !== "Super Admin" || !verifyPassword(b.password, u.password))
      error(
        403,
        "The institute owner must confirm their password to change staff access.",
      );
    if (target.role === "Super Admin" || target.role === "Learner")
      error(409, "Owner and learner roles cannot be changed here.");
    if (b.roleId) {
      if (
        !db
          .prepare("SELECT id FROM coaching_roles WHERE id=? AND tenant=?")
          .get(b.roleId, u.tenant)
      )
        error(404, "Role not found.");
      db.prepare(
        "INSERT INTO coaching_role_assignments VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET role_id=excluded.role_id",
      ).run(target.id, b.roleId);
    } else
      db.prepare("DELETE FROM coaching_role_assignments WHERE user_id=?").run(
        target.id,
      );
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
    audit(u, "Staff access changed", target.id, b.reason);
    return { ok: true };
  });
  app.get("/api/v1/owner/settings", async (req) => {
    permit(req, "settings");
    return settings();
  });
  app.patch("/api/v1/owner/settings", async (req) => {
    const u = permit(req, "settings"),
      b = z
        .object({
          name: z.string().min(3).max(100),
          tagline: z.string().max(200),
          city: z.string().max(100),
          supportPhone: z.string().max(30),
          upiId: z
            .string()
            .max(100)
            .refine(
              (v) => !v || /^[\w.\-]+@[\w.\-]+$/.test(v),
              "Enter a valid UPI ID.",
            ),
          paymentInstructions: z.string().min(10).max(2000),
        })
        .strict()
        .parse(req.body);
    audit(u, "Institute settings updated", "coaching");
    return put("settings", { ...settings(), ...b });
  });
  app.post("/api/v1/owner/courses/:id/upgrade-enrolments", async (req) => {
    const u = permit(req, "courses"),
      c = scoped(req, "courses", req.params.id);
    if (!["Super Admin", "Tenant Admin"].includes(u.role))
      error(403, "The institute owner must approve course-version changes.");
    const b = z
      .object({ confirm: z.literal(true), reason: z.string().min(3).max(1000) })
      .strict()
      .parse(req.body);
    if (!c.coaching || c.status !== "Published")
      error(409, "Publish the latest institute course version first.");
    const result = db
      .prepare(
        "UPDATE enrolments SET version=? WHERE course_id=? AND version<? AND user_id IN (SELECT id FROM users WHERE tenant=?)",
      )
      .run(c.version, c.id, c.version, u.tenant);
    audit(
      u,
      "Learners upgraded to course version " + c.version,
      c.id,
      b.reason,
    );
    return { updated: result.changes, version: c.version };
  });

  // Private assets use a short-lived grant. Every range request rechecks account and subscription access.
  const assetFor = (u, id) => {
    const row = db
      .prepare("SELECT tenant,body FROM records WHERE kind=? AND id=?")
      .get("coaching_assets", id);
    if (!row || row.tenant !== u.tenant) error(404, "Resource not found.");
    const a = JSON.parse(row.body);
    if (courseRows(u).some((c) => c.thumbnailAssetId === id)) return a;
    if (
      a.userId === u.id ||
      can(u, "media") ||
      can(u, "courses") ||
      (can(u, "billing") && a.purpose === "receipt")
    )
      return a;
    const versions = list("versions", u.tenant).filter(
      (v) =>
        v.lessons?.some((l) => l.assetIds?.includes(id)) &&
        get("courses", v.courseId)?.coaching,
    );
    for (const published of versions) {
      try {
        const c = courseFor(u, published.courseId);
        assertCoachingAccess(store, u, c);
        const e = db
          .prepare(
            "SELECT version FROM enrolments WHERE user_id=? AND course_id=? AND state='Active'",
          )
          .get(u.id, c.id);
        const version = e && get("versions", c.id + "-v" + e.version);
        if (version?.lessons?.some((l) => l.assetIds?.includes(id))) return a;
      } catch (e) {
        if (![403, 404].includes(e.statusCode)) throw e;
      }
    }
    error(
      403,
      "This resource requires an activated account and an approved package for a course containing it.",
    );
  };
  const safeAsset = ({ diskPath, ...a }) => a;
  app.get("/api/v1/owner/assets", async (req) => {
    const u = permit(req, "media");
    return list("coaching_assets", u.tenant)
      .filter((a) => a.purpose !== "receipt")
      .map((a) => ({
        ...safeAsset(a),
        size: existsSync(a.diskPath) ? statSync(a.diskPath).size : 0,
      }));
  });
  const upload = async (req, purpose = "course") => {
    const u = purpose === "receipt" ? learner(req) : permit(req, "media");
    const part = await req.file();
    if (!part) error(400, "Choose a file to upload.");
    if (purpose === "course" && part.fields.rights?.value !== "true")
      error(
        400,
        "Confirm that you have permission to share this learning resource.",
      );
    const ext = extname(part.filename).toLowerCase();
    const types = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
    };
    const type = types[ext];
    if (
      !type ||
      (purpose === "receipt" &&
        !["image/png", "image/jpeg", "application/pdf"].includes(type))
    )
      error(
        400,
        "Choose an MP4, WebM, image, PDF, Word document or text file.",
      );
    const id = randomUUID();
    mkdirSync(assetRoot, { recursive: true });
    const path = join(assetRoot, id + ext);
    try {
      await pipeline(part.file, createWriteStream(path, { flags: "wx" }));
      if (part.file.truncated)
        error(413, "This video exceeds the 300 MB prototype limit.");
      const size = statSync(path).size;
      if (!size) error(400, "This file is empty.");
      if (!type.startsWith("video/") && size > 25 * 1024 * 1024)
        error(413, "Images and documents must be 25 MB or smaller.");
      const fd = openSync(path, "r"),
        head = Buffer.alloc(16);
      try {
        readSync(fd, head, 0, 16, 0);
      } finally {
        closeSync(fd);
      }
      const valid =
        type === "video/mp4"
          ? head.subarray(4, 8).toString() === "ftyp"
          : type === "video/webm"
            ? head.subarray(0, 4).toString("hex") === "1a45dfa3"
            : type === "image/png"
              ? head.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
              : type === "image/jpeg"
                ? head.subarray(0, 3).toString("hex") === "ffd8ff"
                : type === "application/pdf"
                  ? head.subarray(0, 5).toString() === "%PDF-"
                  : ext === ".doc"
                    ? head.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1"
                    : ext === ".docx"
                      ? head.subarray(0, 2).toString() === "PK"
                      : !head.includes(0);
      if (!valid) error(400, "The file content does not match its extension.");
      let previewText = "";
      if (ext === ".docx")
        previewText = (await mammoth.extractRawText({ path })).value.slice(
          0,
          1000000,
        );
      if (ext === ".doc") {
        const doc = await new WordExtractor().extract(path);
        previewText = doc.getBody().slice(0, 1000000);
      }
      if (ext === ".txt")
        previewText = readFileSync(path, "utf8").slice(0, 1000000);
      const a = put(
        "coaching_assets",
        {
          id,
          title: part.filename.replace(/[\r\n]/g, " ").slice(0, 150),
          filename: part.filename.replace(/[^\w.\- ]/g, "_"),
          type,
          size,
          diskPath: path,
          previewText,
          userId: u.id,
          purpose,
          rights: true,
          status: "Ready",
          created: now(),
        },
        u.tenant,
      );
      audit(u, "Learning resource uploaded", id);
      return safeAsset(a);
    } catch (e) {
      if (existsSync(path)) unlinkSync(path);
      throw e;
    }
  };
  app.post("/api/v1/owner/assets", async (req) => upload(req));
  app.post("/api/v1/coaching/receipt", async (req) => upload(req, "receipt"));
  app.get("/api/v1/assets/:id/access", async (req) => {
    const u = auth(req),
      a = assetFor(u, req.params.id);
    const payload = Buffer.from(
        JSON.stringify({
          id: a.id,
          userId: u.id,
          expires: Date.now() + 5 * 60000,
        }),
      ).toString("base64url"),
      signature = createHmac("sha256", grantSecret)
        .update(payload)
        .digest("base64url");
    return {
      ...safeAsset(a),
      url:
        "/api/v1/assets/" +
        a.id +
        "/content?ticket=" +
        payload +
        "." +
        signature,
      expires: Date.now() + 5 * 60000,
    };
  });
  app.get("/api/v1/assets/:id/content", async (req, reply) => {
    let u = req.user;
    if (req.query.ticket || !u) {
      const ticket = z.string().max(2000).parse(req.query.ticket);
      const [payload, sig] = ticket.split(".");
      if (!payload || !sig) error(403, "Resource access has expired.");
      const expected = createHmac("sha256", grantSecret)
        .update(payload)
        .digest();
      let supplied;
      try {
        supplied = Buffer.from(sig, "base64url");
      } catch {
        error(403, "Invalid resource access.");
      }
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      )
        error(403, "Invalid resource access.");
      let decoded;
      try {
        decoded = JSON.parse(Buffer.from(payload, "base64url"));
      } catch {
        error(403, "Invalid resource access.");
      }
      if (decoded.id !== req.params.id || decoded.expires < Date.now())
        error(403, "Resource access has expired.");
      u = db
        .prepare(
          "SELECT * FROM users WHERE id=? AND status IN ('Active','Pending activation')",
        )
        .get(decoded.userId);
      if (!u) error(403, "This account no longer has access.");
    }
    const a = assetFor(u, req.params.id);
    if (!existsSync(a.diskPath))
      error(
        404,
        "This resource file is unavailable. Ask your faculty to upload it again.",
      );
    const size = statSync(a.diskPath).size;
    reply
      .header("Cache-Control", "private, no-store")
      .header("X-Content-Type-Options", "nosniff")
      .header("Accept-Ranges", "bytes")
      .type(a.type);
    const download =
      req.query.download === "1" ||
      [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].includes(a.type);
    reply.header(
      "Content-Disposition",
      (download ? "attachment" : "inline") +
        '; filename="' +
        a.filename.replace(/[^\w.\-]/g, "_") +
        '"',
    );
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start, end;
      if (!m || (!m[1] && !m[2]))
        return reply
          .code(416)
          .header("Content-Range", "bytes */" + size)
          .send();
      if (!m[1]) {
        start = Math.max(0, size - Number(m[2]));
        end = size - 1;
      } else {
        start = Number(m[1]);
        end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      }
      if (start >= size || start > end || start < 0)
        return reply
          .code(416)
          .header("Content-Range", "bytes */" + size)
          .send();
      return reply
        .code(206)
        .header("Content-Range", `bytes ${start}-${end}/${size}`)
        .header("Content-Length", end - start + 1)
        .send(createReadStream(a.diskPath, { start, end }));
    }
    return reply
      .header("Content-Length", size)
      .send(createReadStream(a.diskPath));
  });
}

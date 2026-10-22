import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./db.mjs";
const stamp = () => new Date().toISOString();
const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};
const digest = (s) => createHash("sha256").update(s).digest("hex");
export const defaultAssessmentPolicy = {
  durationMinutes: 15,
  maxAttempts: 3,
  passMark: 80,
  questionCount: 5,
  retryDelayMinutes: 0,
  reveal: "After submission",
  opensAt: null,
  closesAt: null,
  requirePractical: false,
};
export function assessmentPolicy(store, u, courseId) {
  const e = store.db
    .prepare(
      "SELECT version FROM enrolments WHERE user_id=? AND course_id=? AND state='Active'",
    )
    .get(u.id, courseId);
  const c =
    (e && store.get("versions", courseId + "-v" + e.version)?.course) ||
    store.get("courses", courseId);
  return {
    ...defaultAssessmentPolicy,
    ...c?.assessmentPolicy,
    courseVersion: e?.version || c?.version || 1,
  };
}
export function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell)
        throw new Error("Unexpected quote in CSV cell.");
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export function csvExport(rows) {
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
export function registerControlCenter({ app, store, auth, permit }) {
  const { db, get, list, put, audit } = store;
  if (
    !db
      .prepare("PRAGMA table_info(attempts)")
      .all()
      .some((c) => c.name === "policy_json")
  )
    db.exec(
      "ALTER TABLE attempts ADD COLUMN policy_json TEXT NOT NULL DEFAULT '{}'",
    );
  const owned = (u, kind, id) => {
    const r = list(kind, u.tenant).find((r) => r.id === id);
    if (!r) fail(404, "Record not found in this institute.");
    return r;
  };
  app.get("/api/v1/owner/control-options", async (req) => {
    const u = auth(req);
    if (u.role === "Learner") fail(403, "Staff access is required.");
    return {
      courses: list("courses", u.tenant)
        .filter((c) => c.coaching && !c.legacyDemo)
        .map((c) => ({ id: c.id, title: c.title })),
      batches: list("academy_batches", u.tenant).map((b) => ({
        id: b.id,
        name: b.name,
      })),
    };
  });
  const courses = (u) =>
    list("courses", u.tenant).filter((c) => c.coaching && !c.legacyDemo);
  const pw = (u, password) => {
    if (!verifyPassword(password, u.password))
      fail(403, "Confirm your current owner password.");
  };
  const reasons = z
    .object({ reason: z.string().trim().min(5).max(1000) })
    .strict();
  const makeInvite = (u, userId) => {
    const token = randomBytes(32).toString("hex");
    put(
      "invitations",
      {
        id: digest(token),
        userId,
        expires: Date.now() + 7 * 86400000,
        status: "Pending",
        created: stamp(),
      },
      u.tenant,
    );
    return {
      userId,
      link: "/join#token=" + token,
      expires: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
  };
  app.post(
    "/api/v1/auth/invitations/inspect",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req) => {
      const b = z
          .object({ token: z.string().length(64) })
          .strict()
          .parse(req.body),
        i = get("invitations", digest(b.token));
      if (!i || i.status !== "Pending" || i.expires < Date.now())
        fail(410, "This invitation is expired or already used.");
      const u = db
        .prepare("SELECT name,email,status FROM users WHERE id=?")
        .get(i.userId);
      if (!u || ["Blocked", "Inactive"].includes(u.status))
        fail(410, "This invitation is unavailable.");
      return {
        name: u.name,
        email: u.email,
        expires: new Date(i.expires).toISOString(),
      };
    },
  );
  app.post(
    "/api/v1/auth/invitations/accept",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req) => {
      const b = z
          .object({
            token: z.string().length(64),
            password: z.string().min(12).max(128),
          })
          .strict()
          .parse(req.body),
        i = get("invitations", digest(b.token));
      if (!i || i.status !== "Pending" || i.expires < Date.now())
        fail(410, "This invitation is expired or already used.");
      const u = db.prepare("SELECT * FROM users WHERE id=?").get(i.userId);
      if (!u || ["Blocked", "Inactive"].includes(u.status))
        fail(410, "This invitation is unavailable.");
      db.exec("BEGIN IMMEDIATE");
      try {
        if (get("invitations", i.id)?.status !== "Pending")
          fail(410, "This invitation has already been accepted.");
        db.prepare("UPDATE users SET password=? WHERE id=?").run(
          hashPassword(b.password),
          u.id,
        );
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(u.id);
        put(
          "invitations",
          { ...i, status: "Accepted", accepted: stamp() },
          u.tenant,
        );
        audit(u, "Invitation accepted", u.id);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return {
        message:
          "Your password is ready. Sign in to the learner app. Institute activation and approved course access are still required.",
      };
    },
  );
  const directoryQuery = z.object({
    q: z.string().max(150).default(""),
    status: z.string().max(40).default("All"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(5).max(100).default(20),
  });
  app.get("/api/v1/owner/directory", async (req) => {
    const u = permit(req, "users"),
      b = directoryQuery.parse(req.query),
      where =
        "tenant=? AND role='Learner' AND (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')" +
        (b.status !== "All" ? " AND status=?" : ""),
      term = "%" + b.q.replace(/[\\%_]/g, "\\$&") + "%",
      args = [
        u.tenant,
        term,
        term,
        term,
        ...(b.status !== "All" ? [b.status] : []),
      ];
    const total = db
      .prepare("SELECT count(*) n FROM users WHERE " + where)
      .get(...args).n;
    return {
      total,
      page: b.page,
      pageSize: b.pageSize,
      rows: db
        .prepare(
          "SELECT id,name,email,phone,status,last_seen FROM users WHERE " +
            where +
            " ORDER BY name,id LIMIT ? OFFSET ?",
        )
        .all(...args, b.pageSize, (b.page - 1) * b.pageSize),
    };
  });
  app.post("/api/v1/owner/learners/:id/invite", async (req) => {
    const u = permit(req, "users"),
      b = z
        .object({ password: z.string(), reason: z.string().min(5) })
        .strict()
        .parse(req.body);
    pw(u, b.password);
    const target = db
      .prepare(
        "SELECT id,name,email,status FROM users WHERE id=? AND tenant=? AND role='Learner'",
      )
      .get(req.params.id, u.tenant);
    if (!target) fail(404, "Learner not found.");
    if (target.status !== "Pending activation")
      fail(409, "Invitations are available for pending learner accounts only.");
    for (const i of list("invitations", u.tenant).filter(
      (i) => i.userId === target.id && i.status === "Pending",
    ))
      put("invitations", { ...i, status: "Cancelled" }, u.tenant);
    const invite = makeInvite(u, target.id);
    audit(u, "Learner invitation issued", target.id, b.reason);
    return { ...invite, name: target.name, email: target.email };
  });
  app.post("/api/v1/owner/imports/preview", async (req) => {
    const u = permit(req, "users"),
      b = z
        .object({ csv: z.string().min(5).max(250000) })
        .strict()
        .parse(req.body);
    let data;
    try {
      data = parseCsv(b.csv.replace(/^\uFEFF/, ""));
    } catch (e) {
      fail(400, e.message);
    }
    const headers = data.shift()?.map((x) => x.trim().toLowerCase());
    if (!headers || headers.join(",") !== "name,email,phone")
      fail(400, "Use the exact CSV header: name,email,phone");
    if (!data.length || data.length > 200)
      fail(400, "Import between 1 and 200 learners per file.");
    const seen = new Set(),
      rows = data.map((cells, index) => {
        const [name = "", email = "", phone = ""] = cells.map((x) => x.trim()),
          normal = email.toLowerCase(),
          errors = [];
        if (cells.length !== 3) errors.push("Expected three columns");
        if (name.length < 2 || name.length > 100)
          errors.push("Name must contain 2–100 characters");
        if (!z.email().safeParse(normal).success) errors.push("Invalid email");
        if (phone && !/^(?:\+91)?[6-9][0-9]{9}$/.test(phone))
          errors.push("Use a valid Indian mobile number");
        if (seen.has(normal)) errors.push("Duplicate email in this file");
        seen.add(normal);
        if (db.prepare("SELECT 1 FROM users WHERE email=?").get(normal))
          errors.push("Email already has an account");
        return { line: index + 2, name, email: normal, phone, errors };
      });
    const id = randomUUID();
    put(
      "import_previews",
      {
        id,
        actor: u.id,
        rows,
        expires: Date.now() + 30 * 60000,
        status: "Preview",
        created: stamp(),
      },
      u.tenant,
    );
    audit(u, "Learner import validated", id);
    return {
      id,
      rows,
      valid: rows.filter((r) => !r.errors.length).length,
      invalid: rows.filter((r) => r.errors.length).length,
      expires: new Date(Date.now() + 30 * 60000).toISOString(),
    };
  });
  app.post("/api/v1/owner/imports/:id/commit", async (req) => {
    const u = permit(req, "users"),
      b = z
        .object({
          password: z.string(),
          reason: z.string().trim().min(5).max(1000),
        })
        .strict()
        .parse(req.body);
    pw(u, b.password);
    const p = owned(u, "import_previews", req.params.id);
    if (p.actor !== u.id)
      fail(
        403,
        "Only the administrator who previewed this import may commit it.",
      );
    if (p.status === "Committed")
      return {
        id: p.id,
        created: p.createdIds.length,
        alreadyCommitted: true,
        invitations: [],
      };
    if (p.expires < Date.now())
      fail(410, "Import preview expired. Validate the file again.");
    if (p.rows.some((r) => r.errors.length))
      fail(409, "Fix all validation errors before importing.");
    if (
      p.rows.some((r) =>
        db.prepare("SELECT 1 FROM users WHERE email=?").get(r.email),
      )
    )
      fail(409, "An account was added after preview. Validate the file again.");
    const invitations = [],
      createdIds = [];
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const r of p.rows) {
        const id = randomUUID();
        db.prepare(
          "INSERT INTO users(id,tenant,email,name,role,status,password,phone,preferences) VALUES(?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          u.tenant,
          r.email,
          r.name,
          "Learner",
          "Pending activation",
          hashPassword(randomBytes(32).toString("hex")),
          r.phone,
          "{}",
        );
        createdIds.push(id);
        invitations.push({
          ...makeInvite(u, id),
          name: r.name,
          email: r.email,
        });
      }
      put(
        "import_previews",
        { ...p, status: "Committed", createdIds, committed: stamp() },
        u.tenant,
      );
      audit(u, "Learners imported", p.id, b.reason);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { id: p.id, created: createdIds.length, invitations };
  });
  app.get("/api/v1/owner/imports", async (req) => {
    const u = permit(req, "users");
    return list("import_previews", u.tenant)
      .map(({ rows, ...p }) => ({
        ...p,
        total: rows.length,
        invalid: rows.filter((r) => r.errors.length).length,
      }))
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, 30);
  });
  const policySchema = z
    .object({
      durationMinutes: z.number().int().min(1).max(180),
      maxAttempts: z.number().int().min(1).max(10),
      passMark: z.number().int().min(1).max(100),
      questionCount: z.number().int().min(1).max(100),
      retryDelayMinutes: z.number().int().min(0).max(10080),
      reveal: z.enum(["After submission", "After passing", "Never"]),
      opensAt: z.iso.datetime().nullable(),
      closesAt: z.iso.datetime().nullable(),
      requirePractical: z.boolean(),
    })
    .strict()
    .refine(
      (p) => !p.opensAt || !p.closesAt || p.closesAt > p.opensAt,
      "Assessment closes after it opens.",
    );
  app.get("/api/v1/owner/assessments", async (req) => {
    const u = permit(req, "assessments");
    return courses(u).map((c) => ({
      ...c,
      assessmentPolicy: { ...defaultAssessmentPolicy, ...c.assessmentPolicy },
      questions: list("questions", u.tenant).filter((q) => q.courseId === c.id)
        .length,
      attempts: db
        .prepare(
          "SELECT count(*) n FROM attempts a JOIN users u ON a.user_id=u.id WHERE u.tenant=? AND a.course_id=?",
        )
        .get(u.tenant, c.id).n,
    }));
  });
  app.patch("/api/v1/owner/courses/:id/assessment-policy", async (req) => {
    const u = permit(req, "assessments");
    permit(req, "courses");
    const c = owned(u, "courses", req.params.id),
      b = z
        .object({
          policy: policySchema,
          revision: z.number().int(),
          reason: z.string().trim().min(5).max(1000),
        })
        .strict()
        .parse(req.body);
    if (["Published", "Archived"].includes(c.status))
      fail(409, "Create or restore a draft before changing assessment rules.");
    if ((c.revision || 1) !== b.revision)
      fail(409, "This course changed. Reload before saving.");
    const count = list("questions", u.tenant).filter(
      (q) => q.courseId === c.id && q.status !== "Archived",
    ).length;
    if (b.policy.questionCount > count)
      fail(
        400,
        "Question count exceeds this course's available question bank.",
      );
    const r = put(
      "courses",
      { ...c, assessmentPolicy: b.policy, revision: b.revision + 1 },
      u.tenant,
    );
    audit(u, "Assessment policy updated", c.id, b.reason);
    return r;
  });
  app.get("/api/v1/owner/publishing", async (req) => {
    const u = permit(req, "courses");
    return courses(u).map((c) => ({
      ...c,
      versions: list("versions", u.tenant)
        .filter((v) => v.courseId === c.id)
        .map((v) => ({
          version: v.version,
          published: v.published,
          lessons: v.lessons.length,
        })),
      reviews: list("course_reviews", u.tenant)
        .filter((r) => r.courseId === c.id)
        .sort((a, b) => b.created.localeCompare(a.created)),
    }));
  });
  app.post("/api/v1/owner/courses/:id/review", async (req) => {
    const u = permit(req, "courses"),
      c = owned(u, "courses", req.params.id),
      b = z
        .object({
          decision: z.enum(["Submit for review", "Request changes", "Approve"]),
          comment: z.string().trim().min(10).max(5000),
          revision: z.number().int(),
        })
        .strict()
        .parse(req.body);
    if (["Published", "Archived"].includes(c.status))
      fail(409, "Only draft content can enter review.");
    if ((c.revision || 1) !== b.revision)
      fail(409, "This course changed. Reload before reviewing.");
    if (
      b.decision !== "Submit for review" &&
      !["Super Admin", "Tenant Admin"].includes(u.role)
    )
      fail(403, "The institute owner must review this draft.");
    const status =
      b.decision === "Approve"
        ? "Approved"
        : b.decision === "Request changes"
          ? "Draft"
          : "In Review";
    db.exec("BEGIN IMMEDIATE");
    try {
      const r = put(
        "courses",
        { ...c, status, revision: b.revision + 1 },
        u.tenant,
      );
      put(
        "course_reviews",
        {
          ...b,
          id: randomUUID(),
          courseId: c.id,
          courseVersion: c.version + 1,
          actor: u.name,
          created: stamp(),
        },
        u.tenant,
      );
      audit(u, "Course review: " + b.decision, c.id, b.comment);
      db.exec("COMMIT");
      return r;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  });
  app.get("/api/v1/owner/search", async (req) => {
    const u = auth(req),
      b = z.object({ q: z.string().trim().min(2).max(80) }).parse(req.query),
      perms = req.permissions || null,
      term = b.q.toLowerCase(),
      can = (area) => {
        try {
          permit(req, area);
          return true;
        } catch {
          return false;
        }
      },
      results = [];
    if (can("courses"))
      for (const c of courses(u)
        .filter((c) => c.title.toLowerCase().includes(term))
        .slice(0, 6))
        results.push({
          type: "Course",
          title: c.title,
          detail: c.status,
          path: "/courses/" + c.id,
        });
    if (can("users"))
      for (const p of db
        .prepare(
          "SELECT id,name,email FROM users WHERE tenant=? AND role='Learner' AND (lower(name) LIKE ? OR lower(email) LIKE ?) LIMIT 6",
        )
        .all(
          u.tenant,
          "%" + term.replace(/[\\%_]/g, "") + "%",
          "%" + term.replace(/[\\%_]/g, "") + "%",
        ))
        results.push({
          type: "Learner",
          title: p.name,
          detail: p.email,
          path: "/directory?q=" + encodeURIComponent(p.email),
        });
    if (can("tickets"))
      for (const t of list("tickets", u.tenant)
        .filter((t) => t.title.toLowerCase().includes(term))
        .slice(0, 4))
        results.push({
          type: "Support",
          title: t.title,
          detail: t.status,
          path: "/tools/tickets",
        });
    return results;
  });
  const targetIds = (u, c) => {
    const learners = db
      .prepare(
        "SELECT id FROM users WHERE tenant=? AND role='Learner' AND status<>'Blocked'",
      )
      .all(u.tenant);
    if (c.audience === "All learners") return learners.map((u) => u.id);
    if (c.audience === "Batch")
      return owned(u, "academy_batches", c.targetId).learnerIds.filter((id) =>
        learners.some((l) => l.id === id),
      );
    return db
      .prepare(
        "SELECT e.user_id id FROM enrolments e JOIN users u ON e.user_id=u.id WHERE e.course_id=? AND e.state='Active' AND u.tenant=? AND u.status<>'Blocked'",
      )
      .all(c.targetId, u.tenant)
      .map((u) => u.id);
  };
  const publish = (c) => {
    const actor = { tenant: c.tenant, name: c.actor, id: c.actorId };
    const recipients = targetIds(actor, c);
    put(
      "notifications",
      {
        id: c.id,
        title: c.title,
        description: c.message,
        audience: c.audience,
        channel: "In-app",
        status: "Published",
        recipientIds: recipients,
        created: stamp(),
      },
      c.tenant,
    );
    for (const userId of recipients)
      put(
        "notification_deliveries",
        {
          id: c.id + ":" + userId,
          campaignId: c.id,
          userId,
          status: "Available in app",
          attempts: 1,
          delivered: stamp(),
        },
        c.tenant,
      );
    put(
      "campaigns",
      {
        ...c,
        status: "Published",
        delivered: stamp(),
        recipients: recipients.length,
      },
      c.tenant,
    );
    audit(actor, "In-app campaign published", c.id);
    return recipients.length;
  };
  app.runInstituteJobs = () => {
    for (const c of list("campaigns").filter(
      (c) => c.status === "Scheduled" && c.scheduledAt <= stamp(),
    )) {
      db.exec("BEGIN IMMEDIATE");
      try {
        if (get("campaigns", c.id)?.status !== "Scheduled") {
          db.exec("COMMIT");
          continue;
        }
        publish(c);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        put(
          "campaigns",
          {
            ...c,
            status: "Failed",
            error: "Audience unavailable. Review the campaign before retrying.",
          },
          c.tenant,
        );
      }
    }
  };
  const timer = setInterval(() => app.runInstituteJobs(), 15000);
  timer.unref();
  app.addHook("onClose", async () => clearInterval(timer));
  app.get("/api/v1/owner/campaigns", async (req) => {
    const u = permit(req, "notifications");
    return list("campaigns", u.tenant).sort((a, b) =>
      b.created.localeCompare(a.created),
    );
  });
  app.post("/api/v1/owner/campaigns", async (req) => {
    const u = permit(req, "notifications"),
      b = z
        .object({
          title: z.string().trim().min(5).max(150),
          message: z.string().trim().min(10).max(5000),
          audience: z.enum(["All learners", "Course", "Batch"]),
          targetId: z.string().default(""),
          scheduledAt: z.iso.datetime().nullable(),
          confirm: z.literal(true),
        })
        .strict()
        .parse(req.body);
    if (b.audience === "Course") owned(u, "courses", b.targetId);
    if (b.audience === "Batch") owned(u, "academy_batches", b.targetId);
    if (b.scheduledAt && b.scheduledAt < stamp())
      fail(400, "Choose a future schedule or publish now.");
    const c = {
      ...b,
      id: randomUUID(),
      tenant: u.tenant,
      actor: u.name,
      actorId: u.id,
      status: b.scheduledAt ? "Scheduled" : "Draft",
      created: stamp(),
      recipients: 0,
    };
    targetIds(u, c);
    db.exec("BEGIN IMMEDIATE");
    try {
      put("campaigns", c, u.tenant);
      if (!b.scheduledAt) publish(c);
      audit(u, "Campaign created", c.id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return get("campaigns", c.id);
  });
  app.post("/api/v1/owner/campaigns/:id/cancel", async (req) => {
    const u = permit(req, "notifications"),
      c = owned(u, "campaigns", req.params.id),
      b = reasons.parse(req.body);
    if (c.status !== "Scheduled")
      fail(409, "Only scheduled campaigns can be cancelled.");
    const r = put("campaigns", { ...c, status: "Cancelled" }, u.tenant);
    audit(u, "Campaign cancelled", c.id, b.reason);
    return r;
  });
  app.get("/api/v1/owner/campaigns/:id/deliveries", async (req) => {
    const u = permit(req, "notifications"),
      c = owned(u, "campaigns", req.params.id);
    return list("notification_deliveries", u.tenant)
      .filter((d) => d.campaignId === c.id)
      .map((d) => ({
        ...d,
        read: !!db
          .prepare(
            "SELECT 1 FROM personal WHERE user_id=? AND kind='read' AND id=?",
          )
          .get(d.userId, c.id),
      }));
  });
  app.get("/api/v1/owner/governance", async (req) => {
    const u = permit(req, "privacy");
    return {
      requests: list("privacy", u.tenant),
      policy: get("governance", u.tenant) || {
        id: u.tenant,
        retentionDays: 365,
        notes: "Retention review required before any erasure.",
        revision: 1,
      },
      limitations:
        "Deactivation and tracked retention decisions are supported. Irreversible erasure and backup deletion require a separate approved process.",
    };
  });
  app.patch("/api/v1/owner/governance/policy", async (req) => {
    const u = permit(req, "privacy"),
      b = z
        .object({
          retentionDays: z.number().int().min(30).max(3650),
          notes: z.string().min(10).max(3000),
          revision: z.number().int(),
          reason: z.string().min(5),
        })
        .strict()
        .parse(req.body),
      p = get("governance", u.tenant) || { revision: 1 };
    if (p.revision !== b.revision)
      fail(409, "Retention policy changed. Reload before saving.");
    const r = put(
      "governance",
      {
        id: u.tenant,
        retentionDays: b.retentionDays,
        notes: b.notes,
        revision: b.revision + 1,
      },
      u.tenant,
    );
    audit(u, "Retention policy updated", u.tenant, b.reason);
    return r;
  });
  app.post("/api/v1/owner/governance/:id/review", async (req) => {
    const u = permit(req, "privacy"),
      r = owned(u, "privacy", req.params.id),
      b = z
        .object({
          status: z.enum([
            "Under review",
            "Awaiting retention review",
            "Rejected",
            "Completed",
          ]),
          identityVerified: z.literal(true),
          legalHold: z.boolean(),
          reason: z.string().trim().min(10).max(3000),
        })
        .strict()
        .parse(req.body);
    if (b.status === "Completed" && r.type === "Account deletion")
      fail(
        409,
        "Use retention review or deactivate access; this prototype does not claim irreversible erasure.",
      );
    if (b.legalHold && b.status === "Completed")
      fail(409, "A legal hold prevents completion.");
    const result = put(
      "privacy",
      { ...r, ...b, reviewer: u.name, reviewed: stamp() },
      u.tenant,
    );
    audit(u, "Privacy request reviewed", r.id, b.reason);
    return result;
  });
  app.post("/api/v1/owner/governance/:id/deactivate", async (req) => {
    const u = permit(req, "privacy");
    permit(req, "users");
    const r = owned(u, "privacy", req.params.id),
      b = z
        .object({ password: z.string(), reason: z.string().trim().min(10) })
        .strict()
        .parse(req.body);
    pw(u, b.password);
    if (!r.identityVerified || r.legalHold)
      fail(409, "Verify identity and resolve legal hold review first.");
    const target = db
      .prepare(
        "SELECT id FROM users WHERE id=? AND tenant=? AND role='Learner'",
      )
      .get(r.userId, u.tenant);
    if (!target) fail(404, "Learner not found.");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE users SET status='Inactive' WHERE id=?").run(
        target.id,
      );
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(target.id);
      put(
        "privacy",
        { ...r, status: "Awaiting retention review", deactivated: stamp() },
        u.tenant,
      );
      audit(u, "Privacy access deactivated", target.id, b.reason);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { deactivated: true, erased: false };
  });
  app.post("/api/v1/owner/governance/:id/export", async (req) => {
    const u = permit(req, "privacy"),
      r = owned(u, "privacy", req.params.id);
    reasons.parse(req.body);
    if (!r.identityVerified)
      fail(409, "Verify the requester's identity before preparing an export.");
    const user = db
      .prepare(
        "SELECT id,name,email,phone,status,preferences FROM users WHERE id=? AND tenant=?",
      )
      .get(r.userId, u.tenant);
    if (!user) fail(404, "Learner not found.");
    audit(u, "Verified privacy data exported", r.id, req.body.reason);
    return {
      profile: user,
      personal: db
        .prepare("SELECT kind,id,body FROM personal WHERE user_id=?")
        .all(user.id)
        .map(({ kind, id, body }) => ({ kind, id, data: JSON.parse(body) })),
      subscriptions: db
        .prepare(
          "SELECT id,package_name,starts,expires,status,paid_paise FROM subscriptions WHERE user_id=?",
        )
        .all(user.id),
      practicals: list("academy_practicals", u.tenant).filter(
        (p) => p.userId === user.id,
      ),
      progress: db
        .prepare("SELECT * FROM progress WHERE user_id=?")
        .all(user.id),
      attempts: db
        .prepare(
          "SELECT id,course_id,status,score,submitted FROM attempts WHERE user_id=?",
        )
        .all(user.id),
      enrolments: db
        .prepare("SELECT * FROM enrolments WHERE user_id=?")
        .all(user.id),
      exported: stamp(),
    };
  });
  const reportQuery = z
    .object({
      from: z.iso.date(),
      to: z.iso.date(),
      courseId: z.string().default(""),
      batchId: z.string().default(""),
    })
    .refine(
      (b) =>
        b.to >= b.from &&
        Date.parse(b.to) - Date.parse(b.from) <= 366 * 86400000,
      "Choose a date range of at most one year.",
    );
  const reportData = (u, b) => {
    const batch = b.batchId ? owned(u, "academy_batches", b.batchId) : null;
    if (b.courseId) owned(u, "courses", b.courseId);
    const people = db
        .prepare("SELECT id,name FROM users WHERE tenant=? AND role='Learner'")
        .all(u.tenant)
        .filter((p) => !batch || batch.learnerIds.includes(p.id)),
      ids = new Set(people.map((p) => p.id)),
      start = b.from + "T00:00:00+05:30",
      end = new Date(Date.parse(b.to + "T23:59:59.999+05:30")).toISOString(),
      from = new Date(start).toISOString(),
      cs = courses(u).filter(
        (c) =>
          (!b.courseId || c.id === b.courseId) &&
          (!batch || batch.courseIds.includes(c.id)),
      ),
      attempts = db
        .prepare("SELECT * FROM attempts WHERE started>=? AND started<=?")
        .all(Date.parse(from), Date.parse(end))
        .filter(
          (a) => ids.has(a.user_id) && cs.some((c) => c.id === a.course_id),
        ),
      result = cs.map((c) => {
        const es = db
            .prepare(
              "SELECT * FROM enrolments WHERE course_id=? AND state='Active'",
            )
            .all(c.id)
            .filter((e) => ids.has(e.user_id)),
          as = attempts.filter(
            (a) => a.course_id === c.id && a.status === "Submitted",
          ),
          done = es.filter((e) => {
            const ls = get("versions", c.id + "-v" + e.version)?.lessons || [];
            return (
              ls.length &&
              ls
                .filter((l) => l.required)
                .every((l) =>
                  db
                    .prepare(
                      "SELECT 1 FROM progress WHERE user_id=? AND lesson_id=? AND completed=1",
                    )
                    .get(e.user_id, l.id),
                )
            );
          }).length;
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          enrolled: es.length,
          completed: done,
          completion: es.length ? Math.round((done / es.length) * 100) : 0,
          attempts: as.length,
          averageScore: as.length
            ? Math.round(as.reduce((n, a) => n + a.score, 0) / as.length)
            : null,
        };
      });
    return {
      filters: b,
      timezone: "Asia/Kolkata",
      courses: result,
      attempts: attempts.length,
      submitted: attempts.filter((a) => a.status === "Submitted").length,
      averageScore: attempts.some((a) => a.status === "Submitted")
        ? Math.round(
            attempts
              .filter((a) => a.status === "Submitted")
              .reduce((n, a) => n + a.score, 0) /
              attempts.filter((a) => a.status === "Submitted").length,
          )
        : null,
      definitions: {
        enrolled:
          "Current active enrolments in the selected course/cohort, independent of date filter.",
        completed:
          "Current completion of required lessons in each learner's enrolled version. This does not imply practical competence.",
        attempts: "Assessment attempts started in the chosen IST date range.",
        averageScore:
          "Mean submitted score in the date range. No submissions is shown as unavailable, never zero.",
      },
    };
  };
  app.get("/api/v1/owner/insights", async (req) => {
    const u = permit(req, "analytics");
    return reportData(u, reportQuery.parse(req.query));
  });
  app.get("/api/v1/owner/insights/export", async (req, reply) => {
    const u = permit(req, "analytics"),
      r = reportData(u, reportQuery.parse(req.query));
    audit(u, "Filtered learning report exported", "learning-insights");
    reply
      .type("text/csv; charset=utf-8")
      .header(
        "Content-Disposition",
        'attachment; filename="refix-learning-report.csv"',
      );
    return csvExport([
      [
        "Course",
        "Category",
        "Active enrolments",
        "Required lessons complete",
        "Completion %",
        "Submitted attempts",
        "Mean score %",
      ],
      ...r.courses.map((c) => [
        c.title,
        c.category,
        c.enrolled,
        c.completed,
        c.completion,
        c.attempts,
        c.averageScore ?? "",
      ]),
    ]);
  });
  app.get("/api/v1/owner/saved-views", async (req) => {
    const u = permit(req, "analytics");
    return list("saved_views", u.tenant).filter((v) => v.userId === u.id);
  });
  app.post("/api/v1/owner/saved-views", async (req) => {
    const u = permit(req, "analytics"),
      b = z
        .object({
          name: z.string().trim().min(3).max(100),
          filters: reportQuery,
        })
        .strict()
        .parse(req.body);
    if (
      list("saved_views", u.tenant).filter((v) => v.userId === u.id).length >=
      20
    )
      fail(409, "Remove a saved view before adding another.");
    const r = put(
      "saved_views",
      { ...b, id: randomUUID(), userId: u.id, created: stamp() },
      u.tenant,
    );
    audit(u, "Report view saved", r.id);
    return r;
  });
  app.delete("/api/v1/owner/saved-views/:id", async (req) => {
    const u = permit(req, "analytics"),
      v = owned(u, "saved_views", req.params.id);
    if (v.userId !== u.id) fail(404, "Saved view not found.");
    db.prepare(
      "DELETE FROM records WHERE kind='saved_views' AND id=? AND tenant=?",
    ).run(v.id, u.tenant);
    audit(u, "Report view removed", v.id);
    return { ok: true };
  });
  app.get("/api/v1/owner/platform", async (req) => {
    const u = permit(req, "settings"),
      assetBytes = list("coaching_assets", u.tenant).reduce(
        (n, a) => n + (a.size || 0),
        0,
      );
    return {
      database: db.prepare("PRAGMA quick_check").get().quick_check,
      uptime: Math.floor(process.uptime()),
      learners: db
        .prepare(
          "SELECT count(*) n FROM users WHERE tenant=? AND role='Learner'",
        )
        .get(u.tenant).n,
      mediaAssets: list("coaching_assets", u.tenant).length,
      uploadedBytes: assetBytes,
      scheduledCampaigns: list("campaigns", u.tenant).filter(
        (c) => c.status === "Scheduled",
      ).length,
      flags: list("flags", u.tenant).filter((f) =>
        ["tutor", "offline", "certificates"].includes(f.key),
      ),
      incidents: list("incidents", u.tenant),
      integrations: [
        {
          name: "In-app announcements",
          status: "Connected",
          detail:
            "Local persistent scheduler · checked every 15 seconds while API runs",
        },
        {
          name: "Payment gateway",
          status: "Not configured",
          detail: "Manual owner verification is active",
        },
        {
          name: "Email / SMS / push",
          status: "Not configured",
          detail: "No external messages are sent",
        },
        {
          name: "AI provider",
          status: "Not configured",
          detail: "Reference-only assistant remains available when enabled",
        },
        {
          name: "Media transcoding / malware scanning",
          status: "Not configured",
          detail: "Private local files with signature and size validation",
        },
      ],
    };
  });
}

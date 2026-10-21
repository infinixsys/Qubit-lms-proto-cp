import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  randomUUID,
  scryptSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { courses, lessonsFor, resources, questions, now } from "./seed.mjs";
export const hashPassword = (p, salt = randomBytes(16).toString("hex")) =>
  `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
export function verifyPassword(p, hash) {
  try {
    const [s, h] = hash.split(":");
    return timingSafeEqual(Buffer.from(h, "hex"), scryptSync(p, s, 64));
  } catch {
    return false;
  }
}
export const DEFAULT_DB_PATH = fileURLToPath(
  new URL("../.data/qubit.sqlite", import.meta.url),
);
export function openDb(path = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  db.exec(`CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL,id TEXT NOT NULL,tenant TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,tenant TEXT NOT NULL,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL,status TEXT NOT NULL,password TEXT NOT NULL,preferences TEXT NOT NULL DEFAULT '{}');
 CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL,created TEXT NOT NULL,device TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY,tenant TEXT,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,reason TEXT,result TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS progress (user_id TEXT NOT NULL,lesson_id TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,position INTEGER NOT NULL DEFAULT 0,updated TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id));
 CREATE TABLE IF NOT EXISTS events (user_id TEXT NOT NULL,key TEXT NOT NULL,PRIMARY KEY(user_id,key));
 CREATE TABLE IF NOT EXISTS enrolments (user_id TEXT NOT NULL,course_id TEXT NOT NULL,version INTEGER NOT NULL,state TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(user_id,course_id));
 CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,course_id TEXT NOT NULL,questions TEXT NOT NULL,responses TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL,score REAL,started INTEGER NOT NULL,submitted TEXT);
 CREATE TABLE IF NOT EXISTS personal (user_id TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(user_id,kind,id));`);
  const get = (kind, id) => {
    const r = db
      .prepare("SELECT body FROM records WHERE kind=? AND id=?")
      .get(kind, id);
    return r ? JSON.parse(r.body) : undefined;
  };
  const list = (kind, tenant) =>
    db
      .prepare(
        "SELECT body FROM records WHERE kind=?" +
          (tenant ? " AND tenant=?" : ""),
      )
      .all(...(tenant ? [kind, tenant] : [kind]))
      .map((x) => JSON.parse(x.body));
  const put = (kind, obj, tenant = "tenant-demo") => {
    const row = { ...obj, updated: now() };
    db.prepare(
      "INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body",
    ).run(kind, row.id, tenant, JSON.stringify(row));
    return row;
  };
  const audit = (user, action, target, reason = "", result = "Success") =>
    db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)")
      .run(
        randomUUID(),
        user?.tenant || "tenant-demo",
        user?.name || "System",
        action,
        String(target),
        reason,
        result,
        now(),
      );
  if (!get("settings", "platform")) {
    for (const c of courses) {
      put("courses", c);
      for (const l of lessonsFor(c)) put("lessons", l);
      if (c.status === "Published")
        put("versions", {
          id: c.id + "-v1",
          courseId: c.id,
          version: 1,
          course: c,
          lessons: lessonsFor(c),
          published: now(),
        });
    }
    for (const [k, rows] of Object.entries(resources))
      for (const r of rows) put(k, r, k === "tenants" ? r.id : "tenant-demo");
    questions.forEach((q) => put("questions", q));
    put("settings", {
      id: "platform",
      name: "Qubit",
      tagline: "A little learning. Limitless possibility.",
      locale: "en",
      timezone: "Asia/Kolkata",
      maintenance: false,
      weeklyGoal: 120,
      retentionDays: 365,
      aiBudget: 50,
    });
    const add = db.prepare(
      "INSERT INTO users(id,tenant,email,name,role,status,password,preferences) VALUES(?,?,?,?,?,?,?,?)",
    );
    for (const u of [
      [
        "admin-demo",
        "tenant-demo",
        "admin@qubit.demo",
        "Alex Morgan",
        "Super Admin",
      ],
      [
        "learner-demo",
        "tenant-demo",
        "learner@qubit.demo",
        "Jamie Parker",
        "Learner",
      ],
      [
        "instructor-demo",
        "tenant-demo",
        "olivia@qubit.demo",
        "Olivia Rhye",
        "Instructor",
      ],
      [
        "support-demo",
        "tenant-demo",
        "support@qubit.demo",
        "Demi Wilkinson",
        "Support",
      ],
      [
        "finance-demo",
        "tenant-demo",
        "finance@qubit.demo",
        "Phoenix Baker",
        "Finance",
      ],
      [
        "tenant-admin",
        "tenant-demo",
        "tenant@qubit.demo",
        "Lana Steiner",
        "Tenant Admin",
      ],
      [
        "other-learner",
        "tenant-studio",
        "studio@qubit.demo",
        "Drew Cano",
        "Learner",
      ],
    ])
      add.run(
        ...u,
        "Active",
        hashPassword("QubitDemo2026!"),
        JSON.stringify({
          language: "English",
          timezone: "Asia/Kolkata",
          weeklyGoal: 120,
          theme: "light",
          emailNotifications: true,
          pushNotifications: false,
          aiConsent: false,
          analyticsConsent: false,
        }),
      );
    for (let i = 1; i <= 14; i++)
      add.run(
        "user-" + i,
        "tenant-demo",
        `learner${i}@example.test`,
        [
          "Sienna Hewitt",
          "Noah Williams",
          "Ava Thompson",
          "Ethan Miller",
          "Isabella Moore",
          "Lucas Chen",
          "Mia Patel",
          "Oliver Wilson",
          "Amelia Davis",
          "James Taylor",
          "Charlotte Lee",
          "Benjamin Clark",
          "Harper Lewis",
          "Henry Allen",
        ][i - 1],
        i % 6 === 0 ? "Instructor" : "Learner",
        i === 11 ? "Suspended" : "Active",
        hashPassword(randomBytes(20).toString("hex")),
        "{}",
      );
    for (const id of [
      "design-thinking",
      "product-strategy",
      "data-storytelling",
    ])
      db.prepare("INSERT INTO enrolments VALUES(?,?,?,?,?)").run(
        "learner-demo",
        id,
        1,
        "Active",
        now(),
      );
    for (let i = 1; i <= 2; i++)
      db.prepare("INSERT INTO progress VALUES(?,?,?,?,?)").run(
        "learner-demo",
        `design-thinking-lesson-${i}`,
        1,
        0,
        now(),
      );
    db.prepare("INSERT INTO progress VALUES(?,?,?,?,?)").run(
      "learner-demo",
      "product-strategy-lesson-1",
      1,
      0,
      now(),
    );
    audit(
      null,
      "Environment initialised",
      "Qubit Academy",
      "Synthetic prototype data",
    );
  }
  return { db, get, list, put, audit, path };
}
export const safeUser = (u) => {
  if (!u) return null;
  const { password, ...safe } = u;
  return { ...safe, preferences: JSON.parse(u.preferences || "{}") };
};

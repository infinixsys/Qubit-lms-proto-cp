import {
  randomBytes,
  createHmac,
  createHash,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { verifyPassword } from "./db.mjs";
const digest = (s) => createHash("sha256").update(s).digest("hex");
const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function encodeBase32(bytes) {
  let bits = 0,
    value = 0,
    out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
export function totp(secret, step = Math.floor(Date.now() / 30000)) {
  let bits = 0,
    value = 0,
    bytes = [];
  for (const c of secret) {
    value = (value << 5) | alphabet.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest(),
    offset = hash[19] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
export function registerSecurity({ app, store, auth, issueSession, surface }) {
  const { db, get, put, audit } = store;
  let key;
  if (store.path === ":memory:") key = randomBytes(32);
  else {
    const dir = dirname(store.path),
      file = join(dir, ".security-key");
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(file, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    key = readFileSync(file);
    if (key.length !== 32) throw new Error("Invalid institute security key");
  }
  const seal = (text) => {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", key, iv),
      encrypted = Buffer.concat([c.update(text, "utf8"), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), encrypted]).toString("base64");
  };
  const open = (text) => {
    const raw = Buffer.from(text, "base64"),
      d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString(
      "utf8",
    );
  };
  const staff = (req) => {
    const u = auth(req);
    if (u.role === "Learner") fail(403, "Staff access is required.");
    return u;
  };
  const stepUp = (u, pw) => {
    if (!verifyPassword(pw, u.password))
      fail(403, "Confirm your current password.");
  };
  const check = (u, record, code) => {
    const step = Math.floor(Date.now() / 30000),
      secret = open(record.secret);
    for (let s = step - 1; s <= step + 1; s++)
      if (
        s > (record.lastStep ?? -1) &&
        /^\d{6}$/.test(code) &&
        timingSafeEqual(Buffer.from(totp(secret, s)), Buffer.from(code))
      )
        return { ...record, lastStep: s };
    const hash = digest(code.replaceAll("-", "").toUpperCase());
    if (record.recovery?.includes(hash))
      return { ...record, recovery: record.recovery.filter((x) => x !== hash) };
    fail(401, "The verification code is invalid or has already been used.");
  };
  const enabled = (id) => !!get("mfa", id)?.enabled;
  const challenge = (u, application) => {
    const token = randomBytes(32).toString("hex");
    put(
      "auth_challenges",
      {
        id: digest(token),
        userId: u.id,
        expires: Date.now() + 300000,
        attempts: 0,
        surface: application,
      },
      u.tenant,
    );
    return { mfaRequired: true, challenge: token, expiresIn: 300 };
  };
  app.post(
    "/api/v1/auth/mfa",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const b = z
          .object({
            challenge: z.string().length(64),
            code: z.string().min(6).max(40),
          })
          .strict()
          .parse(req.body),
        c = get("auth_challenges", digest(b.challenge));
      if (
        !c ||
        c.used ||
        c.expires < Date.now() ||
        c.attempts >= 5 ||
        c.surface !== surface(req)
      )
        fail(401, "This sign-in challenge has expired. Sign in again.");
      const u = db.prepare("SELECT * FROM users WHERE id=?").get(c.userId);
      if (
        !u ||
        u.status !== "Active" ||
        get("tenants", u.tenant)?.status === "Suspended"
      )
        fail(401, "This account is unavailable.");
      put("auth_challenges", { ...c, attempts: c.attempts + 1 }, u.tenant);
      let verified;
      try {
        const m = get("mfa", u.id);
        if (!m?.enabled)
          fail(401, "Sign in again after the security setting changed.");
        verified = check(u, m, b.code);
      } catch (e) {
        audit(
          u,
          "MFA verification rejected",
          u.id,
          "Invalid or replayed code",
          "Denied",
        );
        throw e;
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        put("mfa", verified, u.tenant);
        put(
          "auth_challenges",
          { ...c, used: true, attempts: c.attempts + 1 },
          u.tenant,
        );
        audit(u, "MFA sign-in verified", u.id);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return issueSession(u, req, reply);
    },
  );
  app.get("/api/v1/owner/security", async (req) => {
    const u = staff(req),
      m = get("mfa", u.id);
    return {
      enabled: !!m?.enabled,
      recoveryCodesRemaining: m?.recovery?.length || 0,
      method: "Authenticator app (TOTP)",
      sessions: db
        .prepare(
          "SELECT hash,device,created,expires FROM sessions WHERE user_id=? AND expires>? ORDER BY created DESC",
        )
        .all(u.id, Date.now())
        .map((s) => ({
          id: digest(s.hash),
          device: s.device,
          created: s.created,
          expires: new Date(s.expires).toISOString(),
          current: s.hash === req.session,
        })),
      events: db
        .prepare(
          "SELECT action,result,created FROM audit WHERE tenant=? AND actor=? AND (action LIKE '%Signed%' OR action LIKE '%MFA%' OR action LIKE '%session%') ORDER BY created DESC LIMIT 20",
        )
        .all(u.tenant, u.name),
    };
  });
  app.post(
    "/api/v1/owner/security/enrol",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req) => {
      const u = staff(req),
        b = z.object({ password: z.string() }).strict().parse(req.body);
      stepUp(u, b.password);
      if (enabled(u.id))
        fail(409, "Authenticator verification is already enabled.");
      const secret = encodeBase32(randomBytes(20));
      put(
        "mfa_pending",
        { id: u.id, secret: seal(secret), expires: Date.now() + 600000 },
        u.tenant,
      );
      audit(u, "MFA enrolment started", u.id);
      return {
        secret,
        uri:
          "otpauth://totp/" +
          encodeURIComponent("Refix India Institute:" + u.email) +
          "?secret=" +
          secret +
          "&issuer=Refix%20India%20Institute&algorithm=SHA1&digits=6&period=30",
      };
    },
  );
  app.post(
    "/api/v1/owner/security/confirm",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req) => {
      const u = staff(req),
        b = z
          .object({ code: z.string().regex(/^\d{6}$/) })
          .strict()
          .parse(req.body),
        p = get("mfa_pending", u.id);
      if (!p || p.expires < Date.now() || enabled(u.id))
        fail(409, "Start authenticator setup again.");
      const recovery = Array.from({ length: 8 }, () =>
          randomBytes(10).toString("hex").toUpperCase(),
        ),
        verified = check(
          u,
          {
            id: u.id,
            secret: p.secret,
            enabled: true,
            recovery: recovery.map(digest),
          },
          b.code,
        );
      db.exec("BEGIN IMMEDIATE");
      try {
        put("mfa", verified, u.tenant);
        db.prepare("DELETE FROM records WHERE kind='mfa_pending' AND id=?").run(
          u.id,
        );
        db.prepare("DELETE FROM sessions WHERE user_id=? AND hash<>?").run(
          u.id,
          req.session,
        );
        audit(u, "MFA enabled; other sessions revoked", u.id);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return { enabled: true, recoveryCodes: recovery };
    },
  );
  app.post(
    "/api/v1/owner/security/disable",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req) => {
      const u = staff(req),
        b = z
          .object({
            password: z.string(),
            code: z.string(),
            reason: z.string().trim().min(5),
          })
          .strict()
          .parse(req.body);
      stepUp(u, b.password);
      const m = get("mfa", u.id);
      if (!m?.enabled) fail(409, "Authenticator verification is not enabled.");
      check(u, m, b.code);
      db.prepare("DELETE FROM records WHERE kind='mfa' AND id=?").run(u.id);
      db.prepare("DELETE FROM sessions WHERE user_id=? AND hash<>?").run(
        u.id,
        req.session,
      );
      audit(u, "MFA disabled", u.id, b.reason);
      return { enabled: false };
    },
  );
  app.post("/api/v1/owner/security/sessions/:id/revoke", async (req) => {
    const u = staff(req),
      b = z
        .object({ reason: z.string().trim().min(5).max(1000) })
        .strict()
        .parse(req.body),
      s = db
        .prepare("SELECT hash FROM sessions WHERE user_id=?")
        .all(u.id)
        .find((s) => digest(s.hash) === req.params.id);
    if (!s) fail(404, "Session not found.");
    if (s.hash === req.session)
      fail(409, "Use Sign out for your current session.");
    db.prepare("DELETE FROM sessions WHERE hash=?").run(s.hash);
    audit(u, "Staff session revoked", u.id, b.reason);
    return { ok: true };
  });
  return { enabled, challenge };
}

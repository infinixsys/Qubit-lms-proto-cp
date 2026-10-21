import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_DB_PATH } from "./db.mjs";
const source = resolve(process.env.DB_PATH || DEFAULT_DB_PATH);
const folder = resolve(".data/backups");
mkdirSync(folder, { recursive: true });
const target = resolve(
  folder,
  "qubit-" + new Date().toISOString().replaceAll(":", "-") + ".sqlite",
);
const db = new DatabaseSync(source);
await backup(db, target);
db.close();
const restored = new DatabaseSync(target, { readOnly: true });
const integrity = restored.prepare("PRAGMA integrity_check").get();
if (integrity.integrity_check !== "ok")
  throw new Error("Backup integrity check failed.");
const users = restored.prepare("SELECT count(*) n FROM users").get().n;
const records = restored.prepare("SELECT count(*) n FROM records").get().n;
restored.close();
console.log(
  JSON.stringify(
    {
      backup: target,
      integrity: "ok",
      restoredRead: { users, records },
      note: "Local snapshot and read validation only. This does not establish encrypted offsite disaster recovery.",
    },
    null,
    2,
  ),
);

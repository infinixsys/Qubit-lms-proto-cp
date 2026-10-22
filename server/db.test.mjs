import { test } from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "qubit-db-"));
  // Exercise URL escaping as well as native Windows drive-letter conversion.
  const project = join(root, "Qubit products café #100%");
  const server = join(project, "server");
  const cwd = join(root, "another working directory");
  mkdirSync(server, { recursive: true });
  mkdirSync(cwd);
  for (const name of ["db.mjs", "seed.mjs", "backup.mjs", "coaching-data.mjs"])
    copyFileSync(
      fileURLToPath(new URL(name, import.meta.url)),
      join(server, name),
    );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return {
    root,
    server,
    cwd,
    expected: join(project, ".data", "qubit.sqlite"),
  };
}

function openInChild(f, dbPath = "") {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `const { openDb } = await import(process.argv[1]);
       const store = openDb();
       const users = store.db.prepare('SELECT count(*) AS count FROM users').get().count;
       store.db.close();
       process.stdout.write(JSON.stringify({path:store.path, users}));`,
      pathToFileURL(join(f.server, "db.mjs")).href,
    ],
    {
      cwd: f.cwd,
      env: { ...process.env, DB_PATH: dbPath },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("default database opens in the checkout with spaces, Unicode, # and % in its path", (t) => {
  const f = fixture(t);
  const result = openInChild(f);
  assert.equal(result.path, f.expected);
  assert.ok(existsSync(f.expected));
  assert.ok(result.users > 0);
  assert.equal(existsSync(join(f.cwd, ".data", "qubit.sqlite")), false);
});

test("explicit database paths and in-memory databases remain supported", (t) => {
  const f = fixture(t);
  const customPath = join(f.root, "custom data", "my learning.sqlite");
  assert.equal(openInChild(f, customPath).path, customPath);
  assert.ok(existsSync(customPath));
  assert.equal(openInChild(f, ":memory:").path, ":memory:");
  assert.equal(existsSync(f.expected), false);
});

test("backup reads the same default database when launched outside the checkout", (t) => {
  const f = fixture(t);
  const seeded = openInChild(f, f.expected);
  const result = spawnSync(process.execPath, [join(f.server, "backup.mjs")], {
    cwd: f.cwd,
    env: { ...process.env, DB_PATH: "" },
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.integrity, "ok");
  assert.equal(report.restoredRead.users, seeded.users);
  assert.ok(existsSync(report.backup));
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./pg-dump-retry.mjs", import.meta.url));

// pg_dump falso: falha enquanto o contador for menor que FAIL_TIMES, deixando lixo no
// ficheiro de saída; depois escreve um dump "bom". Regista se encontrou lixo da tentativa anterior.
function run(failTimes, attempts = 3, extraEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pgdump-retry-"));
  const fake = join(dir, "pg_dump");
  writeFileSync(fake, `#!/usr/bin/env bash
out="\${@: -1}"; n=$(cat "${dir}/n" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "${dir}/n"
printf '%s\\n' "$PGHOST" >> "${dir}/pghost"
printf '%s\\n' "$PG_DUMP_TIMEOUT_MS" >> "${dir}/timeout"
[ -e "$out" ] && echo stale >> "${dir}/stale"
if [ "$n" -le ${failTimes} ]; then echo parcial > "$out"; exit 1; fi
echo bom > "$out"
`);
  chmodSync(fake, 0o755);
  const dump = join(dir, "postgres.dump");
  const env = {
    ...process.env,
    DATABASE_URL: "postgres://u:p@h/db",
    BACKUP_DUMP: dump,
    PG_DUMP_BIN: fake,
    PG_DUMP_ATTEMPTS: String(attempts),
    PG_DUMP_RETRY_WAIT_MS: "1",
    ...extraEnv,
  };
  if (!Object.hasOwn(extraEnv, "PG_DUMP_TIMEOUT_MS")) delete env.PG_DUMP_TIMEOUT_MS;
  if (!Object.hasOwn(extraEnv, "BACKUP_DATABASE_URL")) delete env.BACKUP_DATABASE_URL;
  const r = spawnSync(process.execPath, [script], { encoding: "utf8", env });
  return {
    r,
    dump,
    calls: Number(readFileSync(join(dir, "n"), "utf8")),
    stale: existsSync(join(dir, "stale")),
    pghost: existsSync(join(dir, "pghost")) ? readFileSync(join(dir, "pghost"), "utf8").trim().split("\n").at(-1) : "",
    timeoutMs: existsSync(join(dir, "timeout")) ? readFileSync(join(dir, "timeout"), "utf8").trim().split("\n").at(-1) : "",
  };
}

test("a transient pg_dump failure is retried and the good dump wins", () => {
  const { r, dump, calls, stale } = run(2);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(calls, 3);
  assert.equal(readFileSync(dump, "utf8").trim(), "bom");
  assert.equal(stale, false, "cada tentativa tem de começar sem o dump parcial da anterior");
  assert.match(r.stderr, /tentativa 1\/3/);
});

test("a persistent failure still fails the backup after the last attempt", () => {
  const { r, calls } = run(99);
  assert.equal(r.status, 1);
  assert.equal(calls, 3);
});

test("the production snapshot uses the retrying dump step", () => {
  const sh = readFileSync(fileURLToPath(new URL("./backup-production.sh", import.meta.url)), "utf8");
  assert.match(sh, /pg-dump-retry\.mjs/);
});

test("BACKUP_DATABASE_URL is used for pg_dump when set", () => {
  const { r, pghost } = run(0, 3, {
    DATABASE_URL: "postgres://u:p@app-host/db",
    BACKUP_DATABASE_URL: "postgres://u:p@backup-host/db",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(pghost, "backup-host");
});

test("DATABASE_URL is used for pg_dump when BACKUP_DATABASE_URL is absent", () => {
  const { r, pghost } = run(0, 3, {
    DATABASE_URL: "postgres://u:p@app-host/db",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(pghost, "app-host");
});

test("pg_dump timeout defaults to 15 minutes", () => {
  const { r, timeoutMs } = run(0);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(timeoutMs, "900000");
});

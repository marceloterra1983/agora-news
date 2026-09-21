// pg_dump com nova tentativa. BACKUP_DATABASE_URL (via directa) se existir; senão
// DATABASE_URL (a app continua no pooler). Teto 15 min por omissão: o COPY de posts
// já chegou a partir a ligação e a estourar 5 min no pooler (2026-09-21).
// Cada tentativa começa de um ficheiro limpo: um dump parcial nunca é aproveitado.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const rawUrl = (process.env.BACKUP_DATABASE_URL || "").trim() || process.env.DATABASE_URL;
const url = new URL(rawUrl);
const attempts = Number(process.env.PG_DUMP_ATTEMPTS || 3);
const timeout = Number(process.env.PG_DUMP_TIMEOUT_MS || 900_000);
const waitMs = Number(process.env.PG_DUMP_RETRY_WAIT_MS || 60_000);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.replace(/^\/+/, "")) || "postgres",
  PGSSLMODE: url.searchParams.get("sslmode") || "require",
  PGCONNECT_TIMEOUT: "30",
  PG_DUMP_TIMEOUT_MS: String(timeout),
};
delete env.DATABASE_URL;
delete env.BACKUP_DATABASE_URL;

const bin = process.env.PG_DUMP_BIN || "pg_dump";
const out = process.env.BACKUP_DUMP;

for (let i = 1; i <= attempts; i++) {
  rmSync(out, { force: true });
  const result = spawnSync(
    bin,
    ["--format=custom", "--no-owner", "--no-acl", "--file", out],
    { env, stdio: ["ignore", "inherit", "inherit"], timeout, killSignal: "SIGTERM" },
  );
  if (!result.error && result.status === 0) process.exit(0);
  const why = result.error ? (result.error.code === "ETIMEDOUT" ? "pg_dump_timeout" : "pg_dump_failed") : `pg_dump_exit_${result.status}`;
  console.error(`${why} (tentativa ${i}/${attempts})`);
  if (i < attempts) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
}
process.exit(1);

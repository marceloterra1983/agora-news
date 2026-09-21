// pg_dump com nova tentativa. A base é remota (pooler): em 2026-09-21 o backup falhou duas
// vezes seguidas — ligação cortada a meio do COPY e, na repetição, estouro dos 5 min — e
// passou sozinho minutos depois. Um teto maior não cura ligação cortada; repetir cura os dois.
// Cada tentativa começa de um ficheiro limpo: um dump parcial nunca é aproveitado.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const url = new URL(process.env.DATABASE_URL);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.replace(/^\/+/, "")) || "postgres",
  PGSSLMODE: url.searchParams.get("sslmode") || "require",
  PGCONNECT_TIMEOUT: "30",
};
delete env.DATABASE_URL;

const bin = process.env.PG_DUMP_BIN || "pg_dump";
const attempts = Number(process.env.PG_DUMP_ATTEMPTS || 3);
const timeout = Number(process.env.PG_DUMP_TIMEOUT_MS || 300_000);
const waitMs = Number(process.env.PG_DUMP_RETRY_WAIT_MS || 60_000);
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

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { postgresPoolConfig } from "../src/lib/pg-ssl.mjs";

const require = createRequire(import.meta.url);
const ConnectionParameters = require("pg/lib/connection-parameters.js");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const supabaseLike =
  "postgresql://u:p%40ss@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true";

test("pg connectionString with uselibpqcompat disables certificate verify", () => {
  const raw = new ConnectionParameters({ connectionString: supabaseLike });
  assert.equal(raw.ssl.rejectUnauthorized, false);
});

test("postgresPoolConfig verifies remote certs and ignores uselibpqcompat", () => {
  const cfg = postgresPoolConfig(supabaseLike);
  assert.equal(cfg.connectionString, undefined);
  assert.equal(cfg.host, "aws-0-us-west-2.pooler.supabase.com");
  assert.equal(cfg.port, 5432);
  assert.equal(cfg.user, "u");
  assert.equal(cfg.password, "p@ss");
  assert.equal(cfg.database, "postgres");
  assert.equal(cfg.ssl.rejectUnauthorized, true);
  assert.match(cfg.ssl.ca, /BEGIN CERTIFICATE/);
  const params = new ConnectionParameters(cfg);
  assert.equal(params.ssl.rejectUnauthorized, true);
  assert.equal(params.ssl.ca, cfg.ssl.ca);
});

test("non-Supabase remotes verify against the public CA store", () => {
  const cfg = postgresPoolConfig(
    "postgres://u:p@ep-test.us-west-2.aws.neon.tech/neondb",
  );
  assert.deepEqual(cfg.ssl, { rejectUnauthorized: true });
});

test("loopback DATABASE_URL does not force TLS", () => {
  const cfg = postgresPoolConfig("postgres://news@127.0.0.1:5432/news");
  assert.equal(cfg.ssl, false);
  assert.equal(new ConnectionParameters(cfg).ssl, false);
});

test("db, auth and migrate Pools go through postgresPoolConfig", () => {
  for (const file of [
    "src/lib/db.ts",
    "src/lib/auth/server.ts",
    "scripts/migrate.mjs",
  ]) {
    const src = read(file);
    assert.match(src, /postgresPoolConfig/, file);
    assert.doesNotMatch(
      src,
      /new (?:pg\.)?Pool\(\s*\{\s*connectionString/,
      file,
    );
  }
  const df = read("Dockerfile");
  assert.match(df, /src\/lib\/pg-ssl\.mjs/);
  assert.match(df, /src\/lib\/supabase-ca-2021\.mjs/);
});

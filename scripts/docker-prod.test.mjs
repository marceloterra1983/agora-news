import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function composePath() {
  for (const name of ["compose.yml", "docker-compose.yml", "compose.yaml"]) {
    if (existsSync(join(root, name))) return name;
  }
  return null;
}

test("Dockerfile exists and is a production Nitro image", () => {
  assert.equal(existsSync(join(root, "Dockerfile")), true, "Dockerfile missing");
  const df = read("Dockerfile");
  assert.match(df, /FROM\s+node:22/);
  assert.match(df, /npx vite build|vite build/);
  assert.match(df, /\.output\/server\/index\.mjs/);
  assert.match(df, /EXPOSE\s+3080/);
  assert.match(df, /NITRO_PORT=3080|NITRO_PORT 3080/);
  assert.match(df, /USER\s+node/);
  const runLines = df
    .split("\n")
    .filter((line) => /^(RUN|CMD|ENTRYPOINT)\b/.test(line.trim()));
  assert.equal(
    runLines.some((line) => /vite\s+dev|npm run dev/.test(line)),
    false,
    "container start/build must not run vite dev",
  );
  assert.doesNotMatch(df, /8080/);
  assert.doesNotMatch(df, /CRON_SECRET|SUPABASE_SERVICE|VAPID_PRIVATE|DATABASE_URL=/);
});

test("compose publishes loopback 3080 only and mounts host .env", () => {
  const name = composePath();
  assert.ok(name, "compose.yml missing");
  const yml = read(name);
  assert.match(yml, /^\s+news:/m);
  assert.match(yml, /127\.0\.0\.1:3080:3080/);
  assert.match(yml, /env_file:[\s\S]*\.env/);
  assert.match(yml, /restart:\s*unless-stopped/);
  assert.doesNotMatch(yml, /8080/);
  assert.doesNotMatch(yml, /0\.0\.0\.0:3080/);
  assert.doesNotMatch(yml, /CRON_SECRET\s*:/);
});

test("package.json start is the documented Nitro node-server entry", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.start, "node .output/server/index.mjs");
  assert.doesNotMatch(pkg.scripts.start, /vite/);
});

test("dockerignore and gitignore keep .env off the image and out of git", () => {
  assert.equal(existsSync(join(root, ".dockerignore")), true);
  const dockerignore = read(".dockerignore");
  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^node_modules\/?$/m);
  const gitignore = read(".gitignore");
  assert.match(gitignore, /^\.env$/m);
});

test("tracked docker files do not contain secrets", () => {
  const tracked = ["Dockerfile", ".dockerignore", composePath(), "package.json"].filter(Boolean);
  for (const rel of tracked) {
    const src = read(rel);
    assert.doesNotMatch(src, /eyJ[A-Za-z0-9_-]{20,}/, `${rel} looks like a JWT`);
    assert.doesNotMatch(src, /CRON_SECRET=[^\s]+/, `${rel} inlines CRON_SECRET`);
  }
});

test("ingest cron still targets host loopback 3080", () => {
  const src = read("scripts/ingest-cron.sh");
  assert.match(src, /127\.0\.0\.1:3080\/api\/ingest/);
  assert.match(src, /Bearer \$\{CRON_SECRET\}/);
});

test("repo tree is not shipping a baked .env", () => {
  const names = readdirSync(root);
  assert.equal(names.includes(".env.production"), false);
  const example = read(".env.example");
  assert.doesNotMatch(example, /CRON_SECRET=.+/);
});

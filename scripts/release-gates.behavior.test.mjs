import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const now = Date.parse("2026-08-16T12:00:00.000Z");

let server;
let previousPublishableKey;
test.before(async () => {
  previousPublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_release_gate_test";
  server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
});
test.after(async () => {
  if (previousPublishableKey === undefined)
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = previousPublishableKey;
  await server?.close();
});

function atFixedTime(t) {
  const previous = Date.now;
  Date.now = () => now;
  t.after(() => {
    Date.now = previous;
  });
}

function mockPosts(t, replies) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("select"), "category,posted_at");
    assert.equal(url.searchParams.get("order"), "posted_at.desc");
    assert.equal(url.searchParams.get("limit"), "1");
    const category = url.searchParams.get("category");
    assert.ok(["eq.ai", "eq.tech", "eq.brasil"].includes(category));
    calls.push(category);
    const reply = replies[category];
    if (reply instanceof Error) throw reply;
    if (reply?.status) {
      return new Response(reply.body ?? null, { status: reply.status });
    }
    return Response.json(reply);
  };
  t.after(() => {
    globalThis.fetch = previous;
  });
  return calls;
}

async function healthResponse() {
  const mod = await server.ssrLoadModule("/src/routes/api/health.ts");
  return mod.Route.options.server.handlers.GET({});
}

test("health live is process-only", async (t) => {
  const previous = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error("liveness_must_not_fetch");
  };
  t.after(() => {
    globalThis.fetch = previous;
  });

  const mod = await server.ssrLoadModule("/src/routes/api/health.live.ts");
  const response = await mod.Route.options.server.handlers.GET({});

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(fetches, 0);
});

test("health reports fresh, stale, and empty sections", async (t) => {
  atFixedTime(t);
  const calls = mockPosts(t, {
    "eq.ai": [
      { category: "ai", posted_at: new Date(now - 60_000).toISOString() },
    ],
    "eq.tech": [
      { category: "tech", posted_at: new Date(now - 7_201_000).toISOString() },
    ],
    "eq.brasil": [],
  });

  const response = await healthResponse();
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.stale, true);
  assert.equal(body.supabase.postsOk, true);
  assert.deepEqual(body.sections, {
    ai: { state: "fresh", ageSec: 60 },
    tech: { state: "stale", ageSec: 7_201 },
    brasil: { state: "empty", ageSec: null },
  });
  assert.deepEqual(calls.sort(), ["eq.ai", "eq.brasil", "eq.tech"]);
});

test("health fails closed without exposing malformed or unavailable data", async (t) => {
  atFixedTime(t);
  mockPosts(t, {
    "eq.ai": [{ category: "ai", posted_at: "invalid" }],
    "eq.tech": { status: 503, body: "TOP_SECRET_UPSTREAM_BODY" },
    "eq.brasil": [
      { category: "brasil", posted_at: new Date(now - 30_000).toISOString() },
    ],
  });

  const response = await healthResponse();
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 503);
  assert.equal(body.stale, false);
  assert.equal(body.supabase.postsOk, false);
  assert.deepEqual(body.sections.ai, { state: "malformed", ageSec: null });
  assert.deepEqual(body.sections.tech, { state: "unavailable", ageSec: null });
  assert.doesNotMatch(serialized, /TOP_SECRET|post_id|summary|account/);
});

test("health rejects timestamps beyond the clock-skew tolerance", async (t) => {
  atFixedTime(t);
  mockPosts(t, {
    "eq.ai": [
      { category: "ai", posted_at: new Date(now + 61_000).toISOString() },
    ],
    "eq.tech": [
      { category: "tech", posted_at: new Date(now - 20_000).toISOString() },
    ],
    "eq.brasil": [
      { category: "brasil", posted_at: new Date(now - 30_000).toISOString() },
    ],
  });

  const response = await healthResponse();
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.stale, false);
  assert.deepEqual(body.sections.ai, { state: "malformed", ageSec: null });
});

test("health is ready only when every section is fresh", async (t) => {
  atFixedTime(t);
  mockPosts(t, {
    "eq.ai": [
      { category: "ai", posted_at: new Date(now - 10_000).toISOString() },
    ],
    "eq.tech": [
      { category: "tech", posted_at: new Date(now - 20_000).toISOString() },
    ],
    "eq.brasil": [
      { category: "brasil", posted_at: new Date(now - 30_000).toISOString() },
    ],
  });

  const response = await healthResponse();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.stale, false);
  assert.equal(body.supabase.postsOk, true);
});

test("Compose restarts only a dead process", () => {
  const compose = read("compose.yml");
  assert.match(compose, /\/api\/health\/live/);
  assert.match(compose, /r\.status===200/);
  assert.doesNotMatch(compose, /status===200\|\|r\.status===503/);
});

test("mandatory smoke failures cannot become skips", async (t) => {
  const previous = process.env.CI_REQUIRED_SMOKES;
  t.after(() => {
    if (previous === undefined) delete process.env.CI_REQUIRED_SMOKES;
    else process.env.CI_REQUIRED_SMOKES = previous;
  });
  const { unavailable } = await import(
    `./required-smoke.mjs?gate=${Math.random()}`
  );
  let skipped = "";

  delete process.env.CI_REQUIRED_SMOKES;
  unavailable({ skip: (message) => (skipped = message) }, "server missing");
  assert.equal(skipped, "server missing");

  process.env.CI_REQUIRED_SMOKES = "1";
  assert.throws(
    () =>
      unavailable(
        { skip: () => assert.fail("must not skip") },
        "browser missing",
      ),
    /browser missing/,
  );
});

test("all optional browser and live smokes share the mandatory gate", () => {
  for (const path of [
    "scripts/fontes-smoke.test.mjs",
    "scripts/mobile-ssr-viewport.test.mjs",
    "scripts/mobile-type-scale.test.mjs",
    "scripts/fixed-chrome.test.mjs",
  ]) {
    const source = read(path);
    assert.match(source, /required-smoke\.mjs/, path);
    assert.doesNotMatch(source, /\bt\.skip\(/, path);
  }
  assert.match(read("scripts/fontes-smoke.test.mjs"), /\/api\/health\/live/);
  assert.match(
    read("scripts/mobile-ssr-viewport.test.mjs"),
    /\/api\/health\/live/,
  );
});

test("CI proves Nitro and Docker artifacts with mandatory Chromium smokes", () => {
  const workflow = read(".github/workflows/ci.yml");
  const releaseSmoke = existsSync(join(root, "scripts/ci-release-smoke.sh"))
    ? read("scripts/ci-release-smoke.sh")
    : "";
  const delivery = `${workflow}\n${releaseSmoke}`;
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(delivery, /playwright install --with-deps chromium/);
  assert.match(delivery, /npm run build/);
  assert.match(delivery, /\.output\/server\/index\.mjs/);
  assert.match(delivery, /CI_REQUIRED_SMOKES=1/);
  assert.match(delivery, /docker build/);
  assert.match(delivery, /docker run/);
  assert.doesNotMatch(releaseSmoke, /docker run --rm/);
  assert.match(delivery, /\/api\/health\/live/);
  assert.match(delivery, /\/api\/health(?:[^/]|$)/);
  assert.match(releaseSmoke, /trap cleanup EXIT/);
  assert.match(releaseSmoke, /trap 'exit 130' INT/);
  assert.match(releaseSmoke, /trap 'exit 143' TERM/);
  assert.match(releaseSmoke, /assert_port_free 3901/);
  assert.match(releaseSmoke, /assert_port_free 3180/);
  assert.match(releaseSmoke, /assert_port_free 3181/);
  assert.match(releaseSmoke, /kill -0 "\$pid"/);
  assert.match(releaseSmoke, /docker inspect .*\.State\.Running/);
  assert.match(
    releaseSmoke,
    /wait_for_process_200 "\$NITRO_URL\/api\/health\/live" "\$nitro_pid"/,
  );
  assert.match(
    releaseSmoke,
    /wait_for_container_200 "\$DOCKER_URL\/api\/health\/live" "\$container_id"/,
  );
});

test("lint rejects every warning", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.lint, "eslint . --max-warnings=0");
});

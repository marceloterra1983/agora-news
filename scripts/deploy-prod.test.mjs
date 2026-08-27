import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("deploy-prod.sh is the host Docker cutover without migrate or .env dump", () => {
  const src = read("scripts/deploy-prod.sh");
  assert.match(src, /set -euo pipefail/);
  assert.match(src, /docker compose build news/);
  assert.match(src, /NEWS_IMAGE_TAG/);
  assert.match(src, /\{\{\.Config\.Image\}\} \{\{\.State\.Health\.Status\}\}/);
  assert.match(src, /news-news:\$\{HEAD\} healthy/);
  assert.match(src, /api\/health\/live/);
  assert.match(src, /fontes\?secao=ai/);
  assert.match(src, /news\.automatizems\.com/);
  assert.doesNotMatch(src, /db:migrate/);
  assert.doesNotMatch(src, /cat \.env|printenv|xargs/);
});

test("Always land then deploy-prod.sh", () => {
  const agents = read("AGENTS.md");
  const rule = read(".cursor/rules/auto-deploy.mdc");
  const pkg = JSON.parse(read("package.json"));
  assert.match(agents, /Always/);
  assert.match(agents, /deploy-prod\.sh/);
  assert.doesNotMatch(agents, /Ask first:.*\bdeploy\b/);
  assert.match(rule, /deploy-prod\.sh/);
  assert.equal(pkg.scripts["deploy:prod"], "bash scripts/deploy-prod.sh");
});

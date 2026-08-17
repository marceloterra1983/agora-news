import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

test("host cron logs have a native rotation policy", () => {
  const policyPath = join(root, "ops/logrotate/agora-news");
  assert.equal(existsSync(policyPath), true);
  const policy = readFileSync(policyPath, "utf8");
  assert.match(policy, /\/home\/marce\/backups\/news\/\*-cron\.log/);
  assert.match(policy, /cron-alerts\.log/);
  assert.match(policy, /daily/);
  assert.match(policy, /rotate\s+14/);
  assert.match(policy, /(?:size|maxsize)\s+10M/);
  assert.match(policy, /compress/);
  assert.match(policy, /copytruncate/);
  assert.match(policy, /missingok/);
  assert.match(policy, /notifempty/);
});

test("production snapshots include the schedule and alert wrapper", () => {
  const script = readFileSync(join(root, "scripts/backup-production.sh"), "utf8");
  assert.match(script, /cron-alert-wrap\.sh/);
  assert.match(script, /crontab -l/);
  assert.match(script, /cron-alert-wrap\.sh.*cron-alert-wrap\.sh|cron-alert-wrap\.sh/s);
  assert.match(script, /backup-summary\.txt/);
});

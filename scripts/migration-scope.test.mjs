import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "migrations");

test("Supabase index SQL lives next to scripts, not in migrations/", () => {
  const src = readFileSync(join(root, "scripts/supabase-posts-indexes.sql"), "utf8");
  assert.match(src, /posts_feed_ai_posted/);
  assert.match(src, /NÃO vai em migrations/);
  const domain = readFileSync(join(root, "scripts/supabase-domain-tables.sql"), "utf8");
  assert.match(domain, /x_profiles/);
  assert.match(domain, /user_watches/);
  assert.match(domain, /user_prefs/);
  assert.match(domain, /push_subscriptions/);
  assert.match(domain, /NÃO vai em migrations/);
});

test("Neon/PGLite migrations do not touch Supabase public.posts", () => {
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const src = readFileSync(join(dir, name), "utf8");
    assert.doesNotMatch(
      src,
      /public\.posts/i,
      `${name} is applied to Neon/PGLite; Supabase posts SQL must live outside migrations/`,
    );
  }
});

/** A1 sombra: busca amostra read-only de posts reais (chave publishable, só SELECT). */
const outIdx = process.argv.indexOf("--out");
const out = outIdx >= 0 ? process.argv[outIdx + 1] : "/tmp/jev-a1-sample.json";
const N = 50;

const base =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://uqcaodtgrkphuhdkchyh.supabase.co";
const key = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
if (!key) {
  console.error("missing SUPABASE_PUBLISHABLE_KEY (rode com: cofre run news -- node ...)");
  process.exit(2);
}

const sel = "post_id,account,posted_at,content,translation_pt,summary_pt,category,source";
const url = `${base}/rest/v1/posts?select=${sel}&order=posted_at.desc&limit=200`;
const res = await fetch(url, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  signal: AbortSignal.timeout(20_000),
});
if (!res.ok) {
  console.error(`fetch_http_${res.status}: ${await res.text()}`);
  process.exit(1);
}
const all = await res.json();
const withText = all.filter((r) => String(r.translation_pt || r.content || "").trim().length > 20);
// Diversifica fontes: round-robin x/rss/youtube até N.
const bySource = new Map();
for (const r of withText) {
  const s = String(r.source || "x");
  if (!bySource.has(s)) bySource.set(s, []);
  bySource.get(s).push(r);
}
const sample = [];
const pools = [...bySource.values()];
let i = 0;
while (sample.length < N && pools.some((p) => p.length)) {
  const pool = pools[i % pools.length];
  if (pool.length) sample.push(pool.shift());
  i += 1;
}
const { writeFile, mkdir } = await import("node:fs/promises");
const { dirname } = await import("node:path");
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(sample, null, 1), "utf8");
const mix = sample.reduce((m, r) => ((m[r.source || "x"] = (m[r.source || "x"] || 0) + 1), m), {});
console.log(`sample=${sample.length} mix=${JSON.stringify(mix)} -> ${out}`);

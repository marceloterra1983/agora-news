/**
 * A1 sombra: julga a amostra com o Jev oficial e grava JSONL.
 * Rode com: cofre run typesafe -- node scripts/jev-a1-judge-sample.mjs --in ... --out ...
 * (a chave vem do ambiente; nunca é impressa nem gravada).
 */
import { judgePosts } from "../src/lib/news/ingest-judge.ts";

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
};
const inPath = arg("--in", "/tmp/jev-a1-sample.json");
const outPath = arg("--out", "/tmp/jev-a1-shadow.jsonl");

const { readFile, writeFile, mkdir } = await import("node:fs/promises");
const { dirname } = await import("node:path");
const sample = JSON.parse(await readFile(inPath, "utf8"));
const rows = sample.map((r) => ({
  post_id: String(r.post_id),
  account: String(r.account || ""),
  category: String(r.category || ""),
  source: String(r.source || "x"),
  content: String(r.content || ""),
  translation_pt: String(r.translation_pt || ""),
  summary_pt: String(r.summary_pt || ""),
  ...(String(r.source || "").toLowerCase() === "rss" ? { title: String(r.summary_pt || "") } : {}),
}));

const lines = [];
const judgments = await judgePosts(rows, {
  sink: async (ls) => lines.push(...ls),
});
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, lines.join("\n") + "\n", "utf8");

const ok = judgments.filter((j) => !j.error);
const bands = { high: 0, mid: 0, low: 0 };
const kinds = {};
let msSum = 0;
for (const j of ok) {
  if (j.band) bands[j.band] += 1;
  if (j.kind) kinds[j.kind] = (kinds[j.kind] || 0) + 1;
  msSum += j.ms;
}
const errs = judgments.filter((j) => j.error).length;
const n = judgments.length || 1;
// Sistema hoje: tudo fica visível (feed sem filtro de qualidade; push por watch).
// Concordância = fração que o Jev manteria visível (mid+high); ruído = low.
console.log(`n=${judgments.length} erros=${errs} ms_medio=${ok.length ? Math.round(msSum / ok.length) : 0}`);
console.log(`bandas=${JSON.stringify(bands)} kinds=${JSON.stringify(kinds)}`);
console.log(`ruido_low=${((bands.low / n) * 100).toFixed(1)}% push_elegivel_high=${((bands.high / n) * 100).toFixed(1)}%`);
console.log(`concordancia_com_sistema_atual=${(((bands.high + bands.mid) / n) * 100).toFixed(1)}%`);
console.log(`jsonl -> ${outPath}`);

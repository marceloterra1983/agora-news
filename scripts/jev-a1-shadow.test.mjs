import assert from "node:assert/strict";
import test from "node:test";
import {
  JEV_A1_CONCURRENCY,
  JEV_A1_MODEL,
  JEV_A1_STATE_CHARS,
  JEV_A1_TIMEOUT_MS,
  buildJudgeState,
  judgePosts,
  newsBand,
} from "../src/lib/news/ingest-judge.ts";

const row = (over = {}) => ({
  post_id: "123",
  account: "g1",
  category: "política",
  source: "x",
  content: "conteúdo original",
  translation_pt: "tradução em português",
  summary_pt: "resumo",
  ...over,
});

const okFetch = (answers) => async () => ({
  status: 200,
  text: async () => JSON.stringify({ answers, model: JEV_A1_MODEL }),
});

test("state tem source/account/section/post e corta em 1500 chars", () => {
  const state = buildJudgeState(row({ translation_pt: "x".repeat(2000) }));
  assert.match(state, /source: x/);
  assert.match(state, /account: g1/);
  assert.match(state, /section: política/);
  const post = state.split("post: ")[1];
  assert.equal(post.length, JEV_A1_STATE_CHARS);
});

test("state prefere tradução e inclui title/summary no RSS", () => {
  const x = buildJudgeState(row());
  assert.match(x, /post: tradução em português/);
  const rss = buildJudgeState(
    row({ source: "rss", title: "Título", translation_pt: "Resumo cheio", summary_pt: "Título" }),
  );
  assert.match(rss, /title: Título/);
  assert.match(rss, /summary: Resumo cheio/);
});

test("faixas: >=0.80 alta, 0.40–0.80 média, <0.40 baixa", () => {
  assert.equal(newsBand(0.95), "high");
  assert.equal(newsBand(0.8), "high");
  assert.equal(newsBand(0.79), "mid");
  assert.equal(newsBand(0.4), "mid");
  assert.equal(newsBand(0.39), "low");
  assert.equal(newsBand(null), null);
  assert.equal(newsBand(Number.NaN), null);
});

test("judgePosts grava sombra com banda/kind e não decide nada", async () => {
  const lines = [];
  const [j] = await judgePosts([row()], {
    apiKey: "k",
    fetchImpl: okFetch({
      q_news: { noul: 0.9, confidence: 0.8 },
      q_kind: { choice: "k1", probabilities: { k1: 0.7, k2: 0.2 }, confidence: 0.7 },
    }),
    sink: async (ls) => lines.push(...ls),
  });
  assert.equal(j.p_news, 0.9);
  assert.equal(j.band, "high");
  assert.equal(j.kind, "k1");
  assert.equal(j.engine, "jev");
  assert.equal(j.model, JEV_A1_MODEL);
  assert.equal(j.error, undefined);
  assert.equal(lines.length, 1);
  const logged = JSON.parse(lines[0]);
  assert.equal(logged.post_id, "123");
  assert.equal(logged.band, "high");
});

test("RSS com p_summary_adds baixo marca use_title_as_summary", async () => {
  const [j] = await judgePosts(
    [row({ source: "rss", title: "T", translation_pt: "S", summary_pt: "T" })],
    {
      apiKey: "k",
      fetchImpl: okFetch({
        q_news: { noul: 0.5 },
        q_kind: { choice: "k2", probabilities: { k2: 0.6 }, confidence: 0.6 },
        q_summary_adds: { noul: 0.1 },
      }),
      sink: async () => {},
    },
  );
  assert.equal(j.p_summary_adds, 0.1);
  assert.equal(j.use_title_as_summary, true);
});

test("X não tem q_summary_adds", async () => {
  let sentBody = null;
  const [j] = await judgePosts([row()], {
    apiKey: "k",
    fetchImpl: async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { status: 200, text: async () => JSON.stringify({ answers: { q_news: { noul: 0.2 }, q_kind: { choice: "k4" } } }) };
    },
    sink: async () => {},
  });
  assert.ok(!("q_summary_adds" in sentBody.questions));
  assert.equal(j.band, "low");
  assert.equal(j.use_title_as_summary, null);
});

test("fail-open: HTTP 500, timeout e sem chave viram error, nunca throw", async () => {
  const http500 = await judgePosts([row()], {
    apiKey: "k",
    fetchImpl: async () => ({ status: 500, text: async () => "err" }),
    sink: async () => { throw new Error("sink quebrou"); },
  });
  assert.match(http500[0].error, /jev_http_500/);

  const hanging = () =>
    new Promise((_res, rej) => {
      const e = new Error("aborted");
      e.name = "AbortError";
      rej(e);
    });
  const timed = await judgePosts([row()], {
    apiKey: "k",
    fetchImpl: hanging,
    sink: async () => {},
  });
  assert.equal(timed[0].error, "jev_timeout");

  const noKey = await judgePosts([row()], { apiKey: "", sink: async () => {} });
  assert.equal(noKey[0].error, "missing_key");
  assert.equal(noKey[0].p_news, null);
});

test("modelo fixo, timeout ≤2s e concorrência 8", () => {
  assert.equal(JEV_A1_MODEL, "jev-1.13.0");
  assert.ok(JEV_A1_TIMEOUT_MS <= 2000);
  assert.equal(JEV_A1_CONCURRENCY, 8);
});

test("q_kind rejeita opção fora do vocabulário", async () => {
  const [j] = await judgePosts([row()], {
    apiKey: "k",
    fetchImpl: okFetch({ q_news: { noul: 0.6 }, q_kind: { choice: "yes" } }),
    sink: async () => {},
  });
  assert.equal(j.kind, null);
  assert.equal(j.band, "mid");
});

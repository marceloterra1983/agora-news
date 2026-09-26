import assert from "node:assert/strict";
import { createServer } from "node:http";
import { connect } from "node:net";
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

/**
 * Garante que o tráfego aos servidores fake locais (127.0.0.1) não passe por
 * proxy de ambiente (NODE_USE_ENV_PROXY=1/HTTP_PROXY): sem isso o proxy
 * devolve 502 e o teste exercita o proxy, não o timeout/retry.
 */
async function withLocalNoProxy(fn) {
  const prevUpper = process.env.NO_PROXY;
  const prevLower = process.env.no_proxy;
  const add = "127.0.0.1,localhost";
  process.env.NO_PROXY = prevUpper ? `${prevUpper},${add}` : add;
  process.env.no_proxy = prevLower ? `${prevLower},${add}` : add;
  try {
    return await fn();
  } finally {
    if (prevUpper === undefined) delete process.env.NO_PROXY;
    else process.env.NO_PROXY = prevUpper;
    if (prevLower === undefined) delete process.env.no_proxy;
    else process.env.no_proxy = prevLower;
  }
}
const directFetch = (url, opts = {}) =>
  new Promise((resolve, reject) => {
    // TCP cru via node:net — nenhum proxy de ambiente (NODE_USE_ENV_PROXY=1 /
    // HTTP_PROXY) é consultado: o socket conecta direto no 127.0.0.1. Nem
    // node:http nem o fetch global servem aqui (ambos honram o proxy do env;
    // e NO_PROXY mutado em runtime não tem efeito, o Node o lê no startup).
    const target = new URL(String(url));
    const body = opts.body ? String(opts.body) : "";
    const headers = {
      Host: target.host,
      Connection: "close",
      ...(opts.headers ?? {}),
    };
    if (body) headers["Content-Length"] = Buffer.byteLength(body);
    const head =
      `${opts.method ?? "GET"} ${target.pathname}${target.search} HTTP/1.1\r\n` +
      Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n") +
      "\r\n\r\n";
    let settled = false;
    const done = (fn, v) => {
      if (!settled) {
        settled = true;
        fn(v);
      }
    };
    let buf = "";
    const socket = connect(
      { host: target.hostname, port: Number(target.port) || 80 },
      () => socket.write(head + body),
    );
    socket.setEncoding("utf8");
    socket.on("data", (c) => {
      buf += c;
    });
    socket.on("close", () => {
      const idx = buf.indexOf("\r\n\r\n");
      const headText = idx >= 0 ? buf.slice(0, idx) : buf;
      let text = idx >= 0 ? buf.slice(idx + 4) : "";
      const status = Number.parseInt(headText.split(" ", 3)[1], 10);
      const headers = Object.fromEntries(
        headText
          .split("\r\n")
          .slice(1)
          .map((line) => {
            const colon = line.indexOf(":");
            return colon < 0
              ? [line.toLowerCase(), ""]
              : [line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()];
          }),
      );
      if (/chunked/i.test(headers["transfer-encoding"] ?? "")) {
        let out = "";
        let rest = text;
        for (;;) {
          const eol = rest.indexOf("\r\n");
          if (eol < 0) break;
          const size = Number.parseInt(rest.slice(0, eol).split(";")[0].trim(), 16);
          if (!Number.isFinite(size) || size === 0) break;
          out += rest.slice(eol + 2, eol + 2 + size);
          rest = rest.slice(eol + 2 + size + 2);
        }
        text = out;
      }
      done(resolve, { status, text: async () => text });
    });
    socket.on("error", (err) => done(reject, err));
    const signal = opts.signal;
    if (signal) {
      if (signal.aborted) {
        socket.destroy(signal.reason);
        return;
      }
      signal.addEventListener("abort", () => socket.destroy(signal.reason), { once: true });
    }
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

test("timeout real: servidor que não responde aborta em timeoutMs", async () => {
  await withLocalNoProxy(async () => {
    const server = createServer(() => {
      // Nunca responde: o AbortSignal.timeout precisa abortar sozinho.
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    try {
      const t0 = Date.now();
      const [j] = await judgePosts([row()], {
        apiKey: "k",
        baseUrl: `http://127.0.0.1:${port}`,
        timeoutMs: 100,
        fetchImpl: directFetch,
        sink: async () => {},
      });
      const elapsed = Date.now() - t0;
      assert.equal(j.error, "jev_timeout");
      assert.equal(j.p_news, null);
      assert.ok(elapsed < 1000, `deveria abortar rápido, levou ${elapsed}ms`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

test("retry 429: segunda tentativa 200 vira julgamento ok", async () => {
  await withLocalNoProxy(async () => {
    let calls = 0;
    const server = createServer((req, res) => {
      calls += 1;
      if (calls === 1) {
        res.writeHead(429, { "Content-Type": "text/plain" });
        res.end("rate limited");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          answers: {
            q_news: { noul: 0.9, confidence: 0.8 },
            q_kind: { choice: "k1", probabilities: { k1: 0.7 }, confidence: 0.7 },
          },
          model: JEV_A1_MODEL,
        }),
      );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    try {
      const [j] = await judgePosts([row()], {
        apiKey: "k",
        baseUrl: `http://127.0.0.1:${port}`,
        fetchImpl: directFetch,
        sink: async () => {},
      });
      assert.equal(calls, 2);
      assert.equal(j.error, undefined);
      assert.equal(j.p_news, 0.9);
      assert.equal(j.band, "high");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

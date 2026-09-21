import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStoredTranslation,
  chromeSourceIsPt,
  isConfirmedPt,
  parseChrome,
  pickStoredPt,
  resetTranslateSkip,
  translateToPt,
} from "../src/lib/news/translate-pt.mjs";

const EN = "You can now create new web apps with Cursor, store the code with Origin, and deploy to Vercel.";
const PT = "Agora você pode criar novos aplicativos web com o Cursor, guardar o código no Origin e publicar na Vercel.";

test("pickStoredPt keeps Portuguese and drops English fail-open", () => {
  assert.equal(pickStoredPt(EN, PT), PT);
  assert.equal(pickStoredPt(EN, EN), "");
  assert.equal(pickStoredPt(EN, ""), "");
  assert.equal(pickStoredPt("já está em português.", "já está em português."), "já está em português.");
});

test("applyStoredTranslation never copies English into translation_pt", () => {
  assert.deepEqual(applyStoredTranslation(EN, EN), {
    translation_pt: "",
    summary_pt: EN,
  });
  const stored = applyStoredTranslation(EN, PT);
  assert.equal(stored.translation_pt, PT);
  assert.ok(stored.summary_pt.startsWith("Agora você pode"));
});

test("parseChrome reads dict-chrome-ex segments", () => {
  assert.equal(parseChrome([["Roubar carros no GTA 6.", "en"]]), "Roubar carros no GTA 6.");
  assert.equal(parseChrome(null), "");
});

test("Chrome client returns Portuguese before GTX or MyMemory", async (t) => {
  resetTranslateSkip();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    resetTranslateSkip();
  });
  const hits = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    hits.push(url);
    if (url.includes("clients5.google.com")) {
      return Response.json([[PT, "en"]]);
    }
    return new Response("nope", { status: 500 });
  };
  assert.equal(await translateToPt(EN, { timeout: 200 }), PT);
  assert.ok(hits.some((u) => u.includes("clients5.google.com")));
  assert.equal(hits.some((u) => u.includes("mymemory.translated.net")), false);
});

test("malformed GTX payload does not return the English original", async (t) => {
  resetTranslateSkip();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    resetTranslateSkip();
  });
  globalThis.fetch = async () => Response.json({});
  let failures = 0;
  assert.equal(await translateToPt(EN, { onFail: () => { failures += 1; } }), "");
  assert.ok(failures >= 1);
});

test("GTX 429 falls back to MyMemory Portuguese", async (t) => {
  resetTranslateSkip();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  const hits = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    hits.push(url);
    if (url.includes("translate.googleapis.com")) {
      return new Response("Sorry...", { status: 429 });
    }
    if (url.includes("mymemory.translated.net")) {
      return Response.json({
        responseData: { translatedText: PT },
        quotaFinished: false,
      });
    }
    return new Response("nope", { status: 500 });
  };
  assert.equal(await translateToPt(EN, { timeout: 200 }), PT);
  assert.ok(hits.some((u) => u.includes("translate.googleapis.com")));
  assert.ok(hits.some((u) => u.includes("mymemory.translated.net")));
});

test("LibreTranslate wins after GTX fail when URL is set", async (t) => {
  resetTranslateSkip();
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.LIBRETRANSLATE_URL;
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousUrl == null) delete process.env.LIBRETRANSLATE_URL;
    else process.env.LIBRETRANSLATE_URL = previousUrl;
  });
  process.env.LIBRETRANSLATE_URL = "http://opus-mt:5000";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("translate.googleapis.com")) return new Response("no", { status: 429 });
    if (url.includes("opus-mt") && url.includes("/translate")) {
      return Response.json({ translatedText: PT });
    }
    return new Response("nope", { status: 500 });
  };
  assert.equal(await translateToPt(EN, { timeout: 200 }), PT);
});

test("Portuguese text is returned without calling the network", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("no", { status: 500 });
  };
  assert.equal(await translateToPt("uma pesquisa para os dados"), "uma pesquisa para os dados");
  assert.equal(calls, 0);
});

test("short Portuguese without accents is kept as-is when Google detects pt", async (t) => {
  resetTranslateSkip();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    resetTranslateSkip();
  });
  const SHORT_PT = "Charge do Aroeira";
  const hits = [];
  let fails = 0;
  globalThis.fetch = async (input) => {
    hits.push(String(input));
    return Response.json([[SHORT_PT, "pt"]]);
  };
  assert.equal(pickStoredPt(SHORT_PT, SHORT_PT), "", "heuristic alone still rejects it");
  assert.equal(await translateToPt(SHORT_PT, { timeout: 200, onFail: () => fails++ }), SHORT_PT);
  assert.equal(fails, 0);
  assert.equal(hits.length, 1, "no fallback provider is consulted");
  assert.equal(applyStoredTranslation(SHORT_PT, SHORT_PT).translation_pt, SHORT_PT);
  assert.equal(pickStoredPt(EN, EN), "", "English echo is still dropped");
});

test("chromeSourceIsPt needs every segment detected as pt", () => {
  assert.equal(chromeSourceIsPt([["Caiu na Rede!", "pt"]]), true);
  assert.equal(chromeSourceIsPt([["a", "pt-BR"], ["b", "pt"]]), true);
  assert.equal(chromeSourceIsPt([["As ações caíram.", "en"]]), false);
  assert.equal(chromeSourceIsPt([["a", "pt"], ["b", "en"]]), false);
  assert.equal(chromeSourceIsPt(["texto"]), false);
  assert.equal(chromeSourceIsPt(null), false);
});

test("only Google confirms a Portuguese source; another provider's echo does not", async (t) => {
  resetTranslateSkip();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    resetTranslateSkip();
  });
  const ECHO = "Voo para Lisboa com escala";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("clients5.google.com")) return new Response("nope", { status: 500 });
    if (url.includes("translate.googleapis.com")) return Response.json([[[ECHO + " para voce", ECHO]], null, "en"]);
    return new Response("nope", { status: 500 });
  };
  await translateToPt(ECHO, { timeout: 200 });
  assert.equal(isConfirmedPt(ECHO), false);

  const MULTI = "Charge do Aroeira. ".repeat(12).trim();
  globalThis.fetch = async (input) => {
    const q = new URL(String(input)).searchParams.get("q");
    return Response.json([[q, "pt"]]);
  };
  assert.equal(await translateToPt(MULTI, { timeout: 200, chunk: 60 }), MULTI);
  assert.equal(isConfirmedPt(MULTI), true);
});

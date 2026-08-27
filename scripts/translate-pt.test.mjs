import assert from "node:assert/strict";
import test from "node:test";
import { applyStoredTranslation, pickStoredPt, translateToPt } from "../src/lib/news/translate-pt.mjs";

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

test("malformed GTX payload does not return the English original", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  globalThis.fetch = async () => Response.json({});
  let failures = 0;
  assert.equal(await translateToPt(EN, { onFail: () => { failures += 1; } }), "");
  assert.ok(failures >= 1);
});

test("GTX 429 falls back to MyMemory Portuguese", async (t) => {
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

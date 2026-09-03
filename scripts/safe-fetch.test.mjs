import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeRssFetchUrl,
  isPrivateIp,
  safeRssFetch,
} from "../src/lib/news/safe-fetch.ts";

test("isPrivateIp identifies private and loopback ranges", () => {
  assert.equal(isPrivateIp("127.0.0.1"), true);
  assert.equal(isPrivateIp("127.255.0.1"), true);
  assert.equal(isPrivateIp("10.0.0.5"), true);
  assert.equal(isPrivateIp("172.16.0.1"), true);
  assert.equal(isPrivateIp("172.31.255.254"), true);
  assert.equal(isPrivateIp("192.168.1.100"), true);
  assert.equal(isPrivateIp("169.254.169.254"), true);
  assert.equal(isPrivateIp("0.0.0.0"), true);
  assert.equal(isPrivateIp("::1"), true);
  assert.equal(isPrivateIp("fe80::1"), true);
  assert.equal(isPrivateIp("fc00::1"), true);

  // Public IPs
  assert.equal(isPrivateIp("1.1.1.1"), false);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isPrivateIp("93.184.216.34"), false);
});

test("assertSafeRssFetchUrl blocks dangerous schemes, credentials, ports and hosts", async () => {
  await assert.rejects(
    () => assertSafeRssFetchUrl("http://example.com/rss.xml"),
    /rss_https_only/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("ftp://example.com/rss.xml"),
    /rss_https_only/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://admin:pass@example.com/rss.xml"),
    /rss_url_invalid/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://example.com:8080/rss.xml"),
    /rss_port_denied/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://localhost/rss.xml"),
    /rss_host_denied/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://foo.localhost/rss.xml"),
    /rss_host_denied/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://127.0.0.1/rss.xml"),
    /rss_ip_denied/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://169.254.169.254/rss.xml"),
    /rss_ip_denied/,
  );
  await assert.rejects(
    () => assertSafeRssFetchUrl("https://10.1.1.1/rss.xml"),
    /rss_ip_denied/,
  );
});

test("assertSafeRssFetchUrl passes valid public HTTPS urls", async () => {
  const url = "https://openai.com/news/rss.xml";
  const ok = await assertSafeRssFetchUrl(url);
  assert.equal(ok, url);
});

test("safeRssFetch rejects redirects to private targets", async () => {
  // Mock fetch simulating 302 redirect to metadata endpoint
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (String(url).includes("redirector")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://127.0.0.1/api/health" },
        });
      }
      return new Response("ok", { status: 200 });
    };

    await assert.rejects(
      () => safeRssFetch("https://openai.com/redirector"),
      /rss_ip_denied/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

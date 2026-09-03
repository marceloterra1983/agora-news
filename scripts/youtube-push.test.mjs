import assert from "node:assert/strict";
import test from "node:test";
import { cleanSub } from "../src/lib/news/push-core.mjs";

test("cleanSub accepts Twitter handles, RSS accounts, and YouTube accounts", () => {
  const sub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/sample-token-123",
    keys: { p256dh: "key-123", auth: "auth-456" },
    handles: [
      "@OpenAI",
      "r_123456789012",
      "y_abcdef123456",
      "UCXZCJLdBC09xxGZ6gcdrc6A",
      "invalid handle with spaces!",
    ],
  };

  const cleaned = cleanSub(sub);
  assert.ok(cleaned);
  assert.ok(cleaned.handles.includes("openai"));
  assert.ok(cleaned.handles.includes("r_123456789012"));
  assert.ok(cleaned.handles.includes("y_abcdef123456"));
  assert.ok(cleaned.handles.includes("ucxzcjldbc09xxgz6gcdrc6a"));
  assert.equal(cleaned.handles.includes("invalid handle with spaces!"), false);
});

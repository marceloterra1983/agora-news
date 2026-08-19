import assert from "node:assert/strict";
import test from "node:test";
import {
  IMPRESSION_MS,
  IMPRESSION_RATIO,
  SINCE_KEY,
  UNREAD_TTL_MS,
  getUnreadSince,
  impressionReady,
  isUnread,
  isUnreadNow,
  markRead,
  noteFirstUnread,
  resetUnread,
  seedBaseline,
} from "../src/lib/news/unread.ts";

const HOUR = 60 * 60 * 1000;

function installStorage() {
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
  globalThis.window = {
    localStorage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  return store;
}

test("isUnreadNow requires baseline and ignores read or baseline ids", () => {
  const now = 1_000_000;
  assert.equal(
    isUnreadNow({
      hasBaseline: false,
      inRead: false,
      inBaseline: false,
      firstUnreadAt: null,
      now,
    }),
    false,
  );
  assert.equal(
    isUnreadNow({
      hasBaseline: true,
      inRead: true,
      inBaseline: false,
      firstUnreadAt: null,
      now,
    }),
    false,
  );
  assert.equal(
    isUnreadNow({
      hasBaseline: true,
      inRead: false,
      inBaseline: true,
      firstUnreadAt: null,
      now,
    }),
    false,
  );
  assert.equal(
    isUnreadNow({
      hasBaseline: true,
      inRead: false,
      inBaseline: false,
      firstUnreadAt: null,
      now,
    }),
    true,
  );
});

test("isUnreadNow expires at 12h and stays unread if the clock went backwards", () => {
  const first = 10 * HOUR;
  assert.equal(
    isUnreadNow({
      hasBaseline: true,
      inRead: false,
      inBaseline: false,
      firstUnreadAt: first,
      now: first + UNREAD_TTL_MS - 1,
    }),
    true,
  );
  assert.equal(
    isUnreadNow({
      hasBaseline: true,
      inRead: false,
      inBaseline: false,
      firstUnreadAt: first,
      now: first + UNREAD_TTL_MS,
    }),
    false,
  );
  assert.equal(
    isUnreadNow({
      hasBaseline: true,
      inRead: false,
      inBaseline: false,
      firstUnreadAt: first,
      now: first - 5_000,
    }),
    true,
  );
});

test("impressionReady needs visible ratio and dwell", () => {
  assert.equal(
    impressionReady({
      ratio: IMPRESSION_RATIO,
      visible: true,
      elapsedMs: IMPRESSION_MS,
    }),
    true,
  );
  assert.equal(
    impressionReady({
      ratio: IMPRESSION_RATIO - 0.01,
      visible: true,
      elapsedMs: IMPRESSION_MS,
    }),
    false,
  );
  assert.equal(
    impressionReady({
      ratio: IMPRESSION_RATIO,
      visible: false,
      elapsedMs: IMPRESSION_MS,
    }),
    false,
  );
  assert.equal(
    impressionReady({
      ratio: IMPRESSION_RATIO,
      visible: true,
      elapsedMs: IMPRESSION_MS - 1,
    }),
    false,
  );
});

test("noteFirstUnread records now; markRead drops the timestamp; reset clears all keys", () => {
  const store = installStorage();
  seedBaseline(["old"]);
  noteFirstUnread(["fresh"], 50_000);
  assert.equal(getUnreadSince().get("fresh"), 50_000);
  assert.equal(isUnread("fresh", 50_000), true);
  markRead("fresh");
  assert.equal(getUnreadSince().has("fresh"), false);
  assert.equal(isUnread("fresh", 50_000), false);
  resetUnread();
  assert.equal(store.get(SINCE_KEY), "{}");
  assert.equal(isUnread("fresh", 50_000), false);
});

test("unread-since evicts the oldest timestamp after 500 entries", () => {
  installStorage();
  seedBaseline(["old"]);
  const ids = Array.from({ length: 501 }, (_, i) => `n${i}`);
  noteFirstUnread(ids, 1_000);
  const since = getUnreadSince();
  assert.equal(since.size, 500);
  assert.equal(since.has("n0"), false);
  assert.equal(since.has("n500"), true);
});

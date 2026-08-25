import assert from "node:assert/strict";
import test from "node:test";
import {
  accountInFilter,
  accountsForQuery,
} from "../src/lib/news/account-in-filter.mjs";

test("accountInFilter keeps a 14-char RSS r_ handle", () => {
  const handle = "r_bea4293d5edd";
  assert.equal(handle.length, 14);
  assert.match(accountInFilter([handle]), /"r_bea4293d5edd"/);
});

test("accountInFilter adds seed casing so OpenAI matches the stored account", () => {
  const filter = accountInFilter(["openai", "@OpenAI"]);
  assert.match(filter, /"OpenAI"/);
  assert.match(filter, /"openai"/);
  assert.equal(accountInFilter([]), "");
  assert.equal(accountInFilter(["bad handle!"]), "");
});

test("accountInFilter keeps extra handles that are not in the seed", () => {
  assert.match(accountInFilter(["SomeGuy"], ["SomeGuy"]), /"SomeGuy"/);
  assert.match(accountInFilter(["someguy"], ["SomeGuy"]), /"SomeGuy"/);
});

test("accountsForQuery intersects the group without dropping original casing", () => {
  const catalog = {
    handles: ["openai", "sama"],
    profiles: [{ handle: "OpenAI" }, { handle: "sama" }],
    extras: [{ handle: "SomeGuy" }],
  };
  assert.deepEqual(accountsForQuery(catalog, ["labs", "openai"]).sort(), [
    "OpenAI",
    "openai",
  ]);
  const all = accountsForQuery(catalog, []);
  assert.ok(all.includes("OpenAI"));
  assert.ok(all.includes("openai"));
  assert.ok(all.includes("sama"));
  assert.ok(!all.includes("SomeGuy"));
});

test("accountsForQuery keeps extra original casing when the extra is a member", () => {
  const catalog = {
    handles: ["openai", "someguy"],
    profiles: [{ handle: "OpenAI" }],
    extras: [{ handle: "SomeGuy" }],
  };
  const all = accountsForQuery(catalog, []);
  assert.ok(all.includes("SomeGuy"));
  assert.ok(all.includes("someguy"));
});

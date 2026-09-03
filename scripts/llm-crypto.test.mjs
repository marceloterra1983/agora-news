import assert from "node:assert/strict";
import test from "node:test";
import {
  isWrappedLlmStore,
  openLlmStore,
  sealLlmStore,
} from "../src/lib/news/llm-crypto.server.ts";

const sampleStore = {
  activeAccountId: "acc_1",
  accounts: [
    {
      id: "acc_1",
      label: "OpenAI Pro",
      provider: "openai",
      key: "sk-proj-supersecretkey12345",
      model: "gpt-4o",
      authKind: "api",
      refreshToken: "",
      expiresAt: null,
      status: "ok",
    },
    {
      id: "acc_2",
      label: "Claude Pro",
      provider: "anthropic",
      key: "ant-oat-token-access",
      model: "claude-3-5-sonnet-20241022",
      authKind: "oauth",
      refreshToken: "ant-refresh-token-xyz",
      expiresAt: 1800000000000,
      status: "ok",
    },
  ],
  envStatus: "ok",
  envCheckedAt: 1700000000000,
  pendingOauth: {
    provider: "anthropic",
    state: "st_123",
    codeVerifier: "verifier_abc",
    label: "Claude Test",
    model: "claude-3-5-sonnet-20241022",
    createdAt: 1700000000000,
  },
};

test("sealLlmStore encrypts into a wrapped object and hides keys in plaintext", () => {
  const userId = "usr_test123";
  const sealed = sealLlmStore(sampleStore, userId, "super-secret-auth-key-32chars!");

  assert.equal(isWrappedLlmStore(sealed), true);
  assert.equal(sealed.wrapped, true);
  assert.equal(sealed.v, 1);
  assert.equal(sealed.alg, "A256GCM");
  assert.equal(sealed.kdf, "HKDF-SHA256");
  assert.ok(sealed.iv.length > 10);
  assert.ok(sealed.ct.length > 50);

  // The serialized JSON must not contain the secret keys in plain text
  const serialized = JSON.stringify(sealed);
  assert.equal(serialized.includes("sk-proj-supersecretkey12345"), false);
  assert.equal(serialized.includes("ant-refresh-token-xyz"), false);
  assert.equal(serialized.includes("verifier_abc"), false);
});

test("openLlmStore correctly decrypts sealed store", () => {
  const userId = "usr_test123";
  const secret = "super-secret-auth-key-32chars!";
  const sealed = sealLlmStore(sampleStore, userId, secret);
  const opened = openLlmStore(sealed, userId, secret);

  assert.equal(opened.activeAccountId, "acc_1");
  assert.equal(opened.accounts.length, 2);
  assert.equal(opened.accounts[0].key, "sk-proj-supersecretkey12345");
  assert.equal(opened.accounts[1].refreshToken, "ant-refresh-token-xyz");
  assert.equal(opened.pendingOauth?.codeVerifier, "verifier_abc");
});

test("openLlmStore enforces tenant isolation via AAD (cannot decrypt another user's store)", () => {
  const secret = "super-secret-auth-key-32chars!";
  const sealedForUserA = sealLlmStore(sampleStore, "user_A", secret);

  // Decrypting with user_B must fail closed
  const openedForUserB = openLlmStore(sealedForUserA, "user_B", secret);
  assert.deepEqual(openedForUserB.accounts, []);
  assert.equal(openedForUserB.activeAccountId, null);
});

test("openLlmStore fails closed if wrong secret is supplied or data is tampered", () => {
  const userId = "usr_test123";
  const sealed = sealLlmStore(sampleStore, userId, "secret-one");

  const openedWrongSecret = openLlmStore(sealed, userId, "secret-two");
  assert.deepEqual(openedWrongSecret.accounts, []);

  // Tampered ciphertext
  const tampered = { ...sealed, ct: sealed.ct.slice(0, -6) + "xxxxxx" };
  const openedTampered = openLlmStore(tampered, userId, "secret-one");
  assert.deepEqual(openedTampered.accounts, []);
});

test("openLlmStore transparently handles legacy plaintext store", () => {
  const userId = "usr_test123";
  const openedLegacy = openLlmStore(sampleStore, userId, "any-secret");

  assert.equal(openedLegacy.activeAccountId, "acc_1");
  assert.equal(openedLegacy.accounts.length, 2);
  assert.equal(openedLegacy.accounts[0].key, "sk-proj-supersecretkey12345");
});

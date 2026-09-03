import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { parseLlmStore, type LlmStore } from "./llm-accounts.mjs";

const SALT = Buffer.from("agora-news/llm-prefs/v1", "utf8");
const INFO = Buffer.from("llm-at-rest-aes-256-gcm", "utf8");

export type WrappedLlmStore = {
  v: 1;
  alg: "A256GCM";
  kdf: "HKDF-SHA256";
  iv: string;
  ct: string;
  wrapped: true;
};

function getMasterSecret(providedSecret?: string): string {
  if (providedSecret?.trim()) return providedSecret.trim();
  const envSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (envSecret) return envSecret;
  const globalRef = globalThis as typeof globalThis & {
    __authPreviewSecret__?: string;
  };
  globalRef.__authPreviewSecret__ ??= "agora-news-preview-stable-secret-fallback";
  return globalRef.__authPreviewSecret__;
}

export function deriveLlmKey(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), SALT, INFO, 32));
}

export function isWrappedLlmStore(raw: unknown): raw is WrappedLlmStore {
  return (
    Boolean(raw) &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as { wrapped?: unknown }).wrapped === true &&
    (raw as { v?: unknown }).v === 1 &&
    typeof (raw as { iv?: unknown }).iv === "string" &&
    typeof (raw as { ct?: unknown }).ct === "string"
  );
}

export function sealLlmStore(
  store: LlmStore,
  userId: string,
  secret?: string,
): WrappedLlmStore {
  const masterSecret = getMasterSecret(secret);
  const key = deriveLlmKey(masterSecret);
  const iv = randomBytes(12);
  const aad = Buffer.from(`v1:${userId}:_llm`, "utf8");

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);

  const plaintext = Buffer.from(JSON.stringify(store), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    alg: "A256GCM",
    kdf: "HKDF-SHA256",
    iv: iv.toString("base64url"),
    ct: Buffer.concat([ciphertext, tag]).toString("base64url"),
    wrapped: true,
  };
}

export function openLlmStore(
  raw: unknown,
  userId: string,
  secret?: string,
): LlmStore {
  if (!isWrappedLlmStore(raw)) {
    // Unwrapped / legacy plaintext store in database
    return parseLlmStore(raw);
  }

  const masterSecret = getMasterSecret(secret);
  const key = deriveLlmKey(masterSecret);
  const iv = Buffer.from(raw.iv, "base64url");
  const combined = Buffer.from(raw.ct, "base64url");

  if (combined.length < 16) {
    return parseLlmStore(null);
  }

  const ciphertext = combined.subarray(0, combined.length - 16);
  const tag = combined.subarray(combined.length - 16);
  const aad = Buffer.from(`v1:${userId}:_llm`, "utf8");

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString("utf8")) as unknown;
    return parseLlmStore(parsed);
  } catch {
    // Decryption error or invalid tag / AAD mismatch (tenant isolation)
    return parseLlmStore(null);
  }
}

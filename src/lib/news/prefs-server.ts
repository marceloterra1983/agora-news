import { createServerFn } from "@tanstack/react-start";
import { cloudKvGet, cloudKvSet } from "./cloud-kv";
import type { ExtraFonte } from "./extra-fontes";

export type CloudPrefs = {
  starred?: string[];
  disabled?: string[];
  notify?: string[];
  extras?: ExtraFonte[];
  settings?: object;
  theme?: string;
};

export const loadPrefs = createServerFn({ method: "GET" })
  .validator((input: { userId: string }) => ({
    userId: String(input.userId || "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    if (!data.userId) return null;
    const raw = await cloudKvGet(`prefs:${data.userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CloudPrefs;
    } catch {
      return null;
    }
  });

export const savePrefs = createServerFn({ method: "POST" })
  .validator((input: { userId: string; prefs: CloudPrefs }) => ({
    userId: String(input.userId || "").slice(0, 80),
    prefs: input.prefs || {},
  }))
  .handler(async ({ data }) => {
    if (!data.userId) return { ok: false };
    await cloudKvSet(`prefs:${data.userId}`, JSON.stringify(data.prefs), 60 * 60 * 24 * 365);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { cloudKvGet, cloudKvSet } from "./cloud-kv";
import type { ExtraFonte } from "./extra-fontes";
import type { CustomGroup } from "./groups";

export type CloudPrefs = {
  starred?: string[];
  disabled?: string[];
  notify?: string[];
  extras?: ExtraFonte[];
  settings?: object;
  theme?: string;
  groups?: Record<string, string>;
  customGroups?: CustomGroup[];
};

export const loadPrefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const raw = await cloudKvGet(`prefs:${context.userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CloudPrefs;
    } catch {
      return null;
    }
  });

export const savePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prefs: CloudPrefs; userId?: string }) => ({
    prefs: input.prefs || {},
  }))
  .handler(async ({ data, context }) => {
    await cloudKvSet(`prefs:${context.userId}`, JSON.stringify(data.prefs), 60 * 60 * 24 * 365);
    return { ok: true };
  });

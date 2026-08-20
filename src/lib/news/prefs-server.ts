import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ExtraFonte } from "./extra-fontes";
import type { CustomGroup } from "./groups";

export type SectionPrefsSlice = {
  groups?: Record<string, string>;
  customGroups?: CustomGroup[];
};

export type FontesRev = {
  starred?: string;
  disabled?: string;
  notify?: string;
  groups?: string;
};

export type CloudPrefs = {
  starred?: string[];
  disabled?: string[];
  notify?: string[];
  extras?: ExtraFonte[];
  settings?: object;
  theme?: string;
  groups?: Record<string, string>;
  customGroups?: CustomGroup[];
  bySection?: Record<string, SectionPrefsSlice>;
  fontesRev?: FontesRev;
  /** Row `user_prefs.updated_at`. Not persisted inside the prefs JSON. */
  updatedAt?: string;
};

export const loadPrefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { readUserPrefs } = await import("./prefs-store.server");
    return readUserPrefs(context.userId);
  });

export const savePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prefs: CloudPrefs }) => ({
    prefs: input.prefs || {},
  }))
  .handler(async ({ data, context }) => {
    const { writeUserPrefs } = await import("./prefs-store.server");
    await writeUserPrefs(context.userId, data.prefs);
    return { ok: true };
  });

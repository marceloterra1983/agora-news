export type WriteKind = "app" | "ingest" | "ops";

export type WriteHeaders = {
  site?: string | null;
  authorization?: string | null;
  userId?: string | null;
};

export type WriteEnv = { cronSecret?: string; userId?: string };

export function writeAllowed(kind: WriteKind, headers: WriteHeaders, env?: WriteEnv): boolean;
export function spendKeyAllowed(headers: WriteHeaders, env?: WriteEnv): boolean;
export function writeDenialStatus(kind: WriteKind): number;

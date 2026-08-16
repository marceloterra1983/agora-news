export function pushPersisted(tableOk: boolean, kvOk: boolean): boolean;
export function classifyPushTableHttp(status: number): "ok" | "absent" | "error";
export function pickPushList<T>(kind: "ok" | "absent" | "error", tableRows: T[], extras: T[]): T[];

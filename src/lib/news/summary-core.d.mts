export function clipOneLine(text: string): string;
export function clipAtWord(text: string, max: number): string;
export function looksPortuguese(text: string): boolean;
export function nameTokens(name: string): string[];
export function extractMatchesPerson(name: string, handle: string, title: string, extract: string): boolean;
export function extractLlmText(body: Record<string, unknown>): string;
export function plausibleSummary(line: string, name: string, handle: string, bio: string): boolean;

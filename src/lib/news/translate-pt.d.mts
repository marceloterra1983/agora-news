export function resetTranslateSkip(): void;
export function parseChrome(data: unknown): string;
export function pickStoredPt(original: string, candidate: string): string;
export function applyStoredTranslation(
  original: string,
  candidate: string,
): { translation_pt: string; summary_pt: string };
export function hydrateStoryBody(
  original: string,
  body: string,
  translate?: (text: string) => Promise<string>,
): Promise<string>;
export function translateToPt(
  text: string,
  opts?: {
    timeout?: number;
    chunk?: number;
    onFail?: () => void;
    libreUrl?: string;
    fetch?: typeof fetch;
  },
): Promise<string>;

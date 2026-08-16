export function translateToPt(
  text: string,
  opts?: { timeout?: number; chunk?: number; onFail?: () => void },
): Promise<string>;

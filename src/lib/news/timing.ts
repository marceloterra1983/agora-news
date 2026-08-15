/** Timing leve para logs de servidor (não vaza para o client). */

export function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function elapsedMs(start: number): number {
  return Math.round(nowMs() - start);
}

/** Log estruturado: [agora] loadNews ai 142ms count=40 */
export function logTiming(op: string, ms: number, extra?: Record<string, string | number | boolean>) {
  const bits = Object.entries(extra || {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const line = bits ? `[agora] ${op} ${ms}ms ${bits}` : `[agora] ${op} ${ms}ms`;
  // eslint-disable-next-line no-console
  console.info(line);
}

export async function timed<T>(
  op: string,
  fn: () => Promise<T>,
  extra?: (result: T) => Record<string, string | number | boolean>,
): Promise<T> {
  const t0 = nowMs();
  try {
    const result = await fn();
    logTiming(op, elapsedMs(t0), extra?.(result));
    return result;
  } catch (err) {
    logTiming(op, elapsedMs(t0), { error: true });
    throw err;
  }
}

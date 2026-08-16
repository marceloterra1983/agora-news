/** HTTP 2xx grava a sub. 403/502 não podem ligar “Avisar favoritos”. */
export function applyPushSubscribeResult(ok) {
  return Boolean(ok);
}

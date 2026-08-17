/** HTTP 2xx grava a sub. 403/502 não podem ligar “Avisar favoritos”. */
export function applyPushSubscribeResult(ok) {
  return Boolean(ok);
}

function sameBytes(left, right) {
  if (!left || !right) return false;
  const a = ArrayBuffer.isView(left)
    ? new Uint8Array(left.buffer, left.byteOffset, left.byteLength)
    : new Uint8Array(left);
  const b = ArrayBuffer.isView(right)
    ? new Uint8Array(right.buffer, right.byteOffset, right.byteLength)
    : new Uint8Array(right);
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

export async function ensureCurrentPushSubscription(pushManager, currentKey) {
  const previous = await pushManager.getSubscription();
  if (
    previous &&
    sameBytes(previous.options?.applicationServerKey, currentKey)
  ) {
    return { subscription: previous, replacedEndpoint: undefined };
  }
  const replacedEndpoint = previous?.endpoint;
  if (previous) await previous.unsubscribe();
  const subscription = await pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: currentKey,
  });
  return { subscription, replacedEndpoint };
}

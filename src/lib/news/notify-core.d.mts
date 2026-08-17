export function applyPushSubscribeResult(ok: boolean): boolean;
export function ensureCurrentPushSubscription(
  pushManager: PushManager,
  currentKey: Uint8Array,
): Promise<{
  subscription: PushSubscription;
  replacedEndpoint: string | undefined;
}>;

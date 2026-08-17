export function vapidConfig(env = process.env) {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) throw new Error("missing_vapid_configuration");
  return { publicKey, privateKey };
}

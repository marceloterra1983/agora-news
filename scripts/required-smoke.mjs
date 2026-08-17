export function unavailable(t, message) {
  if (process.env.CI_REQUIRED_SMOKES === "1") throw new Error(message);
  t.skip(message);
}

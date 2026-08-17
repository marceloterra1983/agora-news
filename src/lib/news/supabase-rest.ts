export function supabaseApiKeyHeaders(apiKey: string): Record<string, string> {
  const key = apiKey.trim();
  if (!key) throw new Error("missing_supabase_api_key");
  return { apikey: key };
}

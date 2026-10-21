type Environment = Record<string, string | undefined>;

// Fail closed: a URL alone is insufficient to opt into an external database.
export function readSupabaseConfig(env: Environment) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const ref = env.SUPABASE_PROJECT_REF;
  if (!url || !key || !ref) return null;
  if (ref === "tfxjhfdwpulqardzryjt" || !/^[a-z]{20}$/.test(ref)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== `https://${ref}.supabase.co` || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}

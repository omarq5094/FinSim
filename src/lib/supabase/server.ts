import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseConfig } from "@/lib/config";
import type { Database } from "./database.types";

export async function createClient() {
  const config = readSupabaseConfig(process.env);
  if (!config) throw new Error("FinSim connection is not configured.");
  const jar = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; proxy refreshes sessions. */ }
      },
    },
  });
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isRagConfigured } from "./config.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isRagConfigured()) {
    throw new Error("Supabase is not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }

  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}

export async function countDocuments(): Promise<number | null> {
  if (!isRagConfigured()) return null;

  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.warn("[rag] count documents failed:", error.message);
    return null;
  }

  return count ?? 0;
}

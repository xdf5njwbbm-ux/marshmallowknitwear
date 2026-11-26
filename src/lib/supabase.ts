import { createClient } from "@supabase/supabase-js";

// Public (publishable) values — safe in the browser. Row-level security protects the data;
// no private keys or payment credentials ever live in this code.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://dmynmniiapfrpzfxgqwn.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? "sb_publishable_3wszEFLCya9n0bCSpArFvg_A0DI2e7n";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "mk-auth" },
});

/** Turns a Supabase/Postgres error into a sentence a shopper can read. */
export function friendly(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e ?? "");
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "We couldn't reach the shop — check your connection and try again.";
  if (/JWT|not allowed|permission denied|42501/i.test(m)) return "You don't have access to that.";
  return m.replace(/^Error:\s*/, "") || "Something went wrong. Please try again.";
}

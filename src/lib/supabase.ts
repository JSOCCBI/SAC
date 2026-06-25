import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return (getSupabaseClient() as Record<string | symbol, unknown>)[prop];
  },
});

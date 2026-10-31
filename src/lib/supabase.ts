import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service key for server-side (bypasses RLS), fallback to anon key
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// Resilient fetch with strict 3500ms timeout to prevent hanging on paused/crashed Supabase instances
const fetchWithTimeout: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const timeoutMs = 3500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const signal = init?.signal
    ? anySignal([init.signal, controller.signal])
    : controller.signal;

  return fetch(input, { ...init, signal }).finally(() => clearTimeout(timer));
};

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      return controller.signal;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: fetchWithTimeout },
});

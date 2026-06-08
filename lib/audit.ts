import { createBrowserClient } from '@supabase/ssr'

type Level = 'info' | 'warning' | 'error' | 'critical'

export async function logAudit(
  action: string,
  module: string,
  description: string,
  metadata?: Record<string, any>,
  level: Level = 'info',
) {
  try {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
    await sb.from('audit_log').insert({ action, module, description, metadata, level })
  } catch { /* non-fatal — audit must not break primary flows */ }
}

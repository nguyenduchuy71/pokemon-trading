// Daily USD<->VND refresh. Invoked by a scheduler (pg_cron + pg_net, or any cron) with
// `x-cron-secret: $FX_CRON_SECRET`. On upstream failure the previous rate is kept.
import { createClient } from 'npm:@supabase/supabase-js@2'

const FX_SOURCE = 'https://open.er-api.com/v6/latest/USD'

Deno.serve(async (req) => {
  const secret = Deno.env.get('FX_CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  try {
    const res = await fetch(FX_SOURCE, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const body = (await res.json()) as { result?: string; rates?: Record<string, number> }
    const vnd = body.rates?.VND
    // Sanity bounds guard against a broken upstream silently corrupting every price.
    if (body.result !== 'success' || !vnd || vnd < 10_000 || vnd > 60_000) throw new Error(`implausible rate ${vnd}`)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const fetched_at = new Date().toISOString()
    const { error } = await admin.from('fx_rates').upsert([
      { base: 'USD', quote: 'VND', rate: vnd, fetched_at },
      { base: 'VND', quote: 'USD', rate: 1 / vnd, fetched_at },
    ])
    if (error) throw error
    return Response.json({ ok: true, usd_vnd: vnd, fetched_at })
  } catch (error) {
    console.error('fx-refresh failed; keeping last known rate', error)
    return Response.json({ ok: false }, { status: 502 })
  }
})

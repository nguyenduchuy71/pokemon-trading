// Browser-invoked functions need CORS. Restrict ALLOWED_ORIGIN in production (see docs/deployment.md).
const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

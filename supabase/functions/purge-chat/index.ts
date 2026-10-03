// Daily chat retention. Invoked by pg_cron + pg_net with `x-cron-secret: $PURGE_CRON_SECRET`.
// purge_expired_chat() deletes expired messages in SQL and returns the chat-image paths;
// files are removed here because Storage objects can only be deleted through the Storage API.
// Safe to re-run: missing files are ignored, so a failed batch is retried by the next run.
import { createClient } from 'npm:@supabase/supabase-js@2'

const BATCH = 100

Deno.serve(async (req) => {
  const secret = Deno.env.get('PURGE_CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data, error } = await admin.rpc('purge_expired_chat')
    if (error) throw error
    const paths = ((data ?? []) as { path: string }[]).map((r) => r.path)

    for (let i = 0; i < paths.length; i += BATCH) {
      const { error: removeError } = await admin.storage.from('chat-images').remove(paths.slice(i, i + BATCH))
      if (removeError) throw removeError
    }
    return Response.json({ ok: true, deleted_files: paths.length })
  } catch (error) {
    console.error('purge-chat failed', error)
    return Response.json({ ok: false }, { status: 500 })
  }
})

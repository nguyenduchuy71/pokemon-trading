// Deletes the CALLER's account only: their public storage objects, then the auth user.
// FK cascades remove profile, collections, items, photos rows, listings, wishlists, blocks.
// Messages they sent remain for the other party with sender_id = null ("Deleted collector").
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

async function listAllPaths(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset })
    if (error) throw error
    for (const entry of data ?? []) {
      const full = `${prefix}/${entry.name}`
      // Folders come back without an id.
      if (entry.id === null) paths.push(...(await listAllPaths(admin, bucket, full)))
      else paths.push(full)
    }
    if (!data || data.length < PAGE) break
  }
  return paths
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'not_authenticated' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'not_authenticated' }, 401)
  const userId = userData.user.id

  try {
    for (const bucket of ['card-images', 'avatars']) {
      const paths = await listAllPaths(admin, bucket, userId)
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100))
        if (error) throw error
      }
    }
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw error
    return json({ ok: true })
  } catch (error) {
    console.error('delete-account failed', userId, error)
    return json({ error: 'delete_failed' }, 500)
  }
})

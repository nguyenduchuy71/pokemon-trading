import { supabase } from '@/lib/supabase-client'
import { toAppError } from '@/utils/app-error'
import { extensionFor } from '@/utils/image-processing'

type PublicBucket = 'card-images' | 'avatars'

/** Unique object names → safe to cache "forever" at the CDN and in the browser. */
const IMMUTABLE_CACHE = '31536000'

function randomName(): string {
  return crypto.randomUUID()
}

export async function uploadPublic(bucket: PublicBucket, path: string, blob: Blob): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { cacheControl: IMMUTABLE_CACHE, contentType: blob.type, upsert: false })
  if (error) throw toAppError(error)
  return path
}

export async function removeObjects(bucket: PublicBucket | 'chat-images', paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) throw toAppError(error)
}

/** Public URL for card-images/avatars. Absolute URLs (seed data, Google avatars) pass through. */
export function publicImageUrl(bucket: PublicBucket, path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/** `{uid}/{itemId}/{uuid}-{thumb|md}.webp` — first segment is enforced by storage RLS. */
export async function uploadCardPhoto(userId: string, itemId: string, images: { thumb: Blob; medium: Blob }) {
  const base = `${userId}/${itemId}/${randomName()}`
  const thumbPath = await uploadPublic('card-images', `${base}-thumb.${extensionFor(images.thumb)}`, images.thumb)
  try {
    const mediumPath = await uploadPublic('card-images', `${base}-md.${extensionFor(images.medium)}`, images.medium)
    return { thumbPath, mediumPath }
  } catch (error) {
    await removeObjects('card-images', [thumbPath]).catch(() => undefined)
    throw error
  }
}

export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const path = await uploadPublic('avatars', `${userId}/${randomName()}.${extensionFor(blob)}`, blob)
  return publicImageUrl('avatars', path)!
}

/** Private chat image, `{conversationId}/{uuid}.webp`; readable by members via signed URL. */
export async function uploadChatImage(conversationId: string, blob: Blob): Promise<string> {
  const path = `${conversationId}/${randomName()}.${extensionFor(blob)}`
  const { error } = await supabase.storage.from('chat-images').upload(path, blob, { contentType: blob.type, upsert: false })
  if (error) throw toAppError(error)
  return path
}

export async function signedChatImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('chat-images').createSignedUrl(path, 60 * 60)
  if (error || !data) throw toAppError(error)
  return data.signedUrl
}

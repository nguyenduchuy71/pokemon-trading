/*
 * Client-side image pipeline: decode → downscale → re-encode as WebP (JPEG fallback).
 * Re-encoding through a canvas drops all metadata, including EXIF GPS — a privacy requirement.
 * Supabase Image Transformations are not used (paid plan), so sizes are produced here.
 */

export const MAX_INPUT_BYTES = 15 * 1024 * 1024
export const ACCEPTED_INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const IMAGE_SIZES = {
  thumb: 320,
  medium: 960,
  avatar: 256,
} as const

export class ImageInputError extends Error {
  readonly reason: 'type' | 'size' | 'decode'
  constructor(reason: 'type' | 'size' | 'decode') {
    super(`image_${reason}`)
    this.reason = reason
  }
}

/** Fit inside a `max`×`max` box, never upscale, keep aspect ratio. */
export function computeTargetSize(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function validateImageFile(file: File): void {
  if (!ACCEPTED_INPUT_TYPES.includes(file.type)) throw new ImageInputError('type')
  if (file.size > MAX_INPUT_BYTES) throw new ImageInputError('size')
}

async function encode(bitmap: ImageBitmap, max: number, square: boolean): Promise<Blob> {
  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height
  if (square) {
    const side = Math.min(sw, sh)
    sx = (sw - side) / 2
    sy = (sh - side) / 2
    sw = sh = side
  }
  const { width, height } = computeTargetSize(sw, sh, max)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageInputError('decode')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)

  const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  const webp = await toBlob('image/webp', 0.82)
  // Older Safari silently returns PNG for unsupported types → fall back to JPEG.
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob('image/jpeg', 0.85)
  if (!jpeg) throw new ImageInputError('decode')
  return jpeg
}

async function decode(file: File): Promise<ImageBitmap> {
  validateImageFile(file)
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageInputError('decode')
  }
}

/** Card photo → thumbnail (grid) + medium (detail view). */
export async function processCardPhoto(file: File): Promise<{ thumb: Blob; medium: Blob }> {
  const bitmap = await decode(file)
  try {
    const [thumb, medium] = await Promise.all([encode(bitmap, IMAGE_SIZES.thumb, false), encode(bitmap, IMAGE_SIZES.medium, false)])
    return { thumb, medium }
  } finally {
    bitmap.close()
  }
}

/** Single medium-size image (chat photos). */
export async function processChatPhoto(file: File): Promise<Blob> {
  const bitmap = await decode(file)
  try {
    return await encode(bitmap, IMAGE_SIZES.medium, false)
  } finally {
    bitmap.close()
  }
}

/** Square-cropped avatar. */
export async function processAvatar(file: File): Promise<Blob> {
  const bitmap = await decode(file)
  try {
    return await encode(bitmap, IMAGE_SIZES.avatar, true)
  } finally {
    bitmap.close()
  }
}

export function extensionFor(blob: Blob): 'webp' | 'jpg' {
  return blob.type === 'image/webp' ? 'webp' : 'jpg'
}

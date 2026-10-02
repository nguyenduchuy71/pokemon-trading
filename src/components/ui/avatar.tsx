import { cn } from '@/utils/cn'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
}

/** Round avatar with a monogram fallback on a brass-tinted disc. */
export function Avatar({ src, name, size = 36, className }: AvatarProps) {
  const initials = name.replace(/^@/, '').slice(0, 2).toUpperCase()
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-raised font-display text-brass', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <span aria-hidden>{initials}</span>}
    </span>
  )
}

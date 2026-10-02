import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'brass' | 'verdigris' | 'ember' | 'moss'

const TONES: Record<Tone, string> = {
  neutral: 'border-line text-ink-muted',
  brass: 'border-brass/40 text-brass bg-brass/10',
  verdigris: 'border-verdigris/40 text-verdigris bg-verdigris/10',
  ember: 'border-ember/40 text-ember bg-ember/10',
  moss: 'border-moss/40 text-moss bg-moss/10',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4', TONES[tone], className)}>
      {children}
    </span>
  )
}

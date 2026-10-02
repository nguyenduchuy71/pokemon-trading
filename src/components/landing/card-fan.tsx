import { HoloFrame } from '@/components/card/holo-frame'
import { cn } from '@/utils/cn'

/*
 * Three fanned "card backs" drawn in CSS — an original motif (no official artwork or marks).
 * The front card carries the holo foil so the hero has one tactile moment.
 */
const BACKS = [
  { rotate: '-14deg', x: '-38%', tone: 'from-[#2a241c] to-[#17130f]' },
  { rotate: '9deg', x: '34%', tone: 'from-[#262019] to-[#14110d]' },
]

export function CardFan({ className }: { className?: string }) {
  return (
    <div className={cn('relative mx-auto aspect-[5/4] w-full max-w-[460px]', className)} aria-hidden>
      {BACKS.map((b) => (
        <div
          key={b.rotate}
          className={cn('absolute left-1/2 top-1/2 aspect-[63/88] w-[46%] rounded-[16px] border border-line-strong bg-gradient-to-b shadow-2xl', b.tone)}
          style={{ transform: `translate(-50%, -50%) translateX(${b.x}) rotate(${b.rotate})` }}
        >
          <div className="absolute inset-[7%] rounded-[10px] border border-brass/25" />
          <div className="absolute inset-0 m-auto h-[22%] w-[32%] rounded-full border border-brass/30" />
        </div>
      ))}
      <HoloFrame foil className="absolute left-1/2 top-1/2 aspect-[63/88] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-[16px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="foil-edge flex h-full flex-col rounded-[16px] p-[7%]">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[0.95rem] italic text-ink">Vault Proof</span>
            <span className="font-mono text-[10px] text-brass">HP 330</span>
          </div>
          <div className="mt-3 flex-1 rounded-[8px] border border-line bg-[radial-gradient(120%_90%_at_30%_20%,rgba(201,162,92,0.35),transparent_55%),radial-gradient(90%_70%_at_80%_90%,rgba(116,181,167,0.25),transparent_60%),var(--raised)]" />
          <div className="mt-3 flex items-center justify-between font-mono text-[9px] tracking-widest text-ink-faint">
            <span>CS · 001/151</span>
            <span className="text-brass">★ SIR</span>
          </div>
        </div>
      </HoloFrame>
    </div>
  )
}

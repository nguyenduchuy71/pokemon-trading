import { useTranslation } from 'react-i18next'
import { Check, Minus } from 'lucide-react'
import { CardFan } from '@/components/landing/card-fan'
import { ButtonLink } from '@/components/ui/button'
import { ListingGrid, ListingGridSkeleton } from '@/components/marketplace/listing-grid'
import { useListingStrip } from '@/queries/use-marketplace'
import { EMPTY_FILTERS } from '@/schemas/marketplace-filter-schema'

export default function LandingPage() {
  const { t } = useTranslation('home')
  const recent = useListingStrip('landing-recent', EMPTY_FILTERS, { limit: 6 })
  const steps = t('landing.steps', { returnObjects: true }) as { h: string; p: string }[]
  const does = t('landing.does_items', { returnObjects: true }) as string[]
  const doesnt = t('landing.doesnt_items', { returnObjects: true }) as string[]

  return (
    <div>
      <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 pb-16 pt-12 md:grid-cols-[1.15fr_1fr] md:px-8 md:pb-24 md:pt-20">
        <div>
          <p className="eyebrow">{t('landing.eyebrow')}</p>
          <h1 className="mt-5 text-[clamp(3.2rem,9vw,7.5rem)] font-light leading-[0.92] tracking-[-0.03em]">
            <span className="block">{t('landing.headline_1')}</span>
            <span className="block italic text-brass">{t('landing.headline_2')}</span>
            <span className="block">{t('landing.headline_3')}</span>
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-ink-muted">{t('landing.lede')}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to="/login" size="lg">
              {t('landing.cta')}
            </ButtonLink>
            <ButtonLink to="/marketplace" size="lg" variant="secondary">
              {t('landing.browse')}
            </ButtonLink>
          </div>
        </div>
        <CardFan />
      </section>

      <div className="rule mx-auto max-w-[1400px]" />

      <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
        <h2 className="text-3xl md:text-4xl">{t('landing.how_title')}</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.h} className="border-t border-line-strong pt-5">
              <span className="font-mono text-xs text-brass">0{i + 1}</span>
              <h3 className="mt-2 text-2xl">{s.h}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{s.p}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-3xl md:text-4xl">{t('landing.recent')}</h2>
          <ButtonLink to="/marketplace" variant="ghost" size="sm">
            {t('landing.browse')} →
          </ButtonLink>
        </div>
        {recent.isPending ? <ListingGridSkeleton count={6} /> : recent.data?.length ? <ListingGrid listings={recent.data} /> : null}
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
        <h2 className="max-w-xl text-3xl md:text-4xl">{t('landing.boundary_title')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card-surface p-6">
            <p className="eyebrow text-moss">{t('landing.does')}</p>
            <ul className="mt-4 space-y-2.5">
              {does.map((d) => (
                <li key={d} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-moss" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-6">
            <p className="eyebrow">{t('landing.doesnt')}</p>
            <ul className="mt-4 space-y-2.5 text-ink-muted">
              {doesnt.map((d) => (
                <li key={d} className="flex items-center gap-2.5">
                  <Minus className="h-4 w-4 text-ink-faint" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

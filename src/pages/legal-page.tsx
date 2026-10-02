import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CONTACT_EMAIL } from '@/components/layout/site-footer'
import NotFoundPage from './not-found-page'

const SLUGS = ['terms', 'privacy', 'community-guidelines', 'prohibited-items', 'safety'] as const
type Slug = (typeof SLUGS)[number]
const LAST_UPDATED = '2026-10-02'
/** Flip to false once counsel has reviewed the texts (see docs/community-guidelines.md). */
const IS_DRAFT = true

interface LegalSection {
  h: string
  p: string[]
}

export default function LegalPage() {
  const { slug } = useParams()
  const { t } = useTranslation('legal')
  if (!SLUGS.includes(slug as Slug)) return <NotFoundPage />

  const title = t(`pages.${slug}.title`)
  const sections = t(`pages.${slug}.sections`, { returnObjects: true }) as LegalSection[]

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[200px_1fr]">
      <nav aria-label="Legal" className="order-2 md:order-1">
        <ul className="space-y-2 text-sm md:sticky md:top-24">
          {SLUGS.map((s) => (
            <li key={s}>
              <Link to={`/legal/${s}`} aria-current={s === slug ? 'page' : undefined} className={s === slug ? 'text-brass' : 'text-ink-muted hover:text-ink'}>
                {t(`pages.${s}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="order-1 max-w-2xl md:order-2">
        {IS_DRAFT && <p className="mb-6 rounded-lg border border-brass/40 bg-brass/10 px-3 py-2 text-xs text-brass">{t('draft_notice')}</p>}
        <h1 className="text-4xl md:text-5xl">{title}</h1>
        <p className="mt-2 font-mono text-xs text-ink-faint">{t('updated', { date: LAST_UPDATED })}</p>
        {sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="text-2xl">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para} className="mt-3 leading-relaxed text-ink-muted">
                {para}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-10 text-sm text-ink-muted">
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brass hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </article>
    </div>
  )
}

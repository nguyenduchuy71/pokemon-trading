# CardSwap

**Pokémon TCG Collector Discovery + P2P Communication Platform for Vietnam**

CardSwap is a marketplace for collectors to discover, trade, and communicate about Pokémon Trading Card Game cards. Built with React 19, Vite, TypeScript, Tailwind v4, and Supabase.

## Overview

CardSwap enables collectors to:
- 📦 Organize collections into binders and list cards for sale or trade
- 🔍 Search marketplace with advanced filters (set, condition, language, price)
- 💬 Message card owners directly with real-time chat
- 🛡️ Report counterfeit listings and block users
- 🌍 Convert prices between VND and USD (daily FX refresh)
- 🎨 Dark/Light theme, Vietnamese/English interface

**Scope**: Discovery + Listing + Communication + Community only. No payments, shipping, orders, or trade contracts (enforced by CI scope guard).

**Status**: v1.0 code-complete; pending Google OAuth credentials and production deployment.

## Quick Start

### Prerequisites
- Node.js 24+
- Docker Desktop (for Supabase local instance)

### Setup

```bash
# Clone and install
git clone <repo>
cd pokemon-trading
npm ci

# Start local Supabase (migrations run automatically)
supabase start
# Copy API Key and Anon Key from output

# Create .env.local
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<paste from supabase start output>
EOF

# Start dev server
npm run dev
# Open http://localhost:5173

# Test accounts (dev only)
# alex@cardswap.dev / cardswap-dev
# bao@cardswap.dev / cardswap-dev
# chi@cardswap.dev / cardswap-dev
# mod@cardswap.dev / cardswap-dev (admin)
```

### Import Catalog (Optional)

```bash
npm run catalog:import
# Downloads English + Japanese cards from TCGdex
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run oxlint |
| `npm run typecheck` | Run TypeScript compiler |
| `npm test` | Run vitest (unit tests) |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:start` | Start Supabase local |
| `npm run db:reset` | Reset database (lose all data) |
| `npm run db:test` | Run pgTAP tests (RLS, RPCs) |
| `npm run db:types` | Regenerate `src/types/database.ts` |
| `npm run catalog:import` | Import Pokémon cards from TCGdex |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run scope-guard` | Check for forbidden payment code |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── app/          # Providers, router setup
├── pages/        # Page components (lazy-loaded)
├── layouts/      # Root layout, navigation
├── components/   # Reusable components
├── hooks/        # Custom React hooks
├── stores/       # Zustand stores (auth, UI prefs)
├── queries/      # TanStack Query hooks
├── services/     # RPC calls, business logic
├── schemas/      # Zod validation schemas
├── types/        # TypeScript types (database.ts auto-generated)
├── constants/    # Enums, domain constants
├── lib/          # Supabase, Query client, i18n setup
├── utils/        # Helpers (error handling, images, FX)
├── locales/      # i18n translations (vi, en)
└── styles/       # Tailwind globals

docs/            # Documentation
├── architecture.md
├── database-schema.md
├── security.md
├── caching.md
├── deployment.md
├── cost-control.md
├── backend-alternatives.md
├── community-guidelines.md
├── code-standards.md
├── development-roadmap.md
└── project-changelog.md

supabase/        # Database migrations, tests
├── migrations/  # SQL migration files
└── tests/       # pgTAP test suite (RLS, RPCs)
```

## Technology Stack

**Frontend**:
- React 19 · Vite 8 · TypeScript
- Tailwind CSS v4 · React Router 7
- TanStack Query (server state) · Zustand (UI state)
- React Hook Form + Zod (form validation)
- i18next (internationalization)
- Lucide React (icons) · Recharts (charts, v1.1+)

**Backend**:
- Supabase (managed Postgres + Auth + Storage + Realtime)
- Postgres 15 with RLS, custom RPCs, triggers
- Row-level security (RLS) on all user-scoped tables
- Edge Functions (FX rate refresh, account deletion)
- Realtime: postgres_changes subscriptions

**Testing**:
- Vitest (unit tests)
- pgTAP (database tests)
- Playwright (E2E tests)

**Deployment**:
- Cloudflare Pages or Vercel (frontend)
- Supabase Free (backend, $0 — see Cost)

## Key Features

### Collections & Binders
Organize cards with condition, printing, grading, and photos. Built-in statistics (total cards, estimated value).

### Marketplace Search
Advanced filters: set, rarity, condition, language, printing, price range, seller location. Sort by recent or popular.

### Real-time Messaging
Start 1:1 conversations, send text/images/listings. Unread count, block detection, rate limiting.

### Safety Features
- Block users (bidirectional)
- Report listings or users (11 reason types)
- Auto-hide listings at 3+ reports
- Admin queue for moderation
- Account deletion with data anonymization

### Multi-Currency
List in VND or USD. Prices auto-converted at search time (daily FX refresh).

### Internationalization
Vietnamese (default) + English. Easy to add more languages via i18n.

## Architecture

- **Layers**: UI (React Router pages) → Hooks (TanStack Query) → Services (RPC calls) → Database (Postgres + RLS)
- **State**: Zustand for UI prefs + auth session; TanStack Query for server data
- **Realtime**: Supabase postgres_changes on messages + conversation updates
- **Security**: RLS on all tables; security-definer RPCs for rate limiting, block enforcement
- **Images**: Client-side WebP resize (strips EXIF), CDN cache 1 year (immutable filenames)

See [docs/architecture.md](docs/architecture.md) for detailed system design.

## Database

13 migrations covering:
- User profiles + auth
- Pokémon cards catalog (TCGdex import)
- Collections (binders) + items + photos
- Card listings (marketplace)
- Wishlists
- Conversations + messages (realtime)
- Reports + blocks (safety)
- Moderation actions (audit log)
- FX rates (daily refresh)

See [docs/database-schema.md](docs/database-schema.md) for complete schema + ERD.

## Security

- **RLS**: Row-level security on user-scoped tables (profiles, collections, listings, conversations, etc.)
- **Blocks**: Bidirectional enforcement; blocks prevent messaging and search filtering
- **Suspension**: Suspended users cannot insert new data (RLS policies check)
- **Rate limits**: Conversations (10/day new accounts, 50/day established), reports (20/day), messages (20/min)
- **Admin**: Security-definer RPCs for moderation; all actions logged
- **Images**: EXIF/GPS stripped on upload; public images cached 1 year (immutable UUIDs)
- **Auth**: Google OAuth only (dev: email provider)

See [docs/security.md](docs/security.md) for threat model + RLS matrix.

## Deployment

### Local Development
```bash
supabase start
npm run dev
```

### Production
1. Supabase project on the Free plan (see [Cost](#cost))
2. Google OAuth credentials (GCP Console, consent screen published *In production*)
3. Deploy to Cloudflare Pages (free, commercial use allowed) — Vercel Hobby is non-commercial only
4. Configure domain + SSL
5. Edge Function for FX rate refresh
6. Run launch checklist (docs/deployment.md)

See [docs/deployment.md](docs/deployment.md) for detailed steps.

## Cost

**Target: $0/month.** v1 runs entirely on free tiers. The only optional cost is a custom domain; `*.pages.dev` is free.

| Service | Plan | Key free limits |
|---|---|---|
| Supabase | Free | 500 MB DB · 1 GB storage · 5 GB + 5 GB cached egress · 50k MAU · Realtime 200 concurrent / 2 M msgs per month · pauses after 7 idle days · no backups |
| Cloudflare Pages (recommended) | Free | Unlimited static bandwidth/requests · 500 builds/month · commercial use OK |
| Vercel (alternative) | Hobby | 100 GB transfer · 1 M CDN requests · **non-commercial use only** |
| Google Cloud | OAuth client only | Free, no billing account or trial needed. Publish the consent screen to *In production* (Testing = max 100 users); `openid/email/profile` scopes need no verification |
| TCGdex · open.er-api.com · GitHub Actions | Free | Card images come from TCGdex's CDN, not our egress |

**Free-tier user caps**:
- **100 active users** (with waitlist for signups; auto FIFO promotion when slots open, plus admin manual activation)
- **200 text + 5 image messages per user per rolling 24h**
- **20 cards per user**, **3 photos per card**
- **800px images**, WebP @ quality 0.75 (~100 KB per photo)
- **7-day message retention** (auto-purged daily; no DB bloat)
- **~850 MB worst-case storage** (2,000 avatars + 2,500 card photos at 3 each); **~45 MB messages** (always, due to auto-purge)

**Upgrade** to Supabase Pro ($25/mo: 8 GB DB, 100 GB storage, 250 GB egress, 500 connections, daily backups, no pausing) when any metric stays above 80%.

See [docs/cost-control.md](docs/cost-control.md) for detailed calculations, free-tier caps, and optimisation levers.

## Roadmap

**v1.0** (Current, 2026-10-02): 12 phases complete
- Google auth, profile setup, collections, marketplace, messaging, safety, moderation, legal pages

**v1.1** (Q4 2026, ~6 weeks post-launch):
- Notifications, favorites, "We connected" reviews, collection analytics, wishlist matching

**v2.0** (2027, subject to feedback):
- Recommendations, price history, AI card recognition, more login providers
- **Out of scope**: Payments, shipping, trade contracts

See [docs/development-roadmap.md](docs/development-roadmap.md).

## Testing

```bash
npm test              # Unit tests (vitest)
npm run db:test       # Database tests (pgTAP)
npm run e2e           # E2E tests (Playwright)
```

Coverage:
- Schemas, services, utilities (vitest)
- RLS policies, RPC behavior, triggers (pgTAP)
- Critical journeys: login → search → message (Playwright)

## CI/CD

GitHub Actions workflow:
- Scope guard (no payments/orders/shipping)
- Lint (oxlint)
- Type check (tsc)
- Unit tests (vitest)
- Build (vite build)
- Database tests (pgTAP on local Supabase)
- E2E tests (Playwright)

Runs on push to main + pull requests.

## Documentation

- [**Architecture**](docs/architecture.md): System design, layers, data flow
- [**Database Schema**](docs/database-schema.md): Tables, enums, RPCs, RLS matrix
- [**Security**](docs/security.md): RLS enforcement, threat model, admin model
- [**Caching**](docs/caching.md): TanStack Query, browser storage, CDN, database indexes
- [**Deployment**](docs/deployment.md): Local setup, CI/CD, production checklist
- [**Cost Control**](docs/cost-control.md): Free vs Pro tier, cost drivers, ROI analysis
- [**Backend Alternatives**](docs/backend-alternatives.md): Supabase vs Firebase vs Appwrite vs DIY
- [**Community Guidelines**](docs/community-guidelines.md): User rules, moderator runbook
- [**Code Standards**](docs/code-standards.md): File naming, size limits, error handling, testing
- [**Development Roadmap**](docs/development-roadmap.md): v1.1, v2.0, success metrics
- [**Changelog**](docs/project-changelog.md): Release notes by version

## Contributing

Before submitting:
1. Lint: `npm run lint`
2. Type check: `npm run typecheck`
3. Test: `npm test`
4. Scope guard: `npm run scope-guard` (no payments/shipping)
5. Follow code standards: [docs/code-standards.md](docs/code-standards.md)

Commit message format: `<type>: <description>` (feat, fix, docs, refactor, test, chore)

## Legal

- **Terms of Service**: Published at `/legal/terms`
- **Privacy Policy**: Published at `/legal/privacy`
- **Community Guidelines**: Published at `/legal/community-guidelines`
- **Prohibited Items**: Published at `/legal/prohibited-items`
- **MOIT Registration**: Required before public launch (Vietnam e-commerce platform)

See [docs/community-guidelines.md](docs/community-guidelines.md) for user rules + moderator runbook.

## Known Limitations

- No payments, shipping, orders, or trade contracts (v1 scope)
- Google OAuth only (email, Facebook, Zalo in v2)
- No AI card recognition (manual search in v1)
- No price history (v2 planned)
- Catalog limited to TCGdex (pokemontcg.io deprecated 2027-03)
- No notifications (real-time messages only in v1, email alerts v1.1)

See [docs/development-roadmap.md](docs/development-roadmap.md) for planned features.

## Support

Report bugs or request features:
- Issue: [GitHub Issues](https://github.com/cardswap/cardswap)
- Email: wtfomg3650@gmail.com (post-launch)
- Contact form: `/legal/contact`

## License

[Add license here, e.g., MIT]

---

**Version**: v0.1.0 (2026-10-02) · **Status**: Code-complete, pending deployment · **Next**: v1.1 (Q4 2026)

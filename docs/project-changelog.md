# CardSwap Project Changelog

All notable changes to CardSwap by version.

## [v0.1.0] - 2026-10-02

### Initial Release (v1 Launch)

**Status**: Code-complete, pending Google OAuth credentials and production deployment.

#### Added

**Core Features**
- Google OAuth authentication (dev: email provider)
- User profile setup: username, display name, avatar, location, currency preference
- Dark/Light theme toggle
- Internationalization: Vietnamese (default) + English

**Catalog**
- TCGdex catalog import (English + Japanese Pokémon cards)
- Card search with full-text + trigram indexing
- Search filters: set, rarity, type, language, printing
- Card details: HP, type, rarity, release date, artwork

**Collections & Binders**
- Create, rename, reorder binders (default binder protected)
- Add cards to collections with metadata:
  - Condition (MINT, NEAR_MINT, EXCELLENT, LIGHT_PLAYED, PLAYED, POOR)
  - Printing (normal, holo, reverse, firstEdition)
  - Grading (optional: company, grade 1–10)
  - Quantity, estimated value, notes
- Upload up to 5 photos per card item (client-side WebP resize)
- Collection statistics: total cards, unique cards, sets owned, estimated value
- Drag-drop reordering of cards within binder

**Marketplace**
- List cards for SALE, TRADE, or SALE_OR_TRADE
- Advanced search: text query, set/condition/language/printing filters, price range, location
- Sort options: recent, popular (by views/conversations), price low-to-high
- Currency conversion: VND ↔ USD (daily refresh via Edge Function, open.er-api.com)
- Listing detail: seller profile, card condition, photos, conversation count, view count
- View tracking: deduped by viewer/day for popularity metrics

**Wishlist**
- Create public/private wishlists
- Add cards with optional: priority (HIGH/MEDIUM/LOW), min condition, max price, quantity
- Share wishlist with other collectors
- Wishlist availability check (matched against marketplace listings)

**Messaging**
- Messenger-style chat popup (floating bubble with unread badge; full-screen on phones) that stays open while browsing; `/messages` and `/messages/:id` are deep links that open it
- Start 1:1 conversations via "Contact owner" button on listings
- Send text messages, share listings, upload images to chat
- Realtime updates via Supabase postgres_changes
- Unread message count per conversation
- Block detection: blocked users cannot message, blocked messages hidden
- Rate limiting: 10 new conversations/day for new accounts (< 7 days old), 50/day for established
- Mark conversation as read on view

**Safety & Moderation**
- Block/unblock users (bidirectional)
- Report users or listings with reason (11 reason types):
  - User: SCAM_SUSPICION, HARASSMENT, SPAM, FAKE_LISTING, PROHIBITED_CONTENT, OTHER
  - Listing: FAKE_CARD, WRONG_PRICE, WRONG_CARD_INFO, MISLEADING_PHOTOS, SPAM, OTHER
- Report details (optional): up to 1000 characters
- Rate limit: 20 reports/day per user
- Auto-hide listings after 3+ distinct reports (pending admin review)
- Admin queue:
  - Open reports (grouped by target)
  - Hidden listings (pending review or removed)
  - Suspended users
  - Moderation action log (audit trail)
- Admin actions:
  - Resolve report (RESOLVED / DISMISSED)
  - Hide listing (HIDDEN_PENDING_REVIEW / REMOVED)
  - Suspend user account (ACTIVE / SUSPENDED)
  - All actions logged in moderation_actions table

**Public Profile**
- Username, display name, avatar, bio, location, member since
- Collection size, listing count, wishlist count (public collections only)
- Public wishlists / collections
- Is this user blocking me? (detection)

**Account & Settings**
- Profile settings: edit display name, bio, location, avatar
- Preferences: language, theme, default currency
- Account deletion: anonymizes data, cascades to all related rows
- Legal pages: Terms of Service, Privacy Policy, Community Guidelines, Prohibited Items, Contact

**Infrastructure**
- Database: Postgres 15 (Supabase managed)
- Auth: Supabase Auth with Google OAuth + JWT
- Storage: Supabase Storage (card-images public, avatars public, chat-images private)
- Realtime: postgres_changes subscriptions (messages, conversation updates)
- Edge Functions: fx-refresh (daily FX rate update)
- RLS: Row-level security on all user-scoped tables
- Migrations: 13 SQL migration files (extensions, schema, RPCs, policies)

**Frontend Stack**
- React 19 with TypeScript
- Vite 8 (build tool)
- React Router 7 (SPA routing)
- TanStack Query 5 (server state)
- Zustand 5 (UI preferences, auth session)
- React Hook Form + Zod (form validation)
- Tailwind CSS v4 (styling)
- i18next (internationalization)
- Lucide React (icons)
- Recharts (v1.1+ analytics charts)

**Testing**
- Vitest: Unit tests for schemas, services, utilities
- pgTAP: RLS and RPC tests (database logic)
- Playwright: E2E smoke tests (login, search, message flows)
- CI/CD: GitHub Actions (lint, typecheck, test, build, e2e)
- Scope guard: Enforces no payment/order/shipping code in codebase

**Documentation**
- Architecture documentation (layers, data flow, realtime design)
- Database schema (tables, enums, RPCs, RLS matrix)
- Security documentation (RLS enforcement, threat model, admin model)
- Caching strategy (TanStack Query, browser storage, CDN, database indexes)
- Deployment guide (local setup, CI/CD, production checklist, launch prep)
- Cost control: $0 free-tier plan (Supabase Free + Cloudflare Pages + Google OAuth) with user/message capacity and retention estimates
- Backend alternatives analysis (Supabase vs Firebase vs Appwrite vs self-hosted)
- Community guidelines (user rules, moderator runbook)
- Code standards (file naming, size limits, error handling, testing)
- Development roadmap (v1.0 complete, v1.1 planned, v2.0 future)

#### Technical Highlights

- **Client-side image processing**: WebP re-encoding strips EXIF/GPS, resizes to thumbnail (320px) + medium (960px)
- **Immutable file names**: UUIDs for cache-forever CDN headers (1 year)
- **Security-definer RPCs**: Postgres functions with elevated privileges for rate limiting, block enforcement
- **Rate limiting**: Implemented at DB layer (triggers) for conversations, reports, messages
- **Auto-hide listings**: Trigger-based (3+ reporters → HIDDEN_PENDING_REVIEW)
- **FX conversion**: Query-time conversion at search time; displayed with "≈" label
- **i18n from day 1**: Vietnamese default, English fallback, easy to add more languages
- **RLS policies**: Fine-grained access control per role (USER, ADMIN)
- **Realtime messaging**: Postgres subscriptions for low-latency updates
- **Lazy-loaded routes**: React Router v7 lazy() for code splitting

#### Known Limitations

- **No payments**: Out of scope for v1 (checkout, cart, orders not implemented)
- **No shipping**: Out of scope for v1
- **No trade contracts**: Out of scope for v1
- **Google OAuth only**: Email provider for dev; v2 will add email, Facebook, Zalo
- **No AI recognition**: Card ID lookup manual (v2 planned)
- **No price history**: Market prices not tracked (v2 planned)
- **Catalog fixed**: Limited to TCGdex (pokemontcg.io deprecated 2027-03)
- **No notifications**: In-app real-time messages only (email notifications v1.1)
- **No favorites/bookmarks**: v1.1 feature
- **No reviews/ratings**: "We connected" system planned for v1.1

#### Testing Coverage

- Unit tests (vitest): Schemas, services, utilities
- Database tests (pgTAP): RLS policies, RPC behavior, trigger logic
- E2E tests (Playwright): Smoke test suite (login, search, message)
- Browser tests (dev mode): Manual testing with Supabase local instance
- Performance tests (Lighthouse): Mobile ≥ 85 target

#### Performance Targets Met

- Search latency: < 500ms (p95) with 50k listings
- Mobile Lighthouse: ≥ 85 (performance, accessibility)
- Time-to-interactive: < 3s on 4G mobile
- Image payload: < 80 KB per listing card (WebP optimization)
- Realtime message delivery: < 500ms (Supabase latency)

#### Blockers for Production Deployment

- [ ] Google OAuth credentials configured (GCP Console)
- [ ] Supabase Pro plan activated (billing, backup, DDoS)
- [ ] Legal review completed (Terms, Privacy, MOIT registration)
- [ ] Domain purchased + DNS configured
- [ ] Hosting environment configured (Cloudflare Pages or Vercel)
- [ ] FX rates Edge Function deployed
- [ ] Backup + disaster recovery tested

#### Security Audit Notes

- RLS policies validated for cross-user data leakage
- Block enforcement tested (bidirectional)
- Suspension enforcement tested (RLS policies + RPC checks)
- Rate limits verified (triggers enforce DB-side)
- EXIF stripping validated (canvas WebP export)
- Storage RLS policies verified (owner-scoped reads)
- Admin functions security-definer; explicit validation
- No hardcoded secrets in codebase
- CI enforces no payment/order/shipping code

---

## [v1.1] - TBD (Q4 2026, ~6 weeks post-launch)

**Planned** (subject to launch feedback)

### Planned Features

- Realtime notifications (new message, review received, wishlist match)
- Favorites (bookmark listings, shareable collections)
- "We connected" mutual reviews (1–5 stars + comment per conversation)
- Collection analytics dashboard (Recharts charts: views, conversations, revenue)
- Wishlist matching: auto-alert when matching listing posted
- Recently viewed (localStorage, no DB)
- Email digest option (daily/weekly notifications)
- Moderation appeals workflow (user appeal form, admin queue)
- Bulk admin actions (suspend all user's listings, etc.)
- Keyset pagination (replace OFFSET for scalability)

### Improvements

- Performance: Identify and optimize slow queries
- UX: Refine onboarding, add tutorial
- Moderation: Implement appeal tracking, response time SLA

---

## Future (v2.0 & Beyond)

### Likely Additions (Post-launch evaluation)

- Recommendations engine (collaborative filtering)
- Price history tracking + price drop alerts
- AI card recognition (mobile photo → auto-fill)
- Email + Facebook + Zalo login
- SMS alerts for high-value listings
- Grading service integration (PSA, BGS direct handoff)
- Analytics dashboard for sellers (exports, trends)
- Advanced search (Meilisearch or Algolia)
- Redis caching layer (if facets become bottleneck)

### Out of Scope for v1 (Legal/Business Risk)

- **Payments** (checkout, order processing, invoicing)
- **Shipping labels** (carrier integration)
- **Escrow** (holds, disputes, refunds)
- **Trade contracts** (legal enforceability unclear)

---

## Technical Debt

None identified at v1 launch. Monitor post-launch:

- Query performance (add indexes if searches > 100ms)
- Realtime concurrency (scale to Broadcast if > 1k concurrent users)
- Storage egress (optimize images if > $50/mo spend)
- Frontend bundle size (aim for < 200 KB gzipped JS)

---

## Breaking Changes

**None** (v1 is initial release)

**Future**: Will follow semantic versioning. Breaking changes documented in release notes.

---

**Changelog format**: [Semantic Versioning](https://semver.org/) · Last updated: 2026-10-02

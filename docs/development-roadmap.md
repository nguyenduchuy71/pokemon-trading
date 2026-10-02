# CardSwap Development Roadmap

Feature roadmap with status, effort estimates, and dependencies.

## v1.0 (Launch) — COMPLETE

**Target launch**: October 2026 · **Status**: Code-complete (pending Google OAuth creds, prod deploy, legal review)

### Phase Summary

| Phase | Feature | Status | Effort |
|-------|---------|--------|--------|
| 1 | Foundation & Design System | Complete | 10h |
| 2 | Database Schema, RLS & RPCs | Complete | 14h |
| 3 | Auth (Google OAuth) + Onboarding | Complete | 7h |
| 4 | Catalog Import & Card Picker | Complete | 7h |
| 5 | Collections, Binders & Add Card | Complete | 10h |
| 6 | Marketplace Search & Listing Detail | Complete | 11h |
| 7 | Wishlist | Complete | 4h |
| 8 | Realtime Messaging | Complete | 10h |
| 9 | Public Profile & Safety (Report/Block) | Complete | 5h |
| 10 | Admin Queue & Legal Pages | Complete | 6h |
| 11 | Landing & Dashboard | Complete | 4h |
| 12 | QA, CI, Docs & Deploy | Complete | 8h |
| **Total** | | | **96h** |

### v1.0 Features

**Core**:
- [x] Google OAuth login (email provider in dev)
- [x] Profile setup (username, display name, location, currency preference)
- [x] Dark/Light theme toggle
- [x] Vietnamese + English (i18n)

**Catalog**:
- [x] TCGdex import (EN + JA cards)
- [x] Card search with full-text + trigram
- [x] Filter by set, rarity, type, language

**Collections**:
- [x] Create, rename, delete binders (except default)
- [x] Add/edit/remove cards with condition, printing, grading, value
- [x] Reorder cards via drag-drop
- [x] Collection statistics (total cards, sets, estimated value)
- [x] Photo upload with client-side resize (WebP, EXIF strip)

**Marketplace**:
- [x] List cards (SALE, TRADE, SALE_OR_TRADE)
- [x] Search with advanced filters (sets, conditions, languages, price range, city)
- [x] Sort (recent, popular, price low-to-high)
- [x] Keyset pagination (24 items per page)
- [x] FX conversion (VND ↔ USD, daily refresh via Edge Function)
- [x] Listing detail with seller profile, photos, conversation count

**Wishlist**:
- [x] Create wishlists, add/remove cards
- [x] Set priority (HIGH, MEDIUM, LOW)
- [x] Optional max price + condition constraints
- [x] Public wishlist sharing

**Messaging**:
- [x] Start 1:1 conversations via "Contact owner"
- [x] Realtime messages (Supabase postgres_changes)
- [x] Message types: TEXT, LISTING share, IMAGE upload
- [x] Unread count per conversation
- [x] Block detection (prevent blocked users from messaging)
- [x] Rate limiting (new accounts 10/day, others 50/day)

**Safety**:
- [x] Block user (bidirectional)
- [x] Report user or listing (11 reason types)
- [x] Auto-hide listing at 3+ distinct reports
- [x] Rate limit on reports (20/day per user)
- [x] Admin queue: open reports, hidden listings, suspended users, mod log

**Community**:
- [x] Published Terms, Privacy, Community Guidelines, Prohibited Items
- [x] Safety notice on landing page
- [x] Contact form for support

**Account**:
- [x] Delete account (anonymize data, cascade delete auth)
- [x] Settings page (profile, preferences, language, theme)

---

## v1.1 (Enhancement) — PLANNED

**Timeline**: Q4 2026 (6–8 weeks after v1 launch) · **Effort**: ~60h

### Features

| Feature | Effort | Dependencies | Priority |
|---------|--------|--------------|----------|
| **Notifications** (realtime) | 8h | Realtime infrastructure (postgres_changes or Broadcast) | P0 |
| **Favorites** (bookmark listings) | 4h | New table + RLS | P1 |
| **"We connected" reviews** | 10h | Mutual message threshold + review model | P0 |
| **Collection analytics** (Recharts charts) | 6h | aggregation RPC (v1 has skeleton) | P1 |
| **Wishlist matching** (auto-alert on new listings) | 8h | Webhook/cron on listings + notification | P1 |
| **Recently viewed** (localStorage) | 2h | Client-side tracking (no DB needed) | P2 |
| **Email notifications** (optional digest) | 6h | Supabase functions + SendGrid/Mailgun | P2 |
| **Analytics dashboard** (for sellers) | 10h | Events tracking (views, conversations) | P2 |
| **Moderation appeals UI** | 6h | Appeal form + admin review queue | P1 |
| **Bulk actions** (admin: suspend all listings) | 4h | Mass update RPC | P2 |
| **Total** | | | |

### Detailed Features

#### Notifications
- In-app bell icon (header)
- Real-time notification center
- Types: new message, listing sold/expired, review received, wishlist match
- Do-not-disturb hours (settings)
- Email digest option (daily/weekly)

#### Favorites
- Heart icon on listing cards
- Starred listings in sidebar
- Separate favorites list
- Share favorite list with others (like wishlist)

#### "We Connected" Reviews
- After both users send messages in conversation:
  - Each can leave 1 review (optional)
  - Review: 1–5 stars + comment (max 200 chars)
  - Public profile displays average rating + review count
- Hard to farm (requires actual conversation)

#### Analytics
- Seller dashboard with charts:
  - Views over time (daily)
  - Conversation trends
  - Popular cards (sold this month)
  - Revenue by condition/printing
- Export CSV for spreadsheet analysis

#### Wishlist Matching
- When new listing posted:
  - Check if card exists in any wishlist
  - Alert wishlist owner: "Found Charizard you're looking for! €200"
  - Cron job runs every hour (scan new listings, find matching wishlists)
  - Notification sent via realtime + email

#### Recently Viewed
- Client-side localStorage (no DB storage)
- Show last 20 viewed listings
- Footer section on marketplace
- Clear on logout

---

## v2.0 (Scale) — FUTURE

**Timeline**: 2027 Q1-Q2 (subject to user feedback) · **Effort**: ~120h

### Potential Features

| Feature | Effort | Rationale |
|---------|--------|-----------|
| **Recommendations** (collaborative filtering) | 20h | Drive engagement; discover new collectors |
| **Price history & alerts** | 12h | Track price trends; alert on drops |
| **AI card recognition** (mobile photo → card ID) | 16h | Faster listing creation; quality check |
| **Email + Facebook + Zalo login** | 8h | Lower friction for VN market (not everyone has Google) |
| **SMS alerts** (for high-value listings) | 4h | Reduce fraud; notify immediately |
| **Grading service integration** | 12h | Direct handoff to PSA/BGS; tracking |
| **Escrow (payments out of scope, v1)** | 40h | **Outside v1 scope**; separate team if proceeding |
| **Shipping labels** | 20h | **Outside v1 scope**; separate team if proceeding |
| **Trade contracts** | 16h | **Outside v1 scope**; requires legal review |

### Why Outside v1 Scope

Payments, shipping, trades require:
- Legal review (contracts, liability)
- Payment processor integration (Stripe, Momo, VNPay)
- Fraud prevention (chargeback protection)
- Escrow logic (hold funds, dispute resolution)
- Shipping carrier APIs (tracking)
- Insurance

**Separated to avoid scope creep** and keep v1 launchable in 6 weeks.

### v2 Roadmap Decision
Revisit after v1 launch based on:
- User demand for payment features
- Revenue model (take commission on payments?)
- Team capacity + hiring
- Legal counsel review

---

## Backlog (Not Prioritized)

Features potentially valuable, but not scheduled:

- **Bulk import** (CSV upload of collection)
- **Card valuation API** (fetch market prices from TCGPlayer)
- **Zalo integration** (share listings to Zalo)
- **QR codes** (generate QR for listing, scan to share)
- **Collection insurance estimates** (based on estimated values)
- **Advanced analytics** (heatmaps of popular cards by region)
- **AI moderation** (auto-detect counterfeit red flags)
- **Subscription tiers** (premium badge, featured listings)

---

## Known Limitations & Future Improvements

### Catalog
- **Limited to TCGdex** (pokemontcg.io deprecated 2027-03)
- **Future**: Add more sources if needed (Japanese card shops, local VN sellers)

### Search
- **OFFSET pagination** (keyset cursor in v1.1)
- **Future**: Meilisearch or Algolia for > 100k listings

### Messaging
- **No voice/video** (text only in v1)
- **Future**: Jitsi Meet integration for virtual handoff?

### Images
- **Manual upload** (no AI recognition yet)
- **Future**: Google Vision or custom ML model to auto-fill card details

### FX Rates
- **Daily refresh** (not real-time)
- **Future**: Intraday updates if high-frequency traders use platform (unlikely)

### Moderation
- **Manual review** (no ML classification)
- **Future**: OpenAI API to auto-classify spam/harmful content

---

## Success Metrics (v1)

Measure post-launch to inform v1.1 planning:

| Metric | Target | Tracking |
|--------|--------|----------|
| Daily active users | 100+ (day 30) | Supabase auth.users + session tracking |
| Listings posted | 500+ (day 30) | COUNT(card_listings) |
| Average conversation length | 3+ messages | Message count per conversation |
| Report resolution time | < 24h (avg) | moderation_actions.created_at - reports.created_at |
| Customer support response | < 4h (critical) | Email ticket tracking (external tool) |
| Marketplace search latency | < 500ms (p95) | Lighthouse + custom RUM |
| Mobile conversion | 60%+ of users | Device type from analytics (v1.1) |
| Repeat users | 40%+ (week 2) | Users with > 1 login |
| Page 404 errors | < 1% of requests | Error tracking (Sentry) |

---

## Dependencies

### Blockers for v1 Launch
- [ ] Google OAuth credentials (GCP Console)
- [ ] Supabase Free project created (region: Singapore) — upgrade to Pro only past 80% of a free limit (docs/cost-control.md)
- [ ] Legal review: Terms, Privacy, Community Guidelines
- [ ] MOIT registration (Vietnam e-commerce platform) — **NOT TECHNICAL**

### Blockers for v1.1
- [ ] v1 user feedback + metrics analysis
- [ ] Email service provider chosen (Mailgun, SendGrid)
- [ ] Notification design finalized with team

### Blockers for v2
- [ ] Legal review: payment terms, liability, escrow
- [ ] Payment processor integration design
- [ ] Fraud prevention strategy
- [ ] Shipping carrier partnerships (optional)

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

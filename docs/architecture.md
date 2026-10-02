# CardSwap Architecture

CardSwap is a Pokémon TCG collector discovery + P2P messaging platform for Vietnam. This document describes the system layers, data flow, and key design decisions.

## Overview

**Stack**: React 19 · Vite 8 · TypeScript · Tailwind v4 · React Router 7 · TanStack Query · Zustand · React Hook Form + Zod · i18next · Supabase (Auth, Postgres, Storage, Realtime)

**Scope**: Discovery + Listing + Communication + Community only. No payments, escrow, shipping, orders, or trade contracts (enforced by CI scope guard).

## Folder Structure

```
src/
├── app/
│   ├── providers.tsx          # QueryClientProvider + i18n init + auth listener
│   └── router.tsx             # React Router v7 lazy-loaded routes
├── pages/                     # Page components (lazy-loaded)
├── layouts/
│   └── app-layout.tsx         # Root layout with nav, theme toggle, toasts
├── components/
│   ├── auth/                  # Route guards, login, callback handler
│   ├── marketplace/           # Search, filters, listing cards
│   ├── collection/            # Add card, binder manager, photos
│   ├── messaging/             # Conversation list, thread, message input
│   ├── admin/                 # Reports queue, moderation actions
│   └── ui/                    # Shared: buttons, forms, modals, alerts
├── hooks/
│   ├── use-marketplace-params.ts    # Parse URL search params to filters
│   ├── use-contact-owner.ts         # Start conversation with pre-filled listing
│   ├── use-debounced-value.ts       # Debounce input for search
│   └── use-username-availability.ts # Check username on blur
├── stores/
│   ├── auth-store.ts          # Zustand: session mirror + initialized flag
│   ├── ui-preferences-store.ts # locale, theme, currency, listing draft
│   └── listing-draft-store.ts  # Auto-save listing form state
├── queries/                   # TanStack Query hooks (data fetching)
│   ├── use-marketplace.ts
│   ├── use-catalog.ts
│   ├── use-inbox.ts
│   ├── use-collections.ts
│   ├── use-wishlist.ts
│   └── ... (see list below)
├── services/                  # RPC calls, business logic
│   ├── auth-service.ts
│   ├── marketplace-service.ts
│   ├── catalog-service.ts
│   ├── collection-service.ts
│   ├── messaging-service.ts
│   ├── profile-service.ts
│   ├── wishlist-service.ts
│   ├── admin-service.ts
│   ├── safety-service.ts
│   └── storage-service.ts
├── schemas/                   # Zod validation schemas
│   ├── add-card-schema.ts
│   ├── marketplace-filter-schema.ts
│   ├── collection-item-schema.ts
│   ├── profile-schema.ts
│   └── ...
├── types/
│   ├── database.ts            # Auto-generated from Supabase schema
│   └── models.ts              # App-level types built on database types
├── constants/
│   ├── domain.ts              # Enums: CardCondition, ListingType, Currency, etc.
│   ├── vn-cities.ts           # Vietnamese city names
│   └── ...
├── lib/
│   ├── supabase-client.ts     # Configured Supabase client
│   ├── query-client.ts        # TanStack Query defaults
│   └── i18n.ts                # i18next init + locale sync
├── utils/
│   ├── app-error.ts           # AppError wrapper, check/unwrap utilities
│   ├── image-processing.ts    # Client-side WebP resize, EXIF strip
│   ├── fx-conversion.ts       # Currency conversion via fx_rates table
│   └── ...
├── locales/
│   ├── vi/                    # Vietnamese translations
│   │   ├── common.json
│   │   ├── marketplace.json
│   │   ├── collection.json
│   │   ├── messaging.json
│   │   └── legal.json
│   └── en/                    # English translations (same structure)
└── styles/
    └── globals.css            # Tailwind v4 tokens + global styles
```

## State Management

### Zustand Stores (UI State)
- **authStore**: `session` (Supabase auth), `initialized` (boot flag)
- **uiPreferencesStore**: `locale` (vi/en), `theme` (light/dark), `currency` (VND/USD), serialized to localStorage
- **listingDraftStore**: Form state for "Add Card" page, auto-saved to localStorage to survive page refreshes

### TanStack Query (Server Data)
All API calls via TanStack Query with keys and staleTimes:
- `['marketplace', 'search', filters, currency, userId]` → staleTime: 30s (infinite scroll)
- `['marketplace', 'facets']` → staleTime: 10m (filters sidebar)
- `['listing', id, userId]` → staleTime: 60s (detail page, retryOnError: false)
- `['catalog', query]` → staleTime: 1h (card picker)
- `['inbox']` → staleTime: 0 (realtime subscription active)
- `['collections']` → staleTime: 60s
- `['wishlist']` → staleTime: 60s
- `['profile', username]` → staleTime: 5m (public profile)
- `['me']` → staleTime: 1h (current user profile)

**Invalidation**: On logout/sign-in switch, `queryClient.clear()` prevents data leakage between users.

## Data Flow

### Authentication
1. User clicks "Login with Google" → opens Supabase OAuth flow
2. Google redirects to `/auth/callback` with code/state
3. Supabase session persisted to client storage
4. `startAuthListener()` called at boot restores session, subscribes to auth state changes
5. `useCurrentUserId()` hook reads session from Zustand for query keys
6. On sign-out, `queryClient.clear()` + session set to null

### Listing Creation & Discovery
1. User selects card from TCGdex catalog (search via `search_catalog` RPC)
2. Form state persists in `listingDraftStore` (auto-save)
3. On "Add Card", uploads photos to `card-images` bucket (resized WebP, EXIF stripped)
4. Creates `collection_item` with photos → `card_listing` referencing the item
5. Marketplace search via `search_listings` RPC (joins pokemon_cards + profiles + fx_rates, applies filters/sort)
6. Listing detail fetches via `getListing()` query (includes photos, seller profile)

### Messaging & Realtime
1. User clicks "Contact owner" → `start_conversation` RPC creates/reuses 1:1 conversation
2. RPC enforces blocks, suspension, rate limits (10/day for new accounts, 50/day otherwise)
3. Messages insert to `messages` table via RLS (sender must be conversation member + not blocked/suspended)
4. Supabase Realtime (postgres_changes) subscribes client to new messages in conversation
5. `conversation_members` tracks `last_read_at` for unread badge
6. Inbox view calls `inbox()` RPC (single query: all conversations, last message, unread count, block status)

### Image Pipeline (Client-Side)
1. User selects file → canvas: decode, resize to 320px (thumb) + 960px (medium), re-encode WebP
2. WebP re-encoding strips EXIF/GPS metadata automatically (not lossless rotate info)
3. Both files uploaded to `card-images/{userId}/{itemId}/{uuid}-{thumb|md}.webp`
4. Cache Control: `31536000` (1 year) → safe because filenames are immutable UUIDs
5. Public URLs generated at rest (`publicImageUrl()` reads from storage metadata)

## API Contracts & RPCs

All server-side logic lives in Postgres functions (security-definer where needed). Key RPCs:

| Function | Returns | Notes |
|----------|---------|-------|
| `start_conversation(other_user, listing?)` | uuid (conv_id) | Enforces blocks, suspension, rate limit |
| `inbox(limit?)` | table (last_message, unread_count, is_blocked, …) | Single round-trip inbox |
| `search_listings(filters, sort, cursor)` | table (card, seller, photos, view_count, …) | Joined, FX-converted, RLS respects blocks |
| `search_catalog(query, language?, limit?)` | table (pokemon_cards) | Full-text + trigram search |
| `collection_stats(currency?)` | table (total_cards, estimated_value, …) | Aggregates user's own items |
| `marketplace_facets()` | json | Sets, rarities, languages, printings for sidebar |
| `record_listing_view(listing)` | void | Signed-in viewers only, dedup per viewer/day, visible listings only |
| `is_username_available(username)` | bool | Onboarding check |
| `is_admin()` | bool | Current user admin? |
| `is_active_user()` | bool | Current user suspended? |
| `is_blocked_with(other)` | bool | Caller-scoped block check (either direction); `is_blocked_between` is internal-only |
| `admin_resolve_report(report, status, note?)` | void | Security-definer, logs action |
| `admin_set_listing_moderation(listing, status, note?)` | void | Security-definer, logs action |
| `admin_set_user_status(user, status, note?)` | void | Security-definer, logs action |

## Internationalization (i18n)

**i18next with namespaces per feature:**
- `common.json`: shared strings (buttons, errors)
- `marketplace.json`: search, filters, listing detail
- `collection.json`: add card, binders, photos
- `messaging.json`: conversations, messages
- `legal.json`: Terms, Privacy, Community Guidelines, Prohibited Items
- etc.

**Locale switching**: Stored in `uiPreferencesStore`, synced to i18n on change. Dates/currency via `Intl` (e.g., `new Intl.DateTimeFormat(locale)`, `new Intl.NumberFormat(locale, { style: 'currency' })`).

**Default locale**: Vietnamese (vi). English (en) as fallback.

## Currency & Foreign Exchange

**Dual currency**: VND (Vietnam) and USD. User's preferred currency set in `profiles.preferred_currency`.

**Conversion at query time**:
1. Marketplace search has `p_currency` parameter
2. RPC fetches current rate from `fx_rates` table (updated daily by Edge Function)
3. Price converted: `price * rate` (rounded to 2 decimals)
4. Frontend labels converted prices with "≈" (approximate)

**FX rates table**: `base` (VND/USD) · `quote` (USD/VND) · `rate` · `fetched_at`

**Refresh schedule**: pg_cron job calls Edge Function (`fx-refresh`) daily to fetch from `open.er-api.com` and upsert rates.

**Fallback**: If FX fetch fails, Postgres keeps last-known rate; UI shows estimated label + warning.

## Realtime Design

**Supabase Realtime** (postgres_changes):
- Subscriptions on `messages` table scoped to conversation + respects RLS
- Subscriptions on `conversation_members` table for `last_read_at` updates
- No Realtime on high-volume tables (card_listings → cached via TanStack Query instead)

**Move to Broadcast**: If load grows, switch message subscriptions to Broadcast (ephemeral, less storage cost) and log new messages to a separate audit table.

## Image Handling & CDN

**Client-side resize**: Avoids Supabase Image Transformations cost (Pro plan feature) → canvas WebP encode saves 60–80% bandwidth vs JPEG.

**Storage buckets**:
- `card-images`: public, 2MB limit, WebP/JPEG only (holds thumbnail + medium photos)
- `avatars`: public, 1MB limit, WebP/JPEG only
- `chat-images`: private, 2MB limit, signed URLs for conversation members

**Cache policy**: Public buckets (card-images, avatars) use `cacheControl: 31536000` (1 year) because file names are immutable UUIDs. Chat images expire URLs after 1 hour.

**RLS on storage**: 
- Card photos: first path segment = uploader's userId (enforced by RLS policy)
- Chat photos: first path segment = conversation ID, readable only by members

## Moderation & Admin

**Data model**:
- `reports` table: reporter, target (user or listing), reason, status, resolution
- `moderation_actions` table: admin, action type, target, timestamp (audit log)
- `profiles.status`: ACTIVE or SUSPENDED
- `card_listings.moderation_status`: VISIBLE, HIDDEN_PENDING_REVIEW, REMOVED

**Admin queue** (`/admin` route):
- Open reports (grouped by target user/listing)
- Hidden listings (pending review or removed)
- Suspended users

**Auto-hide trigger**: When 3+ distinct reporters flag a listing, auto-set `moderation_status = HIDDEN_PENDING_REVIEW`.

**Rate limit on reports**: 20 reports/day per user. Enforced by trigger.

**Admin actions**: Via RPCs that write audit rows and update target status. All actions logged.

## Security Considerations

**Row-Level Security (RLS)**: 
- Users can read only their own data (collections, conversations, etc.)
- Public data (marketplace listings, public profiles) readable by anyone
- Admin functions require `is_admin()` check before execution

**Blocked users**:
- Bidirectional block in `blocked_users` table
- RLS blocks access to each other's conversations
- Search RLS filters out listings from blocked users

**Suspended users**:
- Cannot insert new rows (RLS policies check `is_active_user()`)
- Existing data remains visible (conversations, listings)
- Can view platform as read-only

**Storage RLS**:
- Card images: uploader must be first path segment
- Chat images: conversation member must be first path segment
- Prevents users from reading each other's files

**Rate limits**:
- New conversations: 10/day (accounts < 7 days old), 50/day (others)
- Reports: 20/day per reporter

## Future Payment-Readiness

Current design intentionally keeps listing/message tables free of payment fields. Future payment module:
1. Adds its own tables (`orders`, `payments`, `shipments`, etc.)
2. Does not modify core tables
3. Calls `start_trade_flow(listing_id, buyer_id)` RPC to initiate
4. Updates listing status via dedicated flow (not touching card_listings.price)

## Performance Optimizations

**Database**:
- Indexes on (is_active, created_at), (card_id), (owner_id) for common queries
- `pg_trgm` GIN on card name/pokemon for full-text search
- Keyset pagination in marketplace (cursor-based, not OFFSET)

**Frontend**:
- Lazy-loaded routes (React Router v7 lazy())
- TanStack Query staleTime defaults: 60s (reuse within window)
- Image thumbnails (320px) for listing cards; full-size (960px) on detail
- Infinite scroll with `keepPreviousData` for marketplace

**Browser**:
- localStorage: ui preferences, listing draft, recently viewed (client-side only)
- sessionStorage: temp state (focus, scroll position)

## Error Handling

**AppError wrapper**: Custom error type with code/message/context. Services throw AppError; components consume via `toAppError()` helper to show user-facing messages.

**HTTP errors**: Supabase client returns `{ error, data }`. Services check error, throw AppError, or return `null`.

**RLS violations**: Postgres raises exception → Supabase client catches as error → service throws AppError with "Access denied" message.

**Rate limits**: Postgres raises `errcode = 'P0001'` → mapped to "Too many requests, try again in N minutes".

## Testing

**Vitest** (unit/integration):
- Services (FX conversion, search filtering logic)
- Schemas (form validation)
- Utils (image processing, error mapping)

**pgTAP** (RLS, RPC logic):
- RLS policies (read/insert/update/delete per role)
- RPC behavior (blocks, suspension, rate limits)
- Trigger behavior (auto-hide, cascade delete)

**Playwright** (E2E):
- Smoke test: login → search → view listing → send message
- Mobile viewport testing

## Future Considerations

- **Notifications** (v1.1): Realtime alerts for new messages, profile activity (use Broadcast for ephemeral load)
- **Recommendations**: Item-based or user-based collaborative filtering
- **Price history**: Track listing price changes, alert on wishlist matches
- **AI card recognition**: Mobile photo upload → identify card + auto-fill form
- **More auth**: Email, Facebook, Zalo login (current: Google only)
- **Search upgrades**: Algolia or Meilisearch for faceted search + analytics
- **Redis caching**: For high-cardinality facets (sets, rarities) if facets query becomes hot spot

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

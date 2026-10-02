# CardSwap Security Architecture

Security model for data access control, threat mitigation, and compliance.

## Row-Level Security (RLS) Matrix

All tables except `pokemon_cards`, `fx_rates`, `pokemon_species` enforce RLS. Matrix below:

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| **profiles** | Own + public profiles (non-blocked) | ❌ | Own row | Own row | Public fields: username, display_name, avatar_url, bio, location_city, created_at |
| **collections** | Own + public collections (non-blocked users) | Own | Own | Own (except default) | Protected: is_default cannot be deleted |
| **collection_items** | Own + public collections (non-blocked) | Own | Own | Own | Must own target collection (enforced by trigger) |
| **collection_item_photos** | Own + public collections (non-blocked) | Own | Own | Own | |
| **card_listings** | VISIBLE + own listings | Own (security-definer) | Own | Own | Auto-hidden at 3 reports; RLS filters blocked users |
| **wishlists** | Own + public wishlists (non-blocked) | Own | Own | Own | |
| **wishlist_items** | Own + public wishlists (non-blocked) | Own | Own | Own | |
| **conversations** | Members only | Via RPC | ❌ | ❌ | Created by `start_conversation()` RPC |
| **conversation_members** | Own memberships | Via RPC | Own | Via RPC | Block check enforced on insert |
| **messages** | Members of conversation | Members (rate-limited) | ❌ | ❌ | Immutable after creation; sender check on insert |
| **blocked_users** | Own blocks | Own | ❌ | Own | Bidirectional enforcement |
| **reports** | Own + admin | Active user (rate-limited) | ❌ | ❌ | Filed by reporter only; resolved by admin |
| **moderation_actions** | Admin only | Via RPC | ❌ | ❌ | Audit log; immutable |
| **pokemon_cards** | ✅ Public | ❌ | ❌ | ❌ | No RLS (public catalog) |
| **fx_rates** | ✅ Public | Via Edge Fn | Via Edge Fn | ❌ | No RLS (public rates) |

**Legend**: ✅ = No RLS enforced · ❌ = Not allowed · RLS enforced with policies listed in migrations

## Security-Definer Functions

Functions that run as Postgres role `postgres` (bypassing RLS) with explicit validation:

### start_conversation(other_user, listing?)
- **Caller**: Any authenticated user
- **Validations**:
  - Caller is not suspended (`is_active_user()`)
  - Target user is not suspended (`is_user_active(other_id)`)
  - Caller and target are not blocked (internal `is_blocked_between()`; clients only get caller-scoped `is_blocked_with()`)
  - If listing provided, one of caller/target must be seller
  - Rate limit: new accounts (< 7 days) max 10/day; others 50/day
- **Action**: Creates conversation + conversation_members
- **Why security-definer**: Needs to bypass RLS to check blocks; rate-limit check crosses user boundaries

### search_listings(filters)
- **Caller**: Any user (authenticated or anon)
- **Filters**: q, sets, rarities, conditions, languages, printings, types, price range, city, card_id, seller
- **Conversions**: Applies FX conversion to listing prices based on viewer currency
- **RLS applied**: Excludes HIDDEN/REMOVED listings unless viewer is admin; hides listings from blocked sellers
- **Why not security-definer**: Uses INVOKER so RLS applies normally (privacy via RLS, not bypass)

### collection_stats(currency?)
- **Caller**: Any authenticated user (reads own items only via RLS)
- **Returns**: total_cards, unique_cards, sets, estimated_value, listed_for_sale, listed_for_trade, wishlist_count
- **Why invoker**: RLS already filters to own collections

### is_admin(), is_active_user(), is_blocked_with(other) (is_blocked_between(a, b) is not client-executable)
- **Caller**: Used by RLS policies
- **Security definer** to bypass RLS when checking roles
- **No parameters from untrusted input** (block check is deterministic)

### admin_resolve_report(report, status, note?)
- **Caller**: Admin only (RLS policy checks)
- **Security definer** to write moderation_actions (audit table)
- **Validations**:
  - Caller is admin
  - Report exists + is in OPEN state
  - Status is RESOLVED or DISMISSED
- **Action**: Updates report status + logs action

### admin_set_listing_moderation(listing, status, note?)
- **Caller**: Admin only
- **Security definer** for audit logging
- **Validations**: Admin check
- **Action**: Sets listing moderation_status + logs

### admin_set_user_status(user, status, note?)
- **Caller**: Admin only
- **Security definer** for audit logging
- **Validations**: Admin check
- **Action**: Sets user account_status + logs

## Blocking & Suspension Enforcement

### Blocked Users
- **Table**: `blocked_users` (blocker_id, blocked_id) — bidirectional
- **Enforcement Points**:
  1. RLS on `search_listings`: Filters out seller's listings if viewer is blocked by seller (either direction)
  2. RLS on `card_listings`: Reader sees only own listings + public listings from non-blocked sellers
  3. RLS on `conversations`: Prevents querying conversations with blocked user
  4. RPC `start_conversation`: Rejects with "blocked" error
  5. RPC `messages.before_insert trigger`: Rejects message if members are blocked

### Suspended Users
- **Column**: `profiles.status` (ACTIVE or SUSPENDED)
- **Enforcement Points**:
  1. RLS on all writes: `is_active_user()` check on INSERT/UPDATE/DELETE policies
  2. RPC `start_conversation`: Rejects if target is suspended
  3. Existing data remains visible (read-only fallback) — suspended users can view platform but not modify

## Storage RLS Policies

### card-images & avatars buckets
- **Access**: Public (no auth required to read via CDN)
- **Uploads**: Authenticated + `is_active_user()`
- **Path structure**: `{userId}/{rest}`
- **RLS policy**: First path segment must be uploader's userId (enforced by `storage.foldername(name)[1]`)
- **Why public**: Immutable file names (UUIDs) + served via CDN + cache headers (1 year)

### chat-images bucket
- **Access**: Private (signed URLs only)
- **Uploads**: Authenticated conversation members + `is_active_user()`
- **Path structure**: `{conversationId}/{uuid}.webp`
- **RLS policy**: First path segment (conversation ID) must be readable by requester (via `is_conversation_member_text()` function)
- **Signed URLs**: Expire after 1 hour (readability via `signedChatImageUrl()` service)

## Rate Limiting

### Reports
- **Trigger**: `reports_before_insert`
- **Limit**: 20 reports filed per user per calendar day
- **Enforcement**: Raises exception if exceeded → client receives "rate_limited" error
- **Auto-hide**: Listing auto-hidden to HIDDEN_PENDING_REVIEW when 3+ distinct reporters flag it

### Conversations (New)
- **Trigger**: `start_conversation()` RPC
- **Limit**: 
  - New accounts (< 7 days old): 10 new conversations/day
  - Established accounts: 50 new conversations/day
- **Enforcement**: Raises exception → client handles with "rate_limited" message
- **Reuse**: Querying existing conversation with same user does not count against limit

### Messages
- **Trigger**: `messages_before_insert`
- **Limit**: 30 messages/min per sender per conversation
- **Enforcement**: Raises exception → client shows "Too many messages, try again in N minutes"

## Column-Level Access Control

No Postgres column grants beyond role defaults. Control via:
- **RLS SELECT policies**: Define which columns visible to each role
- **RLS INSERT/UPDATE grants**: Specify writable columns (e.g., `GRANT INSERT (username, display_name, bio) ON profiles TO authenticated`)
- **Example**: `profiles` public read exposes only (id, username, display_name, avatar_url, bio, location_city, created_at); hides (preferred_currency, preferred_locale, status, role, terms_accepted_at)

## Image Privacy & EXIF Stripping

### Client-Side Processing
All images re-encoded on client via `canvas` before upload:
1. Decode uploaded image (JPEG, WebP, PNG) via canvas
2. Draw to canvas + resize (thumb: 320px, medium: 960px)
3. Export as WebP via `canvas.toBlob({ type: 'image/webp' })`
4. Upload to `card-images` or `chat-images`

**WebP re-encoding automatically strips EXIF/GPS** (canvas API does not preserve metadata).

### Photo URLs
- Public photos: Direct CDN URL (no expiry) — file names are immutable UUIDs
- Chat photos: Signed URL (1-hour expiry) — regenerate on client if expired

### Data Retention
- Deleted collection items → photos cascade-deleted via `ON DELETE CASCADE`
- Deleted messages with images → chat image files left in bucket (manual cleanup task for v1.1)
- Account deletion → cascade deletes all user's files (via auth.users → profiles trigger)

## Account Deletion & Data Erasure

### Deletion Flow (from /settings)
1. User requests deletion
2. RPC call `delete_account()` (security-definer, customer implemented):
   - Anonymize: Set `profiles.display_name = NULL`, `bio = NULL`, `avatar_url = NULL`
   - Expire: Set `terms_accepted_at = NULL`
   - Messages: Clear `sender_id → NULL` (author name lost but message text preserved for context)
   - Collections: Keep (community benefit from catalog)
   - Listings: Deactivate (`is_active = false`) or delete (per legal requirement)
   - Chat photos: No action (remain in bucket for retention)
- User's auth.users account deleted by Supabase (triggers cascade via REFERENCES)

### GDPR/Privacy Compliance
- No street address, postal code, phone, or payment data stored
- `location_city` only (non-precise)
- Deletion triggers EXIF-stripped photo retention (privacy-safe)
- No cookies or tracking pixels (UI analytics via Recharts client-side only, v1.1)

## Moderation & Admin Model

### Admin Designation
- **Role**: `profiles.role = 'ADMIN'`
- **Assignment**: Manual via SQL (no UI in v1)
  ```sql
  UPDATE profiles SET role = 'ADMIN', updated_at = now() WHERE username = 'moderator_username';
  ```

### Admin Queue (/admin route)
- **Route Guard**: RequireAdmin component checks `is_admin()` RPC + redirects to /dashboard
- **View 1**: Open Reports (OPEN status, sorted by created_at desc)
- **View 2**: Hidden Listings (moderation_status != VISIBLE)
- **View 3**: Suspended Users (status = SUSPENDED)
- **View 4**: Moderation Log (moderation_actions, most recent first)

### Admin Actions
All via RPC (security-definer):
- **Resolve Report**: Call `admin_resolve_report(report_id, status, note)`
  - Log to `moderation_actions` with action = 'resolve_report'
  - Status: RESOLVED (upheld) or DISMISSED (invalid)
- **Hide Listing**: Call `admin_set_listing_moderation(listing_id, status, note)`
  - Status: HIDDEN_PENDING_REVIEW (under review) or REMOVED (policy violation)
  - Log to `moderation_actions`
- **Suspend User**: Call `admin_set_user_status(user_id, SUSPENDED, note)`
  - Prevents future inserts (RLS checks `is_active_user()`)
  - Log to `moderation_actions`

### Audit Logging
Every action creates a row in `moderation_actions`:
- `admin_id` (who did it)
- `action` (text: 'resolve_report', 'hide_listing', 'suspend_user')
- `target_user_id`, `target_listing_id`, `report_id` (what was affected)
- `note` (reason/evidence, max 1000 chars)
- `created_at` (timestamp)

**Immutable**: No updates or deletes to `moderation_actions`.

## Threat Model & Mitigations

| Threat | Risk | Mitigation |
|--------|------|-----------|
| **Cross-user data leak** | High | RLS on all user-scoped tables; block enforcement; `queryClient.clear()` on logout |
| **Unauthorized listing access** | High | RLS on card_listings; moderation_status filtering |
| **Spam/fake listings** | Medium | Real photos required (collection_item_photos); reports trigger auto-hide at 3 distinct reporters |
| **Harassment/bullying** | Medium | Block feature + RLS enforcement; report flow; admin queue |
| **Fake profile impersonation** | Low | Google-only auth (no password spray); username uniqueness constraint |
| **Counterfeits** | Medium | Real photo requirement; community reports; admin review queue |
| **Scam (non-payment)** | High | Out of scope (no payment features in v1); community reviews + feedback loop (v1.1) |
| **EXIF location leak** | Medium | Client-side WebP re-encode strips EXIF before upload |
| **Suspended account re-signup** | Low | Google account already linked; new signup with same email creates new auth.users |
| **Rate limit bypass** | Medium | Postgres triggers enforce at DB level (not bypassed by client) |
| **Admin impersonation** | High | Role check only via SQL; no client-side bypass possible |
| **SQL injection** | Low | Parameterized queries via Supabase client; Zod validation on client |

## Deployment & Secrets

### Environment Variables
- `VITE_SUPABASE_URL`: Public; configurable per environment
- `VITE_SUPABASE_ANON_KEY`: Public; configurable per environment (limited RLS scope)
- Production Supabase: Pro plan required (custom domains, higher limits, DDoS protection)

### Edge Function Secrets
- `FX_CRON_SECRET`: Used by pg_cron to authenticate fx-refresh invocation (stored in Supabase Secrets, not in .env)
- `ALLOWED_ORIGIN`: Whitelist for CORS on fx-refresh callback

### Google OAuth Credentials
- **Development**: OAuth app restricted to localhost:5173 callback
- **Production**: OAuth app restricted to production domain callback (e.g., cardswap.vn/auth/callback)
- Credentials stored in GCP Console (not in code)

### Database Backups
- Supabase Pro plan includes daily backups + 30-day retention
- Point-in-time recovery available via Supabase dashboard

## Legal & Compliance (Vietnam)

### Data Protection
- **Decree 13/2023** (Personal Data Protection Decree): User consent, deletion flow, minimal data collection
- **Privacy Policy**: Required (see legal pages)
- **Terms of Service**: Required (see legal pages)

### E-Commerce Registration
- **MOIT registration** (Ministry of Industry & Trade): Platform likely counts as e-commerce trading platform → registration required before public launch (non-tech, legal team responsibility)
- **Operating rules**: Published on online.gov.vn; complaint channel required

### Content Moderation
- **Community Guidelines**: Published + enforced (see legal.json)
- **Prohibited Items**: Published list (counterfeit cards, etc.)
- **Takedown Policy**: Report → admin review → removal/hiding

## Testing & Validation

### pgTAP Tests (supabase/tests/)
- RLS enforcement: User cannot read/modify other users' data
- Block enforcement: Blocked users cannot interact
- Suspension enforcement: Suspended users cannot insert
- Rate limits: Caps enforced at trigger level
- Cascade deletes: Profile deletion cascades to all owned rows

### E2E Tests (Playwright)
- Login → select card → add listing → verify marketplace shows listing
- User A messages User B → User B receives realtime update
- User A blocks User B → User B cannot see User A's new listings
- Admin approves/rejects report → moderation_actions log entry created

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

## Security review hardening (2026-10-02)

Findings from `plans/reports/code-reviewer-261002-1600-cardswap-v1-review.md`, all fixed and covered by `supabase/tests/004-hardening.test.sql`:

| Finding | Fix |
|---|---|
| Photo rows could be re-pointed to another user's item / external URL | Table UPDATE revoked; only `position` is updatable on `collection_item_photos` |
| `is_default`, `owner_id`, `card_id` updatable despite column REVOKEs | Table-level UPDATE revoked on collections, collection_items, wishlists, wishlist_items; explicit per-column grants |
| Removed listing could be relisted via unlist + new listing | `card_listings_validate` rejects activation while the copy has a non-VISIBLE listing (`listing_under_moderation`) |
| Deleting a listing/account erased reports | Report FKs `on delete set null` + `target_snapshot` jsonb captured at insert |
| Phantom photo rows satisfied the real-photo rule | Activation requires the medium file to exist in `storage.objects` (absolute URLs only writable by trusted SQL) |
| Listed copy could change card or drop below listed quantity | `collection_items_guard_listed` trigger |
| Anyone could probe who blocked whom | `is_blocked_between` revoked from clients; caller-scoped `is_blocked_with` |
| Anonymous view inflation | Only signed-in viewers counted; visible listings only; dedupe rows pruned |
| Concurrent first contact → duplicate conversations | Per-pair advisory lock in `start_conversation`; hidden listings not counted |
| Per-row `is_admin()` in RLS | Wrapped as `(select public.is_admin())`; seller status inlined |

Accepted (low): `profiles.role/status` are publicly readable (admin usernames discoverable); `ALLOWED_ORIGIN` must be set in production (defaults to `*`).

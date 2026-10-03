# CardSwap Cost Control — $0 Free-Tier Plan

CardSwap v1 runs on free tiers only: **Supabase Free + Cloudflare Pages (or Vercel Hobby) + Google OAuth**.
This document lists the limits, what they translate to in users/messages, and when to upgrade.

> Limits verified 2026-10-02 from vendor pricing pages (links at the end). Vendors change quotas; re-check before launch.
> Row sizes below were **measured** on the local schema (200k synthetic messages, rolled back). Photo sizes are **estimates** for 960 px / 320 px WebP at quality 0.82.

## TL;DR — what the free stack can carry

| Capacity | Free-tier ceiling | Binding limit |
|---|---|---|
| Monthly active users (MAU) | **~600 heavy – 2,500 light** | Supabase egress (5 GB + 5 GB cached) |
| Users online at the same time | **~200** (≈ 1,500–2,000 daily actives) | Realtime 200 concurrent connections |
| Registered accounts | ~5,000 before DB pressure | 500 MB database |
| Listings with real photos | **~2,500 (2 photos) – 5,000 (1 photo)** | 1 GB storage |
| Chat messages sent per month | **~400,000** (≈ 13,000/day) | 2 M Realtime messages/month |
| Chat messages stored in total | **~45 MB** (7-day retention, any volume) | Messages purged automatically |
| Message retention | **7 days** (then auto-deleted) | Daily purge-chat job |

### Free-tier user caps

| Cap | Limit | Enforced by |
|---|---|---|
| Active users (signup cap) | 100 | Waitlist (auto FIFO promotion) |
| Waitlisted users (queue) | Unlimited (auto-promoted when slot opens) | `profiles.status = WAITLISTED` |
| Text messages per user per 24h | 200 | Database trigger `messages_before_insert` |
| Image messages per user per 24h | 5 | Database trigger `messages_before_insert` |
| Cards per user (collection items) | 20 | Database trigger `collection_items_limit` |
| Photos per card | 3 | Database trigger `collection_item_photos_limit` |
| Card image dimensions | 800 px max | Client-side resize (Web P, quality 0.75) |
| Card image file size | 1 MB max | Storage bucket policy |
| Admin activation | Manual via SQL | Override waitlist (set `status = 'ACTIVE'`) |

**Rule of thumb:** comfortable for a launch community of **a few hundred to ~2,000 active collectors**. Egress and photo storage run out first, not auth or messaging.

## Services and free limits

### Supabase Free ($0)

| Resource | Free limit | CardSwap usage |
|---|---|---|
| Database | 500 MB (shared CPU, 500 MB RAM) | Catalog + users + messages (see budget) |
| File storage | 1 GB, max 50 MB/file | Card photos, avatars, chat photos |
| Egress | 5 GB uncached + 5 GB cached / month | API JSON + Storage images (catalog images are **not** counted — served by TCGdex CDN) |
| Auth | 50,000 MAU | Google sign-in only → no SMTP cost |
| Realtime | 200 concurrent connections, 2 M messages/month, 100 msg/s, 100 channels/connection | Inbox + open thread per tab (one socket per tab) |
| Edge Functions | 500,000 invocations/month | `fx-refresh` once/day (~30/month), `delete-account` (rare) |
| Projects | 2 active | prod + staging |
| Backups | **None** | Use the free GitHub Actions dump (below) |
| Logs | 1 day API/DB, 1 hour auth | Debug fast |
| Pausing | **Paused after 1 week without activity** | Real traffic keeps prod awake; ping staging (below) |

Over a limit on Free: Supabase emails you and gives you a grace period. After that, the project can be restricted under its Fair Use Policy (for example, a full database becomes read-only). Nothing is charged automatically, because Free has no card on file.

### Static hosting ($0)

| | Cloudflare Pages Free (**recommended**) | Vercel Hobby |
|---|---|---|
| Bandwidth | Unlimited static | 100 GB/month |
| Requests | Unlimited static | 1 M CDN requests/month |
| Builds | 500/month, 1 concurrent | 100 deployments/day |
| Commercial use | Allowed | **Non-commercial / personal only** |
| Over limit | — | Feature paused until 30 days pass |

CardSwap is a pure SPA (no server functions), so it never touches serverless quotas.
**Pick Cloudflare Pages for a public launch**: Vercel's fair-use terms forbid commercial use on Hobby, which includes ads, sponsorships, or a team being paid to build it. A free `*.pages.dev` subdomain avoids even the domain cost.

### Google Cloud (Google OAuth) ($0)

- The OAuth client and consent screen are free. You **don't need a billing account or the $300 GCP trial**. Don't enable billing.
- **Testing** mode allows at most **100 test users**, each added by hand, and their sign-ins expire after 7 days. Before launch, set the consent screen to **In production**.
- With only `openid`, `email` and `profile` scopes there is **no verification and no user cap**. Showing a logo on the consent screen requires brand verification, which is free and takes a few days.

### Other free dependencies

| Service | Use | Limit |
|---|---|---|
| TCGdex API + CDN | Catalog import, card images | Free, no key; images don't hit our egress |
| open.er-api.com | Daily VND/USD rate | Free tier updates daily; we call once/day |
| GitHub Actions | CI (unit, pgTAP, Playwright) | Public repo: unlimited. Private: 2,000 min/month (≈ 200 CI runs at ~10 min) |

**Only optional cost:** a custom domain (`.vn` or `.com`, ~$10–35/year). Skip it by using `cardswap.pages.dev`.

## How to change a limit

All per-user quotas live in the `app_settings` table and can be tuned without deploying code:

```sql
-- View current settings
SELECT key, value FROM public.app_settings;

-- Change a limit (example: raise card cap to 30)
UPDATE public.app_settings SET value = 30 WHERE key = 'max_collection_items';

-- Available keys:
-- max_active_users: total active user slots (100)
-- msg_text_per_day: text messages per rolling 24h (200)
-- msg_image_per_day: image messages per rolling 24h (5)
-- max_collection_items: cards per user (20)
-- max_photos_per_item: photos per card (3)
-- message_retention_days: purge messages after N days (7)
```

Changes take effect immediately; no restart needed. The database enforces the new limits on all inserts.

## How the numbers were derived

### Database budget (500 MB, keep 20% headroom → ~400 MB usable)

| Item | Measured / estimated size | Notes |
|---|---|---|
| Supabase system schemas | ~25 MB | auth, storage, realtime |
| Card catalog | ~1.6 KB/card incl. trigram index → **~60 MB** for EN+JA (36.5k cards), ~38 MB EN only (23.7k) | Measured on seed |
| Per registered user | ~30 KB | profile + ~50 collection items + photo rows + ~5 listings + wishlist |
| Listing views | ~100 B per (listing, viewer, day) | `listing_views_daily` grows with traffic |
| **Message** | **~310 B/row incl. indexes** (≈ 100-byte Vietnamese text) | Measured: 200k rows |

Scenario **2,000 registered users**: 25 + 60 + 60 + ~20 (views) ≈ 165 MB, which leaves **~235 MB ≈ 700k messages**.
Scenario **5,000 registered users**: 25 + 60 + 150 + ~30 ≈ 265 MB, which leaves **~135 MB ≈ 400k messages**.

### Message retention — how long messages stay

**Current behaviour (v1):** messages and chat photos are deleted automatically after **7 days** via a daily `purge-chat` job (pg_cron + pg_net). Conversations and members are kept so the inbox still lists the contact.

Messages deleted before they fill the DB—at any volume, retention is always 7 days:

| Messages sent / month | ≈ per day | DB impact |
|---|---|---|
| 20,000 | 650 | Minimal (~3 MB/month after 7d purge) |
| 50,000 | 1,700 | ~8 MB/month after 7d purge |
| 100,000 | 3,300 | ~16 MB/month after 7d purge |
| 200,000 | 6,700 | ~33 MB/month after 7d purge |
| 400,000 (Realtime cap) | 13,000 | ~65 MB/month after 7d purge |

The 7-day window prevents DB bloat and handles disk space efficiently. Chat images (stored separately) are also purged after 7 days.

**Future expansion (v1.1):** May add configurable retention periods per app_settings, and prune `listing_views_daily` rows older than 90 days.

### Realtime (2 M messages/month, 200 concurrent)

Realtime counts **one message per listening client** for each database change. A chat message currently produces about **4–5 deliveries**:
- the sender's and the recipient's inbox channels;
- each open thread channel;
- the read-receipt `conversation_members` update.

2 M ÷ ~5 ≈ **400k chat messages/month** nominal budget. **However**, the database quota of 200 text messages per user per day (100 active users × 200/day) caps real-world throughput to **~20k messages/day** practical max across all users. Worst-case *if* everyone hit their quota daily (unrealistic): 100 × 200 × 5 deliveries = 100k Realtime events/day ≈ 3 M/month — **above the free tier budget**. Realistic usage patterns will stay well within 2 M/month because:
- Not all users message daily
- Most send far fewer than 200 messages
- The rate limit (20 messages/min) prevents spiking

Each browser tab holds **one WebSocket**, with its channels multiplexed. So 200 connections ≈ 200 people online at once. Typical peak-to-daily ratios put that at **~1,500–2,000 daily active users**.

> Optimisation (v1.1): the inbox subscribes to *all* `messages` INSERTs and Realtime checks RLS for every online user on every insert. Subscribing only to the user's own `conversation_members` updates would cut the deliveries per message and the database load on the shared CPU. This will lower Realtime pressure further.

### Storage (1 GB)

| Object | Estimated size |
|---|---|
| Card photo (320 px thumb + 800 px medium WebP, q0.75) | ~100 KB |
| Avatar (256 px WebP) | ~25 KB |
| Chat photo (800 px WebP, q0.75, purged after 7 days) | ~80 KB |

**Worst-case capacity** (2,000-user scenario):
- 2,000 avatars: ~50 MB
- ~2,000 card photos (3 per card, 20 cards/user): ~600 MB
- Chat photos: ~0 MB (7-day retention cleans these automatically)
- **Total: ~650 MB of 1 GB** — comfortable margin

That supports **~5,000 card photos** (2,500 listings at 2 photos each, or more at 1 photo). Each user is capped at 20 cards (3 photos max per card) = ~6 MB per user.

The app enforces the cap: `max_photos_per_item = 3` (configurable via app_settings).

### Egress (5 GB + 5 GB cached)

| Per active user / month (heavy) | |
|---|---|
| 15 marketplace pages × 24 thumbs × ~20 KB | ~7 MB |
| 20 listing details × ~2 medium photos | ~5 MB |
| API JSON, chat, avatars | ~4 MB |
| **Total** | **~16 MB** → 10 GB ÷ 16 MB ≈ **600 MAU** |

Casual users (~4 MB) push this to **~2,500 MAU**. Immutable file names plus 1-year cache headers mean repeat views cost nothing.
**Biggest lever (v1.1):** the grid already falls back to the official TCGdex image when a listing has no photo. Always showing the TCGdex image in the grid, and loading user photos only on the detail page, removes ~40% of egress.

## Keeping a free project healthy

- **Backups (none on Free):** run a weekly GitHub Actions job with `supabase db dump --db-url "$SUPABASE_DB_URL" -f backup.sql`, uploaded as a private artifact (90-day retention). Storage objects aren't included; card photos can be re-uploaded, so accept that risk or mirror them occasionally.
- **Pausing:** prod stays awake with real traffic. Staging needs a scheduled GitHub Actions `curl` to its REST endpoint every 3 days.
- **Weekly check** (Supabase Dashboard → Usage): database size, storage, egress, Realtime messages, peak connections.

## Upgrade triggers

Upgrade to **Supabase Pro ($25/month)** when any of these stays above **80%** for two weeks:

| Metric | Free limit | Pro includes |
|---|---|---|
| Database size | 500 MB | 8 GB |
| Storage | 1 GB | 100 GB |
| Egress | 5 GB + 5 GB cached | 250 GB |
| Realtime peak connections | 200 | 500 |
| Realtime messages | 2 M | 5 M |
| Backups | none | daily, 7 days |

Pro also removes pausing. Hosting stays free on Cloudflare Pages at any realistic CardSwap scale. Redis or a search engine isn't needed until search latency is a real complaint (well past 50k listings).

## Sources

- [Supabase pricing](https://supabase.com/pricing)
- [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Realtime message billing](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Google OAuth unverified apps / test users](https://support.google.com/cloud/answer/15549945)

---

**Last updated**: 2026-10-02 · **Version**: v1 (free-tier launch)

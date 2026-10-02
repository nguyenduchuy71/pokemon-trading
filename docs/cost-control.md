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
| Chat messages stored in total | **~700,000** (2,000 users) / ~400,000 (5,000 users) | 500 MB database |
| How long messages are kept | Until the DB fills — see retention table | 500 MB database |

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

**Current behaviour:** messages have no automatic expiry. They stay until the conversation is removed. If a user deletes their account, the messages they sent remain, shown as "Deleted collector". So "how long" depends on volume against the space left (2,000-user scenario, ~700k messages):

| Messages sent / month | ≈ per day | DB fills in |
|---|---|---|
| 20,000 | 650 | ~3 years |
| 50,000 | 1,700 | ~14 months |
| 100,000 | 3,300 | ~7 months |
| 200,000 | 6,700 | ~3.5 months |
| 400,000 (Realtime cap) | 13,000 | ~7 weeks |

Recommended policy when the DB passes ~70% (not implemented yet, v1.1):
- Delete text messages older than **12 months** (`pg_cron` daily job).
- Delete **chat photos older than 90 days**. They live in the private `chat-images` bucket and take storage, not DB space.
- Prune `listing_views_daily` rows older than **90 days**. The aggregate `view_count` lives on `card_listings`, so nothing visible is lost.
- If you adopt this, add the retention periods to the Privacy page (`legal.json`).

### Realtime (2 M messages/month, 200 concurrent)

Realtime counts **one message per listening client** for each database change. A chat message currently produces about **4–5 deliveries**:
- the sender's and the recipient's inbox channels;
- each open thread channel;
- the read-receipt `conversation_members` update.

2 M ÷ ~5 ≈ **400k chat messages/month**. The server-side rate limit (20 messages/min/user) stops one account from burning the quota.

Each browser tab holds **one WebSocket**, with its channels multiplexed. So 200 connections ≈ 200 people online at once. Typical peak-to-daily ratios put that at **~1,500–2,000 daily active users**.

> Optimisation (v1.1): the inbox subscribes to *all* `messages` INSERTs and Realtime checks RLS for every online user on every insert. Subscribing only to the user's own `conversation_members` updates would cut the deliveries per message and the database load on the shared CPU.

### Storage (1 GB)

| Object | Estimated size |
|---|---|
| Card photo (320 px thumb + 960 px medium WebP) | ~140 KB |
| Avatar (256 px WebP) | ~25 KB |
| Chat photo (960 px WebP) | ~120 KB |

With 2,000 avatars (50 MB) and ~2,000 chat photos (240 MB), **~700 MB** is left for listing photos. That's **~5,000 photos**: about 2,500 listings at 2 photos each, or 5,000 at 1. Up to 6 photos per item are allowed today (`MAX_PHOTOS`).
Free-tier levers: lower `MAX_PHOTOS` to 2–3, apply the 90-day chat-photo retention, and nudge users to photograph only the cards they list.

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

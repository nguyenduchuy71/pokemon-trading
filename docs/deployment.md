# CardSwap Deployment Guide

Setup, CI/CD, and launch checklist for local development and production.

## Local Development Setup

### Prerequisites
- Node.js 24+
- Docker Desktop (for Supabase local instance)
- Git

### 1. Environment Setup

Clone repo and install:
```bash
git clone <repo>
cd pokemon-trading
npm ci
```

Create `.env.local` (dev secrets):
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<get from `supabase start` output>
```

### 2. Supabase Local Instance

Start local Postgres + Auth + Storage:
```bash
supabase start
```

Output includes:
```
API URL: http://127.0.0.1:54321
API Key: <ANON_KEY>
...
```

Copy `API Key` into `.env.local` as `VITE_SUPABASE_ANON_KEY`.

### 3. Database Seeding

Migrations auto-run on `supabase start`. Seed data (optional):
```bash
psql postgres://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
```

Or use Supabase Studio: http://localhost:54323

### 4. Dev Logins (Test Accounts)

Local auth uses email provider (no Google OAuth). Test accounts:
- Email: `alex@cardswap.dev` / Password: `cardswap-dev`
- Email: `bao@cardswap.dev` / Password: `cardswap-dev`
- Email: `chi@cardswap.dev` / Password: `cardswap-dev`
- Email: `dung@cardswap.dev` / Password: `cardswap-dev`
- Email: `mod@cardswap.dev` / Password: `cardswap-dev` (admin role)

The seed already makes `moderator` (mod@cardswap.dev) an admin. To promote another account:
```sql
UPDATE profiles SET role = 'ADMIN' WHERE username = '<username>';
```

### 4b. Google sign-in locally (optional)

Disabled by default — the login page shows a notice and the "Continue with Google" button is disabled until you do this:

1. Google Cloud Console → APIs & Services → Credentials → **Create credentials → OAuth client ID** → *Web application* (configure the consent screen first if prompted; "External", test users = your Google account).
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://127.0.0.1:54321/auth/v1/callback` (Supabase Auth's callback — **not** the app URL)
2. Create `supabase/.env` (gitignored):
   ```bash
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=GOCSPX-xxxxxxxx
   ```
3. In `supabase/config.toml`, set `enabled = true` under `[auth.external.google]`.
4. Restart: `supabase stop && supabase start`, then open the app at **http://localhost:5173** (must match `site_url`; `127.0.0.1:5173` is also allow-listed).

Check it took effect: `curl -s http://127.0.0.1:54321/auth/v1/settings -H "apikey: <anon key>"` → `"google": true`.
A new Google user lands on `/onboarding` (username, city, Terms) before reaching the dashboard.

### 5. Dev Server

```bash
npm run dev
```

App runs at http://localhost:5173

### 6. Catalog Import (Optional)

```bash
npm run catalog:import
```

Imports English + Japanese cards from TCGdex. Run once or with flags:
```bash
npm run catalog:import -- --sets sv05pt,sv04.5,sv04  # Specific sets
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server + Supabase local |
| `npm run build` | Minified production build |
| `npm run lint` | Run oxlint (code quality) |
| `npm run typecheck` | Run TypeScript compiler |
| `npm test` | Run vitest (unit tests) |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:start` | Start Supabase (same as `supabase start`) |
| `npm run db:reset` | Reset local Postgres (lose all data) |
| `npm run db:test` | Run pgTAP tests (RLS, RPCs) |
| `npm run db:types` | Regenerate `src/types/database.ts` |
| `npm run catalog:import` | Seed pokemon_cards from TCGdex |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run scope-guard` | Check for forbidden payment-related code |
| `npm run preview` | Preview production build locally |

## CI/CD Pipeline

### GitHub Actions Workflow (.github/workflows/ci.yml)

**Triggers**: Push to main · Pull requests

**Jobs**:
1. **app** (node:24, ubuntu-latest)
   - Checkout, install dependencies
   - Scope guard (check: no payments/orders/shipping/trades)
   - Lint (oxlint)
   - Type check (tsc)
   - Unit tests (vitest run)
   - Build (vite build)

2. **database-and-e2e** (ubuntu-latest + Supabase CLI)
   - Start local Supabase (migrations + seed)
   - RLS & RPC tests (pgTAP)
   - Type generation check (regenerated types match committed)
   - E2E smoke tests (Playwright on local Supabase)
   - Upload Playwright traces on failure

**Concurrency**: Cancel in-progress runs for same ref

**Artifacts**: `test-results/` (Playwright traces) on test failure

## Production Deployment

### Prerequisites
- Supabase project on the Free plan (`cardswap` org account); Pro only when a limit in docs/cost-control.md passes 80%
- Google OAuth credentials (GCP Console)
- Cloudflare Pages or Vercel account
- .env secrets configured in hosting platform

### 1. Supabase Production Setup

Create new Supabase project in organization:
- Region: Singapore (ap-southeast-1) — close to Vietnam
- Backups: none on Free — set up the weekly `supabase db dump` GitHub Action (docs/cost-control.md → Keeping a free project healthy)
- Extensions: pg_trgm (enabled), pg_net (for cron webhooks)

### 2. Apply Migrations

```bash
supabase link --project-ref <ref>
supabase db push  # Applies migrations to prod
```

Verify schema:
```bash
supabase gen types typescript --project-ref <ref> > /tmp/prod-types.ts
diff src/types/database.ts /tmp/prod-types.ts  # Should be empty
```

### 3. Production Environment Variables

Create `.env.production` (or configure in hosting platform):
```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<prod anon key from Supabase settings>
```

**Get keys from Supabase Dashboard**:
1. Project Settings → API
2. Copy Project URL + Anon Key

### 4. Google OAuth Setup

1. **GCP Console** → Create OAuth 2.0 Client ID (Web application)
2. **Authorized redirect URIs**:
   ```
   https://cardswap.vn/auth/callback
   https://cardswap.vn/auth/callback/
   http://localhost:5173/auth/callback (dev only)
   ```
3. Download credentials JSON
4. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google
   - Paste Client ID + Client Secret
   - Set redirect URL to `https://cardswap.vn/auth/callback`

### 5. Cloudflare Pages or Vercel Deployment

#### Option A: Cloudflare Pages
```bash
npm run build
wrangler pages publish dist/
```

Create `_redirects`:
```
# SPA routing: all non-matching routes → index.html
/*    /index.html    200
```

Create `_headers`:
```
[/]
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

[/*.js]
  Cache-Control: public, max-age=31536000, immutable

[/*.css]
  Cache-Control: public, max-age=31536000, immutable
```

#### Option B: Vercel
```bash
npm run build
vercel deploy
```

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

Set secrets in Vercel Dashboard.

### 6. FX Rate Daily Refresh

Setup pg_cron + Edge Function to refresh rates from open.er-api.com:

**Edge Function** (`supabase/functions/fx-refresh/index.ts`):
```ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  const secret = req.headers.get("authorization")
  if (secret !== `Bearer ${Deno.env.get("FX_CRON_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const res = await fetch("https://open.er-api.com/v6/latest/vnd")
  const data = await res.json()
  const rate = data.rates.usd

  await supabase.from("fx_rates").upsert([
    { base: "VND", quote: "USD", rate: 1/rate, fetched_at: new Date() },
    { base: "USD", quote: "VND", rate, fetched_at: new Date() }
  ], { onConflict: "base,quote" })

  return new Response("OK")
})
```

**pg_cron Job** (one-time setup):
```sql
SELECT cron.schedule(
  'fx-refresh-daily',
  '0 8 * * *',  -- 8 AM daily
  'SELECT net.http_post(
    url := ''https://<project>.supabase.co/functions/v1/fx-refresh'',
    headers := jsonb_build_object(''x-cron-secret'', ''<FX_CRON_SECRET>''),
    body := ''{}''::jsonb
  )'
);
```

### 7. Account Deletion Edge Function (v1, required)

`supabase/functions/delete-account` (verify_jwt = true) deletes the **caller's** files in `card-images/{uid}` and `avatars/{uid}`, then the auth user; FK cascades remove profile, collections, items, listings, wishlists and blocks. Messages they sent stay for recipients with `sender_id = null` ("Deleted collector"); reports they filed keep `reporter_id = null`.

```bash
supabase functions deploy delete-account
supabase secrets set ALLOWED_ORIGIN=https://cardswap.vn
```

## Launch Checklist

### 1. Code & Tests (2 days before)
- [ ] All tests passing (`npm test`, `npm run db:test`, `npm run e2e`)
- [ ] Scope guard passes (no payment code)
- [ ] Lint passes (no errors)
- [ ] Type check passes (no TS errors)
- [ ] Build succeeds (`npm run build`)

### 2. Legal & Compliance (1 week before)
- [ ] Terms of Service reviewed by legal counsel
- [ ] Privacy Policy reviewed by legal counsel
- [ ] Community Guidelines finalized
- [ ] Prohibited Items list finalized
- [ ] Contact page + support email set up
- [ ] **MOIT Registration** prepared (non-tech; product team: Submit to online.gov.vn before public launch)

### 3. Supabase Production (3 days before)
- [ ] Pro plan activated (billing info entered)
- [ ] Backup schedule confirmed (daily)
- [ ] SSL certificate auto-renews (Supabase handles)
- [ ] Database version current
- [ ] pg_cron + pg_net extensions enabled
- [ ] RLS policies tested in prod (run pgTAP against prod)

### 4. Google OAuth (2 days before)
- [ ] OAuth app created in GCP Console
- [ ] Client ID + Secret entered in Supabase Google provider
- [ ] Redirect URI tested (login → redirects back correctly)
- [ ] No 401/403 errors on auth flow

### 5. Hosting & DNS (2 days before)
- [ ] Domain purchased + DNS configured
- [ ] CNAME/A records point to hosting (Cloudflare Pages or Vercel)
- [ ] SSL certificate issued (auto-issued by Cloudflare/Vercel)
- [ ] Site accessible at https://cardswap.vn
- [ ] 301 redirects for www → apex domain (if needed)

### 6. FX Rates (1 day before)
- [ ] Edge Function deployed and tested
- [ ] pg_cron job created + first run verified
- [ ] Rates updating daily
- [ ] Fallback rate handling confirmed (UI shows "≈" if stale)

### 7. Final QA (1 day before)
- [ ] Smoke test: Login → Search → View listing → Send message
- [ ] Mobile viewport: Tap-through key flows on iPhone 12
- [ ] Accessibility: Tab navigation, screen reader (NVDA/VoiceOver)
- [ ] Lighthouse: Mobile ≥ 85 (performance + accessibility)
- [ ] Error handling: Simulate network errors, show graceful messages
- [ ] Admin queue: Create test report → admin resolves → audit log verified

### 8. Monitoring & Alerts (On launch)
- [ ] Sentry (or alternative error tracking) connected
- [ ] Uptime monitoring configured (Pingdom, Uptime Robot)
- [ ] Admin notified if > 5 errors/min
- [ ] Database metrics dashboard accessible

### 9. Launch (GO LIVE)
- [ ] Update landing page with "Now available" banner
- [ ] Send announcement (email, social)
- [ ] Monitor errors + performance (first 24 hours)
- [ ] Be ready to revert if critical bug found

## Post-Launch Monitoring

### Daily
- Check error rates (Sentry or console)
- Monitor database performance (slow queries)
- Review new reports in admin queue

### Weekly
- Analyze user feedback + bug reports
- Check FX rates are updating (last fetch time)
- Review Lighthouse scores (performance regression)

### Monthly
- Database storage usage (approaching limits?)
- Storage egress (image downloads spike?)
- Realtime connections (spike on new features?)

## Rollback Plan

If critical bug found post-launch:

1. **App**: Revert to previous commit + redeploy
   ```bash
   git revert <bad-commit>
   # Cloudflare Pages: Re-run build
   # Vercel: Auto-redeploys on git push
   ```

2. **Database**: Supabase point-in-time recovery
   - Supabase Dashboard → Backups → Restore to time T
   - Usually < 5 min (recovery time objective)

3. **Communication**: Post-mortem on Discord/email

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

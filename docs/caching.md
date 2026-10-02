# CardSwap Caching & Performance

Caching strategy across TanStack Query, browser storage, database indexes, and CDN.

## TanStack Query Configuration

### Default Settings
```ts
// src/lib/query-client.ts
staleTime: 60_000,      // 1 minute default
gcTime: 5 * 60_000,     // 5 minutes garbage collection
retry: 1,               // Retry failed queries once
refetchOnWindowFocus: false  // Don't auto-refetch on window focus
```

### Per-Query Staleness & Strategy

| Query Key | Endpoint | staleTime | Strategy | Notes |
|-----------|----------|-----------|----------|-------|
| ['marketplace', 'search', ...] | `search_listings()` | 30s | Infinite scroll | keepPreviousData; pages cached independently |
| ['marketplace', 'facets'] | `marketplace_facets()` | 10m | Manual refetch | Sidebar filters; rarely changes |
| ['listing', id, userId] | `getListing()` | 60s | Manual refetch | Detail page; retryOnError: false |
| ['catalog', query] | `search_catalog()` | 1h | Manual refetch | Card picker; long-lived |
| ['inbox'] | `inbox()` | 0s | Realtime + poll | Realtime subscription active; no caching |
| ['collections'] | Collection queries | 60s | Manual refetch | Add/edit flows invalidate |
| ['wishlist'] | Wishlist queries | 60s | Manual refetch | Add/edit flows invalidate |
| ['profile', username] | `public_profile()` | 5m | Manual refetch | Public profiles cache longer |
| ['me'] | Current user profile | 1h | Manual refetch | Invalidated on signup/settings change |
| ['safety', query] | Safety checks (blocked, reports) | 5m | Manual refetch | Moderation data; cache conservatively |

### Invalidation Map

Actions that trigger `queryClient.invalidateQueries()`:

| Action | Invalidates | Reason |
|--------|------------|--------|
| Add listing | ['marketplace', 'search', ...] | New listing appears in search |
| Edit/deactivate listing | ['listing', id] · ['marketplace', 'search', ...] | Seller updated their data |
| Add collection item | ['collections'] | Count/stats changed |
| Delete item | ['collections'] | Item removed |
| Update profile | ['me'] · ['profile', username] | Avatar/bio changed |
| Block user | ['marketplace', 'search', ...] · ['profile', username] | Blocked user's listings hidden |
| Send message | ['inbox'] | New message in thread (realtime handles UI; poll for ordering) |
| Logout | `queryClient.clear()` | Wipe all user data; prevents leakage to next user |

### Infinite Scroll (Marketplace)

```ts
useInfiniteQuery({
  queryKey: ['marketplace', 'search', filters, currency, userId],
  queryFn: ({ pageParam }) => searchListings(filters, currency, pageParam),
  initialPageParam: 0,
  getNextPageParam: (last, all) => (last.length === 24 && all.length < 100 ? all.length : undefined),
  placeholderData: keepPreviousData,  // Show old data while new page loads
})
```

**Cursor**: OFFSET-based (page * 24). Keyset pagination (ID-based cursors) can be added for scalability.

**Limit**: Hard-cap at 100 listings per query (4 pages × 24 items) to prevent memory bloat.

## Browser Storage

### localStorage (Persisted Across Sessions)
- **ui-preferences-store**: locale, theme, currency
  - Key: `cardswap:ui-preferences`
  - Persist every state change via Zustand subscriber
  - Restored on boot before React renders
- **listing-draft-store**: Form state for "Add Card" page
  - Key: `cardswap:listing-draft`
  - Auto-saved every 500ms (debounced)
  - Survives page refresh; cleared after successful submission

### sessionStorage (Current Session Only)
- Scroll position (optional; not implemented in v1)
- Modal state (open/closed) — consider if multi-step forms span pages

### Supabase Auth Storage
- Session (`sb-{projectId}-auth-token`): Persisted by `@supabase/supabase-js`
- Automatically restored on app boot via `getSession()` + `onAuthStateChange()`

## Database Indexing

All indexes created in migrations. Query planner uses:

| Index Type | On Columns | Table | Purpose |
|-----------|-----------|-------|---------|
| Primary Key | id | All | Fast lookups |
| UNIQUE | username | profiles | Enforce username uniqueness |
| UNIQUE | (owner_id) WHERE is_default | collections, wishlists | One default per user |
| UNIQUE | (owner_id, blocked_id) | blocked_users | Prevent duplicates |
| B-tree | (owner_id, position) | collections, collection_items, collection_item_photos | Sort within owner |
| B-tree | (card_id) | collection_items, card_listings, wishlist_items | Find all cards in collection/market |
| B-tree | (is_active, created_at) | card_listings | Marketplace sort (recent active first) |
| B-tree | (seller_id) | card_listings | User's listings lookup |
| B-tree | (moderation_status) | card_listings | Admin filtering |
| B-tree | (conversation_id, created_at) | messages | Thread ordering |
| B-tree | (user_id) | conversation_members, blocked_users | User's conversations/blocks |
| B-tree | (external_id, external_source, language) | pokemon_cards | Catalog dedup on import |
| B-tree | (set_code, language) | pokemon_cards | Filter by set |
| B-tree | (created_at DESC) WHERE status = 'OPEN' | reports | Admin queue sort |
| GIN (trigram) | name, pokemon_name, set_code | pokemon_cards | Full-text search (search_listings RPC) |

**Search RPC** (`search_listings`) uses trigram + tsvector GIN indexes for keyword matching.

## CDN & Image Caching

### Supabase Storage CDN
- Public buckets (card-images, avatars) automatically served via Supabase CDN
- Cache headers set at upload time:
  ```ts
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      cacheControl: '31536000',  // 1 year (365 days * 86400 seconds)
      contentType: blob.type,
      upsert: false
    })
  ```

### Why 1-Year Cache?
File names are immutable UUIDs (`{userId}/{itemId}/{uuid}-{size}.webp`). If content changes, new UUID generated → new URL → no stale cache hit.

### Image Sizes
- Thumbnail: 320px width (listing cards)
- Medium: 960px width (detail page)
- Avatar: 128px width (profile cards)
- All WebP, ~60–80% size reduction vs JPEG

## Browser Caches

### HTTP Cache
- Public assets (CSS, JS bundles, fonts): Vite build output fingerprinted (`index-abc123.js`)
- Served with `Cache-Control: max-age=31536000` (1 year)
- Hash changes on code update → new URL → no stale cache

### Service Worker (Optional, v1.1)
- Cache offline-friendly pages (landing, legal)
- Workbox integration or custom implementation

## Performance Monitoring

### Metrics to Track (v1.1)
- **Core Web Vitals** (Lighthouse):
  - LCP (Largest Contentful Paint): Target < 2.5s
  - FID (First Input Delay): Target < 100ms (CLS in v1)
  - CLS (Cumulative Layout Shift): Target < 0.1

### Tools
- Lighthouse CI in GitHub Actions
- Sentry (error + performance RUM) — optional
- Recharts analytics dashboard (v1.1) for custom metrics

## When to Add Redis / Search Engine

### Redis (Caching Layer)
**Add if**:
- `marketplace_facets()` query becomes hot spot (100+ req/s)
- FX conversion requests spike
- Session store needs to be distributed (multi-region)

**Implementation**:
- Supabase or third-party Redis service
- Cache facets for 1 hour; invalidate on catalog import
- Store FX rates for 12 hours

### Meilisearch / Algolia (Search)
**Add if**:
- `search_listings()` query slow with 100k+ listings
- Faceted search needs < 100ms response
- Analytics needed (popular searches, filter usage)

**Implementation**:
- Sync listing changes (new/update/delete) via webhook or cron
- Client queries Meilisearch directly (or via API proxy)
- Keep TanStack Query as client cache layer

### When NOT to Add (v1)
- Upstash Redis: Fixed cost ~$25/mo; marketplace likely < 10k listings initially
- Elasticsearch: Complexity; Meilisearch simpler for small datasets
- CDN edge caching: Supabase CDN sufficient for public images

## Browser DevTools Checklist

### Check TanStack Query Devtools (dev mode)
```bash
npm run dev
# Visit localhost:5173
# Press Ctrl+Shift+M or access devtools on /dashboard
```

### Verify Caches
- **Application tab**:
  - Local Storage: cardswap:ui-preferences, cardswap:listing-draft
  - Session Storage: (check if populated)
  - IndexedDB: None (not used in v1)
- **Network tab**:
  - Images: Verify WebP, check `Cache-Control` headers
  - API calls: Look for 304 Not Modified (browser cache reuse)
  - Stale-while-revalidate: Watch for background refetches

### Profile Query Performance
1. Open DevTools → Performance tab
2. Record page load → marketplace search
3. Mark slow queries (> 1s) for optimization

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

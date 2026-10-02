# Backend Alternatives Analysis

Comparison of Supabase vs Firebase, Appwrite, PocketBase, and self-hosted alternatives. Includes migration considerations.

## Supabase (Chosen for v1)

**Type**: Postgres + Open Source Backend-as-a-Service

### Pros
- **Developer experience**: SQL, RLS, custom RPCs → full control
- **Cost**: Generous free tier; Pro = $25/mo (built-in realtime, backups)
- **Flexibility**: Entire Postgres toolset available (triggers, extensions, pg_cron)
- **RLS + Auth**: Integrated; no separate auth service
- **Realtime**: Postgres changes subscription native (+ Broadcast for ephemeral)
- **Storage**: S3-compatible with RLS policies (same permission model)
- **Migrations**: Version-controlled SQL; no schema lock-in
- **Open source**: Self-host option if needed (Supabase Community Edition)

### Cons
- **Cold starts**: Serverless functions cold boot (~500ms), not an issue for web app
- **Vendor lock-in**: Supabase-specific auth, storage RLS (moderate)
- **Realtime throughput**: Postgres changes ~1k concurrent connections (move to Broadcast if needed)
- **Index management**: DBA knowledge required for optimization

### Why chosen
- CardSwap requires RLS for multi-tenant safety (mandatory)
- Custom RPCs simplify business logic (start_conversation, search_listings)
- Postgres triggeers enforce rate limits + auto-hide listings (cheaper than app-side logic)
- Open source path available if migrating away

### Cost at scale (10k users, 5k listings, 1M messages/month)
- ~$25/mo base
- + $0.10/mo extra storage (500 MB over 8 GB)
- + $10/mo egress (500 GB/mo)
- **Total**: ~$45/mo (still < $100k/year)

---

## Firebase (Google)

**Type**: Proprietary Backend-as-a-Service (Firestore + Firebase Auth + Cloud Storage)

### Pros
- **Easy auth**: Google Sign-In native + social login out-of-the-box
- **Real-time**: Firestore subscriptions + Firebase Realtime Database
- **Hosting**: Firebase Hosting integrated (no separate deployment)
- **Analytics**: Built-in Google Analytics
- **Generous free tier**: Good for prototyping

### Cons
- **No RLS equivalent**: Security rules are JavaScript-based (harder to reason about at scale)
- **Vendor lock-in**: Heavy; Firestore data structure not portable
- **Cost at scale**: Egress ($0.12/GB), write operations ($0.06/$1M writes) → expensive
  - Estimate: 10k users, 5k listings, 1M messages/month = $500–1000/mo
- **SQL unavailable**: No relational queries; denormalization required
- **No custom server logic**: Cloud Functions not as integrated as Postgres RPCs

### Why rejected for v1
- RLS critical for marketplace safety; Firebase rules insufficient
- Marketplace search complex (multi-filter, FX conversion); Firestore document queries limited
- Report auto-hide trigger hard to implement without RLS
- Cost scales poorly (write-heavy platform)

### Migration path (if switching from Supabase)
1. Export Postgres → CSV
2. Transform to Firestore document structure
3. Rewrite security rules (Firebase Rules lang)
4. Rewrite search queries (Firestore limits: 1 equality + 1 inequality per query)
5. Move realtime to Firebase Realtime DB (different API)
6. **Effort**: High (2–3 weeks); major architectural change

---

## Appwrite

**Type**: Open Source Backend-as-a-Service (self-hosted or cloud)

### Pros
- **Open source**: Deploy on own servers (no vendor lock-in)
- **Docker**: Containerized; run anywhere
- **Built-in Auth**: Multiple providers (Google, email, etc.)
- **Storage**: Database + file storage with permissions
- **Realtime**: WebSocket subscriptions
- **SDKs**: Web, mobile, server

### Cons
- **Immature ecosystem**: Fewer integrations vs Firebase/Supabase
- **Learning curve**: Less documentation for advanced cases (custom security, complex queries)
- **No SQL**: Document-based like Firebase (similar limitations)
- **Self-hosting overhead**: Requires DevOps (if not using Appwrite Cloud)
- **RLS-like feature**: Permissions model simpler than Postgres RLS

### Why rejected for v1
- RLS critical; Appwrite permissions less expressive than Postgres security-definer functions
- No Postgres ecosystem (triggers, extensions, pg_cron)
- Smaller community; less battle-tested for e-commerce use case

### Migration path (if switching to self-hosted)
1. Appwrite SDK similar to Supabase in API shape
2. Security rules translation (Appwrite → custom middleware)
3. Search rewrite (no SQL; must build custom indexing)
4. Realtime rewrite (WebSocket API different)
5. **Effort**: High (2–3 weeks); similar to Firebase

---

## PocketBase

**Type**: Lightweight open-source backend (SQLite, REST/GraphQL)

### Pros
- **Minimal**: Single binary; easy to deploy
- **SQLite**: Familiar SQL; no Postgres complexity
- **Admin UI**: Built-in dashboard
- **Realtime**: WebSocket subscriptions
- **Self-hosted**: Full control; no cloud vendor

### Cons
- **SQLite limits**: Not suitable for high-concurrency apps (locking issues)
- **No RLS native**: Permissions added via API rules (less expressive than Postgres RLS)
- **Small community**: Fewer third-party integrations
- **Scaling**: SQLite doesn't scale horizontally (vs Postgres sharding)
- **DevOps**: Requires external hosting (no managed cloud option like Supabase)

### Why rejected for v1
- RLS critical; PocketBase permissions insufficient for marketplace safety
- SQLite concurrency limitations; v1 targets Vietnam launch with growth expectations
- No Postgres ecosystem (triggers, custom functions)

### Migration path (if switching)
1. Export SQLite → CSV
2. Migrate to PocketBase schema (similar REST structure)
3. Rewrite security rules (PocketBase API rules)
4. No SQL support; major architectural change needed
5. **Effort**: Very high (3–4 weeks)

---

## Self-Hosted Postgres + Custom API

**Type**: DIY backend (Node.js/Go/Rust API + Postgres)

### Pros
- **Full control**: No vendor lock-in whatsoever
- **Postgres power**: All extensions, custom functions, optimal indexes
- **Cost**: Cheap hosting (VPS ~$5/mo); pay only for compute + storage
- **RLS**: Implement exactly as needed
- **Scaling**: Horizontal scaling, read replicas, sharding available

### Cons
- **Maintenance**: Schema migrations, backups, security patches on you
- **DevOps**: Container orchestration, monitoring, alerting
- **Auth**: Implement from scratch (JWT, session management)
- **Development time**: 4–6 weeks to build production-ready API
- **Operational burden**: On-call; no SLA
- **Security**: Your responsibility (DDoS protection, rate limiting, SQL injection prevention)

### Why rejected for v1
- Time-to-market: 12 weeks vs 6 weeks for Supabase
- Operational overhead: Team size (1–2 devs) insufficient for production support
- Cost advantage eroded once you add 24/7 monitoring, backups, DDoS protection

### When to consider
- **Post-v2**: If margins support dedicated infrastructure team
- **Specific need**: Custom protocol, specialized performance requirement
- **Regulatory**: Data sovereignty (Vietnam data residency requirement) → self-hosted Supabase or Postgres

### Migration path (if switching from Supabase)
1. Export Postgres schema + data
2. Build custom Node.js/Go API (6–8 weeks)
3. Implement RLS equivalent in application middleware
4. Realtime via WebSocket layer (Socket.io, ws library)
5. Deploy to VPS/Kubernetes
6. **Effort**: Very high (8+ weeks)

---

## Self-Hosted Supabase (Community Edition)

**Type**: Open-source Supabase running on your own servers

### Pros
- **Same developer experience**: No Supabase cloud lock-in
- **Postgres power**: Full control over schema, extensions
- **Cost**: VPS ~$5/mo (cheaper than Supabase Pro if high-volume)
- **Compliance**: Vietnam data residency (if hosted domestically)
- **Flexibility**: Custom domain, integrations, no rate limits

### Cons
- **DevOps**: Docker Compose or Kubernetes required
- **Maintenance**: Supabase version updates, security patches
- **Monitoring**: Your responsibility (storage usage, backups, replication)
- **No UI**: Supabase Studio (admin dashboard) requires paid hosting
- **Support**: Community-only; no SLA

### Why not chosen for v1
- DevOps overhead not justified (Supabase Pro is cheap + managed)
- Team size insufficient for operational support

### When to consider
- **Post-v2**: Vietnam data residency law requires local hosting
  - Deploy self-hosted Supabase in Vietnam VPS
  - Cost: $10–30/mo VPS + DevOps time
  - Same Supabase APIs; minimal migration effort

### Migration path (if switching to self-hosted)
- **Difficulty**: Low
- Export from Supabase Cloud → restore to self-hosted
- Update environment variables (new API endpoint)
- **Effort**: 1–2 days
- **Reversible**: Can migrate back to Supabase Cloud anytime

---

## Comparison Matrix

| Criterion | Supabase | Firebase | Appwrite | PocketBase | DIY Postgres | Self-Hosted Supabase |
|-----------|----------|----------|----------|-----------|--------------|----------------------|
| **RLS** | Excellent (SQL) | Fair (Rules lang) | Fair (API Rules) | Fair | Excellent | Excellent |
| **Cost** | $$ (Pro $25/mo) | $$$ (scales to $1k/mo) | $$ (self-host free) | $ (self-host free) | $ (VPS $5/mo) | $$ (VPS $10–30/mo) |
| **Time to market** | ⭐⭐⭐⭐⭐ (2 weeks) | ⭐⭐⭐⭐ (2 weeks) | ⭐⭐⭐ (3 weeks) | ⭐⭐⭐ (3 weeks) | ⭐ (8 weeks) | ⭐⭐ (2 weeks) |
| **Vendor lock-in** | Moderate | High | None | None | None | None |
| **DevOps burden** | None | None | Medium | Medium | High | High |
| **SQL power** | Excellent | None | None | Fair | Excellent | Excellent |
| **Realtime** | Good | Excellent | Good | Good | DIY | Good |
| **Auth** | Built-in | Excellent | Built-in | Built-in | DIY | Built-in |
| **Scaling** | Excellent | Good | Fair | Poor | Excellent | Excellent |

---

## Decision for CardSwap

**Chosen**: Supabase (managed cloud)

**Reasoning**:
1. RLS critical for marketplace safety; Postgres best-in-class
2. Security-definer RPCs perfect for business logic (start_conversation, rate limits, auto-hide)
3. Time-to-market: 12 weeks (DIY) → 6 weeks (Supabase)
4. Cost: $300/year (Pro) << $500–1000/mo (Firebase at scale)
5. Vendor lock-in acceptable (reversible to self-hosted Supabase)
6. Team bandwidth: Full focus on product, not infrastructure

**Plan for Vietnam Data Residency** (v2 or later):
- If law requires Vietnam-hosted data: Migrate to self-hosted Supabase on Vietnam VPS
- Migration effort: 1–2 days (export → restore)
- No code changes needed

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

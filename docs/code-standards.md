# CardSwap Code Standards

Conventions and best practices for maintaining codebase consistency.

## File Naming

### TypeScript/JavaScript
- **Format**: kebab-case
- **Purpose**: Self-documenting names for LLM tools (grep, glob)
- **Examples**:
  - ✅ `use-marketplace-params.ts`
  - ✅ `collection-item-schema.ts`
  - ✅ `get-listings.test.ts`
  - ❌ `useMarketplaceParams.ts` (PascalCase)
  - ❌ `collection_item_schema.ts` (snake_case)

### React Components
- **File names**: kebab-case like every other file (`listing-card.tsx`, `marketplace-page.tsx`); the exported component is PascalCase (`ListingCard`).
- **Suffix**: `-page.tsx` for routes in `src/pages/`; components are named by what they render (`-card`, `-sheet`, `-dialog`, `-grid`).
- **Examples**:
  - ✅ `src/pages/marketplace-page.tsx` → `export default function MarketplacePage()`
  - ✅ `src/components/marketplace/listing-card.tsx` → `export const ListingCard`
  - ❌ `ListingCard.tsx`

### Directories
- **Format**: kebab-case
- **Purpose**: Lowercase, easy to type
- **Examples**:
  - ✅ `src/pages/`
  - ✅ `src/components/marketplace/`
  - ✅ `src/schemas/`

## File Size Guidance

**Target**: < 200 LOC per file (soft limit, not strict)

**Rationale**: Smaller files easier to understand, test, and maintain.

**Strategy**:
- **Hooks**: Extract business logic from components → custom hooks
  - ✅ `use-marketplace-search.ts` (fetching + pagination)
  - ❌ Single 500-line marketplace component

- **Services**: Move RPC calls to service layer
  - ✅ `marketplace-service.ts` (searchListings, getFacets)
  - ❌ Fetch calls scattered in components

- **Schemas**: One Zod schema per entity
  - ✅ `add-card-schema.ts`
  - ✅ `marketplace-filter-schema.ts`
  - ❌ Single 300-line schema file

- **Components**: Split complex forms into sub-components
  - ✅ `AddCardForm.tsx` + `CardPhotoPicker.tsx` + `ListingOptions.tsx`
  - ❌ Single 600-line AddCard component

## Import Organization

Order imports in each file:
1. React/third-party libraries
2. Local services/hooks/stores
3. Components
4. Types
5. Utilities
6. Styles

```ts
// ✅ Good
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMarketplaceParams } from '@/hooks/use-marketplace-params'
import { SearchListings } from '@/components/marketplace/search-listings'
import type { ListingSearchRow } from '@/types/models'
import { formatPrice } from '@/utils/format'
import styles from './marketplace.module.css'

// ❌ Bad (unsorted)
import styles from './marketplace.module.css'
import { formatPrice } from '@/utils/format'
import { useQuery } from '@tanstack/react-query'
import type { ListingSearchRow } from '@/types/models'
import { SearchListings } from '@/components/marketplace/search-listings'
import { useState } from 'react'
```

## Type Naming

- **Types**: Row aliases live in `src/types/models.ts` (`Profile`, `CardListing`, `ListingSearchRow`); no `Type` suffix
  - ✅ `ListingSearchRow` (from RPC return type)
  - ✅ `CardConditionType` (enum wrapper)
  - ❌ `IListingSearch` (interface prefix outdated)

- **Interfaces**: Rare; prefer `type` keyword
  - ✅ `type ListingDetail = { ... }`
  - ❌ `interface ListingDetail { ... }` (only if extending)

- **Database types**: Import from `src/types/database.ts` (auto-generated)
  - ✅ `Database['public']['Enums']['card_condition']`
  - ✅ `Tables<'card_listings'>` helper types

- **Model types**: Wrap database types in `src/types/models.ts`
  - ✅ `type CardListing = Database['public']['Tables']['card_listings']['Row']`
  - Reason: Isolate DB schema changes from components

## Naming Conventions

### Variables & Constants
- **Booleans**: Prefix with `is`, `has`, `can`, `should`
  - ✅ `isLoading`, `hasPhotos`, `canEdit`, `shouldRefetch`
  - ❌ `loading`, `photos`, `edit`, `refetch`

- **Arrays**: Plural form
  - ✅ `listings`, `photos`, `conditions`
  - ❌ `listingList`, `photoArray`

- **Constants**: UPPER_SNAKE_CASE (only for true constants)
  - ✅ `MARKETPLACE_PAGE_SIZE = 24`
  - ✅ `CACHE_DURATION_MS = 60_000`
  - ❌ `LISTING_DATA = fetchListings()` (not constant)

### Functions
- **Hooks**: Prefix with `use`
  - ✅ `useMarketplaceSearch()`, `useListingDetail()`
  - ❌ `marketplaceSearch()`, `getListingDetail()`

- **Service functions**: Verb + noun (imperative)
  - ✅ `searchListings()`, `createListing()`, `blockUser()`
  - ❌ `listingSearch()`, `newListing()`, `userBlock()`

- **Predicates**: Prefix with `is`, `has`, `can`, `should`
  - ✅ `isAdmin()`, `hasAccess()`, `canDelete()`
  - ❌ `admin()`, `access()`, `delete()` (ambiguous)

- **Async operations**: No `Async` suffix (it's redundant)
  - ✅ `async function fetchListings() { }`
  - ❌ `async function fetchListingsAsync() { }`

## Error Handling

All errors wrapped in `AppError` type (from `src/utils/app-error.ts`):

```ts
// ✅ Good: Service throws AppError
export async function getListing(id: string): Promise<ListingDetail> {
  return unwrap(
    await supabase
      .from('card_listings')
      .select('...')
      .eq('id', id)
      .single()
  )
}

// unwrap() raises AppError if error exists; component catches via React Query

// ❌ Bad: Silent null return
export async function getListing(id: string): Promise<ListingDetail | null> {
  const { data, error } = await supabase.from('card_listings').select('...')
  return data ?? null  // Lost error context
}
```

**Error handling in components**:
```ts
// ✅ Good: React Query handles errors
const { data, error, isPending } = useQuery({
  queryFn: () => getListing(id),
  // ...
})

if (error) return <ErrorAlert error={error} />
if (isPending) return <Loading />

// ❌ Bad: Manual try-catch
try {
  const listing = await getListing(id)
  setListing(listing)
} catch (e) {
  // Unhandled error type
}
```

## Schema Validation

Use Zod for all form inputs + API responses:

```ts
// ✅ Good: Zod schema validates
import { z } from 'zod'

export const addCardSchema = z.object({
  cardId: z.string().uuid('Invalid card ID'),
  quantity: z.number().int().min(1).max(999),
  condition: z.enum(CARD_CONDITIONS),
  printing: z.enum(PRINTINGS),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})

export type AddCardInput = z.infer<typeof addCardSchema>

// Form use:
const form = useForm<AddCardInput>({
  resolver: zodResolver(addCardSchema),
  defaultValues: { quantity: 1, condition: 'NEAR_MINT' },
})

// ❌ Bad: No validation
const form = useForm({
  defaultValues: { quantity: 1, condition: 'NEAR_MINT' },
})
// Bug: quantity = -5 not caught until backend
```

## I18n Keys

Namespace-based keys per feature:

```ts
// ✅ Good: Organized by feature
t('marketplace:search-placeholder')
t('marketplace:results-found', { count: 24 })
t('collection:add-card-title')
t('messaging:new-message-from', { username: 'alice' })
t('common:loading')  // Shared

// ❌ Bad: Flat structure
t('searchPlaceholder')
t('addCardTitle')
t('newMessageFrom')
```

**File organization**:
```
src/locales/
├── vi/
│   ├── common.json       # Shared: buttons, common errors
│   ├── marketplace.json  # Search, filters, detail
│   ├── collection.json   # Add card, binders
│   ├── messaging.json    # Messages, conversations
│   └── legal.json        # Terms, privacy, community guidelines
└── en/
    └── [same structure]
```

## Testing Conventions

### Unit Tests
- **Location**: Colocated with source (e.g., `add-card-schema.test.ts` next to `add-card-schema.ts`)
- **Format**: vitest with `describe` + `it` blocks
- **Coverage**: Aim for 70%+ on critical paths (schemas, services)

```ts
// ✅ Good
describe('addCardSchema', () => {
  it('accepts valid input', () => {
    const input = { cardId: 'uuid', quantity: 1, condition: 'NEAR_MINT' }
    expect(addCardSchema.parse(input)).toEqual(input)
  })

  it('rejects quantity > 999', () => {
    const input = { cardId: 'uuid', quantity: 1000 }
    expect(() => addCardSchema.parse(input)).toThrow('must be <= 999')
  })
})

// ❌ Bad
it('schema works', () => {
  // Vague test; doesn't verify behavior
  const data = addCardSchema.parse({})
  expect(data).toBeTruthy()
})
```

### E2E Tests
- **Location**: `e2e/*.spec.ts` (Playwright)
- **Scope**: Critical user journeys (login, search, message)
- **Trigger**: On push to main + PR

## Code Review Checklist

Before opening PR:
- [ ] No console.logs or debugger statements
- [ ] All TypeScript types correct (no `any` unless documented)
- [ ] Error handling complete (no silent failures)
- [ ] i18n keys added to all user-facing strings
- [ ] Zod schema added for any form input
- [ ] Service layer used for RPC calls (not in component)
- [ ] Tests added for new functions/schemas
- [ ] File size < 200 LOC (split if larger)
- [ ] Imports sorted + organized
- [ ] Commit message follows conventional commits

## Conventional Commits

Format: `<type>: <short description>`

- **feat**: New feature (e.g., `feat: add wishlist filtering`)
- **fix**: Bug fix (e.g., `fix: prevent message double-send`)
- **docs**: Documentation (e.g., `docs: update deployment guide`)
- **refactor**: Code reorganization, no behavior change (e.g., `refactor: extract useMarketplaceParams hook`)
- **test**: Test additions/changes (e.g., `test: add RLS policy coverage`)
- **chore**: Build, deps, ci (e.g., `chore: upgrade tailwind to v4`)

**Do not include**: AI references, personal comments

## Performance Best Practices

- **Lazy-load routes**: Use React Router v7 `lazy()` for pages
- **Memoize expensive computations**: `useMemo` for filters, derived state
- **Debounce search input**: `use-debounced-value` hook (delay API call)
- **Image optimization**: Client-side WebP resize (done in storage-service)
- **TanStack Query**: Leverage staleTime, keepPreviousData for UX
- **Avoid inline functions**: Define callbacks outside render (or wrap with `useCallback`)

---

**Last updated**: 2026-10-02 · **Version**: v1 (launch)

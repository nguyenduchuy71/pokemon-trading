-- A listing only describes what an owner offers (sale/trade/both) for one owned copy.
-- It never creates an order, reservation or payment.

create table public.card_listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.collection_items (id) on delete cascade,
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  card_id uuid not null references public.pokemon_cards (id), -- denormalised from item for search
  listing_type public.listing_type not null,
  price numeric(14, 2) check (price > 0),
  currency public.currency_code not null default 'VND',
  quantity int not null default 1 check (quantity >= 1),
  looking_for text[] not null default '{}' check (cardinality(looking_for) <= 10),
  description text check (char_length(description) <= 1000),
  is_active boolean not null default true,
  moderation_status public.moderation_status not null default 'VISIBLE',
  view_count int not null default 0,
  conversation_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (listing_type = 'TRADE' or price is not null)
);

create unique index card_listings_one_active_per_item on public.card_listings (item_id) where is_active;
create index card_listings_feed on public.card_listings (created_at desc) where is_active and moderation_status = 'VISIBLE';
create index card_listings_card on public.card_listings (card_id) where is_active;
create index card_listings_seller on public.card_listings (seller_id);

create trigger card_listings_touch before update on public.card_listings
  for each row execute function public.touch_updated_at();

-- Integrity: seller owns the item, card_id follows the item, quantity ≤ owned,
-- and an active listing must show at least one real photo of the copy.
create function public.card_listings_validate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.collection_items;
begin
  select * into v_item from public.collection_items where id = new.item_id;
  if v_item.id is null or v_item.owner_id <> new.seller_id then
    raise exception 'item does not belong to seller' using errcode = '42501';
  end if;
  new.card_id := v_item.card_id;
  if new.quantity > v_item.quantity then
    raise exception 'listing quantity exceeds owned quantity' using errcode = '23514';
  end if;
  -- The photo row must point at a file that was actually uploaded. Absolute URLs can only be
  -- written by trusted server-side SQL (the client insert policy requires "{uid}/..." paths).
  if new.is_active and not exists (
    select 1 from public.collection_item_photos ph
    where ph.item_id = new.item_id
      and (ph.medium_path ~ '^https?://'
        or exists (select 1 from storage.objects o where o.bucket_id = 'card-images' and o.name = ph.medium_path))
  ) then
    raise exception 'photo_required' using errcode = '23514', hint = 'Active listings need at least one real photo.';
  end if;
  -- A hidden/removed listing cannot be side-stepped by unlisting and relisting the same copy.
  if new.is_active and exists (
    select 1 from public.card_listings l
    where l.item_id = new.item_id and l.id <> new.id and l.moderation_status <> 'VISIBLE'
  ) then
    raise exception 'listing_under_moderation' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger card_listings_validate before insert or update of item_id, seller_id, quantity, is_active on public.card_listings
  for each row execute function public.card_listings_validate();

alter table public.card_listings enable row level security;

create policy "read visible, own or as admin" on public.card_listings for select
  using (
    (is_active and moderation_status = 'VISIBLE'
      and exists (select 1 from public.profiles p where p.id = seller_id and p.status = 'ACTIVE'))
    or seller_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "create own listings" on public.card_listings for insert to authenticated
  with check (seller_id = (select auth.uid()) and public.is_active_user());
create policy "update own listings" on public.card_listings for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()) and public.is_active_user());
create policy "delete own listings" on public.card_listings for delete to authenticated
  using (seller_id = (select auth.uid()));

-- Counters and moderation state are server-managed.
revoke insert, update on public.card_listings from anon, authenticated;
grant insert (id, item_id, seller_id, card_id, listing_type, price, currency, quantity, looking_for, description, is_active)
  on public.card_listings to authenticated;
grant update (listing_type, price, currency, quantity, looking_for, description, is_active)
  on public.card_listings to authenticated;

-- Items are readable when their binder is public or they back a visible listing.
create policy "read public, listed or own items" on public.collection_items for select
  using (
    owner_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.collections c where c.id = collection_items.collection_id and c.is_public)
    or exists (select 1 from public.card_listings l where l.item_id = collection_items.id and l.is_active and l.moderation_status = 'VISIBLE')
  );
create policy "read photos of readable items" on public.collection_item_photos for select
  using (exists (select 1 from public.collection_items i where i.id = item_id));

-- Removing the last photo of an actively listed item would break the real-photo rule.
create function public.collection_item_photos_guard_last() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.card_listings where item_id = old.item_id and is_active)
     and not exists (select 1 from public.collection_item_photos where item_id = old.item_id and id <> old.id) then
    raise exception 'photo_required' using errcode = '23514', hint = 'Unlist the card before removing its last photo.';
  end if;
  return old;
end $$;
create trigger collection_item_photos_guard_last before delete on public.collection_item_photos
  for each row when (pg_trigger_depth() = 0) execute function public.collection_item_photos_guard_last();

-- Owned quantity can't drop below what is listed, and a listed copy can't silently change card
-- (card_id is not client-updatable; this also covers trusted SQL).
create function public.collection_items_guard_listed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.card_listings l where l.item_id = new.id and l.is_active and l.quantity > new.quantity) then
    raise exception 'listing quantity exceeds owned quantity' using errcode = '23514';
  end if;
  if new.card_id <> old.card_id and exists (select 1 from public.card_listings l where l.item_id = new.id) then
    raise exception 'listed item card cannot change' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger collection_items_guard_listed before update of quantity, card_id on public.collection_items
  for each row execute function public.collection_items_guard_listed();

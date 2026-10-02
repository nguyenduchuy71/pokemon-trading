-- Collections double as binders. Every owned copy (collection_item) lives in exactly one collection.
-- collection_items is the single source of truth for "what I own"; listings reference it.

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  description text check (char_length(description) <= 300),
  is_public boolean not null default true,
  is_default boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create unique index collections_one_default on public.collections (owner_id) where is_default;
create index collections_owner on public.collections (owner_id, position);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  card_id uuid not null references public.pokemon_cards (id) on delete restrict,
  condition public.card_condition not null default 'NEAR_MINT',
  printing text not null default 'normal' check (printing in ('normal', 'holo', 'reverse', 'firstEdition')),
  grading_company text check (grading_company in ('PSA', 'BGS', 'CGC', 'ACE', 'OTHER')),
  grade numeric(3, 1) check (grade between 1 and 10),
  quantity int not null default 1 check (quantity between 1 and 999),
  estimated_value numeric(14, 2) check (estimated_value >= 0),
  value_currency public.currency_code not null default 'VND',
  notes text check (char_length(notes) <= 500),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((grading_company is null) = (grade is null))
);
create index collection_items_collection on public.collection_items (collection_id, position);
create index collection_items_owner on public.collection_items (owner_id);
create index collection_items_card on public.collection_items (card_id);

create trigger collection_items_touch before update on public.collection_items
  for each row execute function public.touch_updated_at();

-- Item owner must own the target collection (also on move between binders).
create function public.collection_items_check_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.collections where id = new.collection_id and owner_id = new.owner_id) then
    raise exception 'collection does not belong to item owner' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger collection_items_owner_check before insert or update of collection_id, owner_id on public.collection_items
  for each row execute function public.collection_items_check_owner();

create table public.collection_item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.collection_items (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  thumb_path text not null,
  medium_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index collection_item_photos_item on public.collection_item_photos (item_id, position);

-- Default binder cannot be deleted (would orphan the "Main Collection" invariant).
create function public.collections_protect_default() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.is_default then
    raise exception 'default collection cannot be deleted' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger collections_protect_default before delete on public.collections
  for each row when (pg_trigger_depth() = 0) execute function public.collections_protect_default();

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_item_photos enable row level security;

create policy "read public or own collections" on public.collections for select
  using (is_public or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "create own collections" on public.collections for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active_user() and not is_default);
create policy "update own collections" on public.collections for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own collections" on public.collections for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "create own items" on public.collection_items for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active_user());
create policy "update own items" on public.collection_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own items" on public.collection_items for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "create own photos" on public.collection_item_photos for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.collection_items i where i.id = item_id and i.owner_id = (select auth.uid()))
    and thumb_path like (select auth.uid())::text || '/%'
    and medium_path like (select auth.uid())::text || '/%'
  );
create policy "update own photos" on public.collection_item_photos for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own photos" on public.collection_item_photos for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Column-level UPDATE grants: a table-level grant would make per-column REVOKEs no-ops.
-- owner_id / card_id / is_default / item_id / storage paths are immutable from the client.
revoke update on public.collections, public.collection_items, public.collection_item_photos from anon, authenticated;
grant update (name, description, is_public, position) on public.collections to authenticated;
grant update (collection_id, condition, printing, grading_company, grade, quantity, estimated_value, value_currency, notes, position)
  on public.collection_items to authenticated;
grant update (position) on public.collection_item_photos to authenticated;

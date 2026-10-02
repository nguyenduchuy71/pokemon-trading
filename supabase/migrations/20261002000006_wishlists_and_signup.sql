create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  is_public boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index wishlists_one_default on public.wishlists (owner_id) where is_default;

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.pokemon_cards (id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 99),
  max_price numeric(14, 2) check (max_price > 0),
  max_price_currency public.currency_code not null default 'VND',
  min_condition public.card_condition,
  printing text check (printing in ('normal', 'holo', 'reverse', 'firstEdition')),
  priority public.wishlist_priority not null default 'MEDIUM',
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create unique index wishlist_items_unique_card on public.wishlist_items (wishlist_id, card_id, coalesce(printing, '*'));
create index wishlist_items_card on public.wishlist_items (card_id);

alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

create policy "read public or own wishlists" on public.wishlists for select
  using (is_public or owner_id = (select auth.uid()));
create policy "update own wishlists" on public.wishlists for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "read items of readable wishlists" on public.wishlist_items for select
  using (owner_id = (select auth.uid()) or exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.is_public));
create policy "create own wishlist items" on public.wishlist_items for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_active_user()
    and exists (select 1 from public.wishlists w where w.id = wishlist_id and w.owner_id = (select auth.uid()))
  );
create policy "update own wishlist items" on public.wishlist_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own wishlist items" on public.wishlist_items for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke insert, delete, update on public.wishlists from anon, authenticated;
grant update (name, is_public) on public.wishlists to authenticated;
revoke update on public.wishlist_items from anon, authenticated;
grant update (quantity, max_price, max_price_currency, min_condition, printing, priority, notes) on public.wishlist_items to authenticated;

-- ---------- sign-up bootstrap: profile + default binder + default wishlist ----------
-- Username is a placeholder until onboarding (terms_accepted_at is null until then).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    'collector_' || substr(replace(new.id::text, '-', ''), 1, 8),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.collections (owner_id, name, is_default) values (new.id, 'Main Collection', true);
  insert into public.wishlists (owner_id, name, is_default) values (new.id, 'Wishlist', true);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

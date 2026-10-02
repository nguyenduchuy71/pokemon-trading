-- Card catalog imported from TCGdex (scripts/catalog-import). Read-only for clients.
-- Japanese prints keep their printed name; pokemon_name is the English species name (via dex_ids)
-- so "charizard" finds both EN and JA cards.

create table public.pokemon_species (
  dex_id int primary key,
  name_en text not null
);

create table public.pokemon_cards (
  id uuid primary key default gen_random_uuid(),
  external_source text not null default 'tcgdex',
  external_id text not null,
  language text not null check (language in ('en', 'ja')),
  name text not null,
  pokemon_name text,
  dex_ids int[] not null default '{}',
  set_name text not null,
  set_code text not null,
  card_number text not null,
  printed_total int,
  rarity text,
  type text,
  hp int,
  printing text[] not null default '{normal}',
  image_small_url text,
  image_large_url text,
  release_date date,
  updated_at timestamptz not null default now(),
  unique (external_source, language, external_id)
);

-- One searchable haystack per card; the same expression is used by search RPCs so the index applies.
create function public.card_haystack(p_name text, p_pokemon text, p_set_name text, p_set_code text, p_number text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select public.search_normalize(concat_ws(' ', p_name, p_pokemon, p_set_name, p_set_code, p_number))
$$;

create index pokemon_cards_haystack_trgm on public.pokemon_cards
  using gin (public.card_haystack(name, pokemon_name, set_name, set_code, card_number) extensions.gin_trgm_ops);
create index pokemon_cards_set_number on public.pokemon_cards (set_code, card_number);
create index pokemon_cards_dex on public.pokemon_cards using gin (dex_ids);

alter table public.pokemon_species enable row level security;
alter table public.pokemon_cards enable row level security;
create policy "species are public" on public.pokemon_species for select using (true);
create policy "catalog is public" on public.pokemon_cards for select using (true);
revoke insert, update, delete on public.pokemon_species, public.pokemon_cards from anon, authenticated;

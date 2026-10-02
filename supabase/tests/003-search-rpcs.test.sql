-- search_listings / search_catalog / FX / auto-hide / views / public profile.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.mk_user(p_email text, p_username text, p_city text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '{}', now(), now());
  update public.profiles set username = p_username, terms_accepted_at = now(), location_city = p_city where id = v;
  return v;
end $$;
create function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
-- Creates item + photo + listing as superuser (RLS rules are covered in 001).
create function pg_temp.mk_listing(p_owner uuid, p_card uuid, p_type public.listing_type, p_price numeric, p_cur public.currency_code, p_cond public.card_condition)
returns uuid language plpgsql as $$
declare v_item uuid; v_listing uuid;
begin
  insert into public.collection_items (owner_id, collection_id, card_id, condition)
  select p_owner, id, p_card, p_cond from public.collections where owner_id = p_owner and is_default returning id into v_item;
  insert into public.collection_item_photos (item_id, owner_id, thumb_path, medium_path) values (v_item, p_owner, p_owner || '/' || v_item || '/t.webp', p_owner || '/' || v_item || '/m.webp');
  insert into storage.objects (bucket_id, name, owner) values ('card-images', p_owner || '/' || v_item || '/m.webp', p_owner);
  insert into public.card_listings (item_id, seller_id, card_id, listing_type, price, currency)
  values (v_item, p_owner, p_card, p_type, p_price, p_cur) returning id into v_listing;
  return v_listing;
end $$;

-- Isolate from dev seed data (rolled back with the transaction).
truncate public.pokemon_cards, public.pokemon_species cascade;

create temp table ids (k text primary key, v uuid);
grant select on ids to authenticated, anon;
insert into ids values
  ('alex', pg_temp.mk_user('a@t.dev', 't_alex', 'Ho Chi Minh City')),
  ('bao', pg_temp.mk_user('b@t.dev', 't_bao', 'Hanoi')),
  ('chi', pg_temp.mk_user('c@t.dev', 'chi', 'Da Nang'));

insert into public.pokemon_cards (id, external_id, language, name, pokemon_name, dex_ids, set_name, set_code, card_number, printed_total, rarity) values
  ('00000000-0000-0000-0000-0000000000c1', 'sv03.5-199', 'en', 'Charizard ex', 'Charizard', '{6}', '151', 'sv03.5', '199', 165, 'Special Illustration Rare'),
  ('00000000-0000-0000-0000-0000000000c2', 'SV2a-201', 'ja', 'リザードンex', 'Charizard', '{6}', 'ポケモンカード151', 'SV2a', '201', 165, 'SAR'),
  ('00000000-0000-0000-0000-0000000000c3', 'sv03.5-025', 'en', 'Pikachu', 'Pikachu', '{25}', '151', 'sv03.5', '025', 165, 'Common');

insert into ids values
  ('l_usd', pg_temp.mk_listing((select v from ids where k = 'alex'), '00000000-0000-0000-0000-0000000000c1', 'SALE', 185, 'USD', 'NEAR_MINT')),
  ('l_vnd', pg_temp.mk_listing((select v from ids where k = 'bao'), '00000000-0000-0000-0000-0000000000c2', 'SALE_OR_TRADE', 3000000, 'VND', 'MINT')),
  ('l_trade', pg_temp.mk_listing((select v from ids where k = 'bao'), '00000000-0000-0000-0000-0000000000c3', 'TRADE', null, 'VND', 'PLAYED'));

-- ---------- text / number / username search ----------
set local role anon;
select is((select count(*)::int from public.search_listings(p_q := 'charizard')), 2, 'English species name finds EN + JA prints');
select is((select count(*)::int from public.search_listings(p_q := 'Pokémon CHARIZARD 151')), 0, 'all words must match (no "pokemon" in haystack)');
select is((select count(*)::int from public.search_listings(p_q := 'charizard 151')), 2, 'multi-word search');
select is((select listing_id from public.search_listings(p_q := '#199/165')), (select v from ids where k = 'l_usd'), 'card number search');
select is((select listing_id from public.search_listings(p_q := '25')), (select v from ids where k = 'l_trade'), 'number search ignores leading zeros');
select is((select count(*)::int from public.search_listings(p_q := '@t_ba')), 2, 'username prefix search');
select is((select count(*)::int from public.search_listings(p_q := '@t%')), 0, 'LIKE wildcards in input are literal');

-- ---------- filters ----------
select is((select count(*)::int from public.search_listings(p_languages := '{ja}')), 1, 'language filter');
select is((select count(*)::int from public.search_listings(p_types := '{TRADE}')), 1, 'listing type filter');
select is((select count(*)::int from public.search_listings(p_conditions := '{MINT,NEAR_MINT}')), 2, 'condition filter');
select is((select count(*)::int from public.search_listings(p_city := 'Hanoi')), 2, 'city filter');

-- ---------- FX conversion + sort ----------
-- 185 USD ≈ 4,865,500 VND (seed rate 26,300) > 3,000,000 VND
select is(
  (select array_agg(listing_id order by ord) from (select listing_id, row_number() over () ord from public.search_listings(p_sort := 'price_desc', p_currency := 'VND')) s),
  array[(select v from ids where k = 'l_usd'), (select v from ids where k = 'l_vnd'), (select v from ids where k = 'l_trade')],
  'price sort converts currencies; trade-only last');
select is((select count(*)::int from public.search_listings(p_min := 100, p_currency := 'USD')), 2, 'price filter in viewer currency');
reset role;

-- ---------- blocking hides listings ----------
select pg_temp.act_as((select v from ids where k = 'chi'));
insert into public.blocked_users values ((select v from ids where k = 'chi'), (select v from ids where k = 'bao'));
select is((select count(*)::int from public.search_listings()), 1, 'blocked seller listings hidden from blocker');
reset role;

-- ---------- auto-hide after 3 distinct reporters ----------
insert into ids values ('r1', pg_temp.mk_user('r1@t.dev', 'rep1', null)), ('r2', pg_temp.mk_user('r2@t.dev', 'rep2', null)), ('r3', pg_temp.mk_user('r3@t.dev', 'rep3', null));
insert into public.reports (reporter_id, target_listing_id, reason)
select v, (select v from ids where k = 'l_usd'), 'FAKE_CARD' from ids where k in ('r1', 'r2', 'r3');
select is((select moderation_status::text from public.card_listings where id = (select v from ids where k = 'l_usd')), 'HIDDEN_PENDING_REVIEW', '3 reports auto-hide a listing');

-- ---------- views ----------
select pg_temp.act_as((select v from ids where k = 'alex'));
select public.record_listing_view((select v from ids where k = 'l_vnd'));
select public.record_listing_view((select v from ids where k = 'l_vnd'));
reset role;
select is((select view_count from public.card_listings where id = (select v from ids where k = 'l_vnd')), 1, 'views deduplicated per viewer per day');

-- ---------- catalog + profile ----------
set local role anon;
select is((select count(*)::int from public.search_catalog('charizard')), 2, 'catalog search by species');
select is((select listed_count from public.public_profile('t_bao')), 2::bigint, 'public profile counts visible listings');
reset role;

select * from finish();
rollback;

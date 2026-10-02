-- Core RLS: profiles, collections, listings, real-photo rule, scope guard.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- ---------- helpers (session-temporary) ----------
create function pg_temp.mk_user(p_email text, p_username text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '{"full_name":"Test"}', now(), now());
  update public.profiles set username = p_username, terms_accepted_at = now() where id = v;
  return v;
end $$;
create function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create temp table ids (k text primary key, v uuid);
grant select on ids to authenticated, anon;
insert into ids values ('alex', pg_temp.mk_user('alex@test.dev', 'alex')), ('bao', pg_temp.mk_user('bao@test.dev', 'bao'));
insert into public.pokemon_cards (id, external_id, language, name, pokemon_name, set_name, set_code, card_number, printed_total, rarity)
values ('00000000-0000-0000-0000-0000000000c1', 'test-sv03.5-199', 'en', 'Charizard ex', 'Charizard', '151', 'sv03.5', '199', 165, 'Special Illustration Rare');

-- ---------- signup bootstrap ----------
select is((select count(*)::int from public.collections where owner_id = (select v from ids where k = 'alex') and is_default), 1, 'signup creates default collection');
select is((select count(*)::int from public.wishlists where owner_id = (select v from ids where k = 'alex') and is_default), 1, 'signup creates default wishlist');

-- ---------- profiles ----------
select pg_temp.act_as((select v from ids where k = 'alex'));
select lives_ok($$ update public.profiles set bio = 'Vintage holo hunter' where id = (select v from ids where k = 'alex') $$, 'user updates own bio');
select throws_ok($$ update public.profiles set role = 'ADMIN' where id = (select v from ids where k = 'alex') $$, '42501', null, 'user cannot self-promote to admin');
select throws_ok($$ update public.profiles set status = 'ACTIVE' where id = (select v from ids where k = 'alex') $$, '42501', null, 'user cannot change account status');
update public.profiles set bio = 'hacked' where id = (select v from ids where k = 'bao');
reset role;
select is((select bio from public.profiles where username = 'bao'), null, 'user cannot edit another profile');

-- ---------- collections & items ----------
select pg_temp.act_as((select v from ids where k = 'alex'));
insert into public.collection_items (id, owner_id, collection_id, card_id, quantity, condition)
select '00000000-0000-0000-0000-0000000000a1', (select v from ids where k = 'alex'), id, '00000000-0000-0000-0000-0000000000c1', 2, 'NEAR_MINT'
from public.collections where owner_id = (select v from ids where k = 'alex') and is_default;
select is((select count(*)::int from public.collection_items where id = '00000000-0000-0000-0000-0000000000a1'), 1, 'owner adds item to own binder');
select throws_ok($$
  insert into public.collection_items (owner_id, collection_id, card_id)
  select (select v from ids where k = 'alex'), id, '00000000-0000-0000-0000-0000000000c1'
  from public.collections where is_default and owner_id = (select v from ids where k = 'bao')
$$, '42501', null, 'cannot put items into another user''s binder');
select throws_ok($$ delete from public.collections where is_default and owner_id = (select v from ids where k = 'alex') $$, '42501', null, 'default binder cannot be deleted');

-- ---------- listings: real-photo rule ----------
select throws_ok($$
  insert into public.card_listings (item_id, seller_id, card_id, listing_type, price, currency)
  values ('00000000-0000-0000-0000-0000000000a1', (select v from ids where k = 'alex'), '00000000-0000-0000-0000-0000000000c1', 'SALE', 4500000, 'VND')
$$, '23514', 'photo_required', 'active listing requires a real photo');

insert into public.collection_item_photos (item_id, owner_id, thumb_path, medium_path)
select '00000000-0000-0000-0000-0000000000a1', v, v::text || '/a1/p-thumb.webp', v::text || '/a1/p-md.webp' from ids where k = 'alex';
-- The uploaded file itself (the listing trigger checks storage, not just the row).
reset role;
insert into storage.objects (bucket_id, name, owner) select 'card-images', v::text || '/a1/p-md.webp', v from ids where k = 'alex';
select pg_temp.act_as((select v from ids where k = 'alex'));

select throws_ok($$
  insert into public.card_listings (item_id, seller_id, card_id, listing_type, currency)
  values ('00000000-0000-0000-0000-0000000000a1', (select v from ids where k = 'alex'), '00000000-0000-0000-0000-0000000000c1', 'SALE', 'VND')
$$, '23514', null, 'SALE listing requires a price');
select throws_ok($$
  insert into public.card_listings (item_id, seller_id, card_id, listing_type, price, quantity)
  values ('00000000-0000-0000-0000-0000000000a1', (select v from ids where k = 'alex'), '00000000-0000-0000-0000-0000000000c1', 'SALE', 100, 3)
$$, '23514', 'listing quantity exceeds owned quantity', 'cannot list more copies than owned');

insert into public.card_listings (id, item_id, seller_id, card_id, listing_type, price, currency)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', (select v from ids where k = 'alex'), '00000000-0000-0000-0000-0000000000c1', 'SALE_OR_TRADE', 4500000, 'VND');
select is((select count(*)::int from public.card_listings where id = '00000000-0000-0000-0000-0000000000b1'), 1, 'owner lists item with photo');
select throws_ok($$ update public.card_listings set view_count = 9999 where id = '00000000-0000-0000-0000-0000000000b1' $$, '42501', null, 'owner cannot inflate view counter');
select throws_ok($$ update public.card_listings set moderation_status = 'VISIBLE' where id = '00000000-0000-0000-0000-0000000000b1' $$, '42501', null, 'owner cannot change moderation status');
select throws_ok($$ delete from public.collection_item_photos where item_id = '00000000-0000-0000-0000-0000000000a1' $$, '23514', 'photo_required', 'cannot delete last photo of a listed item');

-- ---------- listings: other users ----------
select pg_temp.act_as((select v from ids where k = 'bao'));
update public.card_listings set price = 1 where id = '00000000-0000-0000-0000-0000000000b1';
delete from public.card_listings where id = '00000000-0000-0000-0000-0000000000b1';
reset role;
select is((select price from public.card_listings where id = '00000000-0000-0000-0000-0000000000b1'), 4500000.00, 'other user cannot edit or delete listing');

set local role anon;
select is((select count(*)::int from public.card_listings where id = '00000000-0000-0000-0000-0000000000b1'), 1, 'anon reads visible listing');
reset role;
update public.card_listings set moderation_status = 'HIDDEN_PENDING_REVIEW' where id = '00000000-0000-0000-0000-0000000000b1';
set local role anon;
select is((select count(*)::int from public.card_listings where id = '00000000-0000-0000-0000-0000000000b1'), 0, 'hidden listing invisible to public');
reset role;
select pg_temp.act_as((select v from ids where k = 'alex'));
select is((select count(*)::int from public.card_listings where id = '00000000-0000-0000-0000-0000000000b1'), 1, 'seller still sees own hidden listing');
reset role;

-- ---------- schema guards ----------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'every public table has RLS enabled');
select is(
  (select count(*)::int from information_schema.tables where table_schema = 'public'
     and table_name ~ '^(trades?|trade_items|payments?|orders?|escrows?|transactions?|shipping_orders?|carts?|checkouts?)$'),
  0, 'out-of-scope commerce tables do not exist');

select * from finish();
rollback;

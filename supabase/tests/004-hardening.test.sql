-- Regression tests for the v1 security review (plans/reports/code-reviewer-261002-1600-cardswap-v1-review.md).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create function pg_temp.mk_user(p_email text, p_username text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '{}', now(), now());
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
insert into ids values ('alex', pg_temp.mk_user('h-a@t.dev', 'h_alex')), ('bao', pg_temp.mk_user('h-b@t.dev', 'h_bao')), ('mod', pg_temp.mk_user('h-m@t.dev', 'h_mod'));
update public.profiles set role = 'ADMIN' where username = 'h_mod';
insert into public.pokemon_cards (id, external_id, language, name, set_name, set_code, card_number)
values ('00000000-0000-0000-0000-00000000ccc1', 'test-h-1', 'en', 'Test Card', 'Test Set', 'tst', '1'),
       ('00000000-0000-0000-0000-00000000ccc2', 'test-h-2', 'en', 'Other Card', 'Test Set', 'tst', '2');

-- alex: listed item (2 copies) with an uploaded photo; bao: item with a photo
insert into public.collection_items (id, owner_id, collection_id, card_id, quantity)
select '00000000-0000-0000-0000-00000000aaa1', v, (select id from public.collections where owner_id = v and is_default), '00000000-0000-0000-0000-00000000ccc1', 2 from ids where k = 'alex';
insert into public.collection_items (id, owner_id, collection_id, card_id)
select '00000000-0000-0000-0000-00000000bbb1', v, (select id from public.collections where owner_id = v and is_default), '00000000-0000-0000-0000-00000000ccc1' from ids where k = 'bao';
insert into public.collection_item_photos (id, item_id, owner_id, thumb_path, medium_path)
select '00000000-0000-0000-0000-0000000aa0f1', '00000000-0000-0000-0000-00000000aaa1', v, v || '/a/t.webp', v || '/a/m.webp' from ids where k = 'alex';
insert into public.collection_item_photos (id, item_id, owner_id, thumb_path, medium_path)
select '00000000-0000-0000-0000-0000000bb0f1', '00000000-0000-0000-0000-00000000bbb1', v, v || '/b/t.webp', v || '/b/m.webp' from ids where k = 'bao';
insert into storage.objects (bucket_id, name, owner) select 'card-images', v || '/a/m.webp', v from ids where k = 'alex';
insert into public.card_listings (id, item_id, seller_id, card_id, listing_type, price)
select '00000000-0000-0000-0000-00000000dd01', '00000000-0000-0000-0000-00000000aaa1', v, '00000000-0000-0000-0000-00000000ccc1', 'SALE', 100000 from ids where k = 'alex';

-- 1. photo rows cannot be re-pointed (item/path are immutable)
select pg_temp.act_as((select v from ids where k = 'bao'));
select throws_ok($$ update public.collection_item_photos set item_id = '00000000-0000-0000-0000-00000000aaa1' where id = '00000000-0000-0000-0000-0000000bb0f1' $$,
  '42501', null, 'cannot move a photo row onto another item');
select throws_ok($$ update public.collection_item_photos set medium_path = 'https://tracker.example/p.gif' where id = '00000000-0000-0000-0000-0000000bb0f1' $$,
  '42501', null, 'cannot rewrite a photo path');

-- 2. photo row without an uploaded file does not satisfy the real-photo rule
select throws_ok($$
  insert into public.card_listings (item_id, seller_id, card_id, listing_type) values ('00000000-0000-0000-0000-00000000bbb1', (select v from ids where k = 'bao'), '00000000-0000-0000-0000-00000000ccc1', 'TRADE')
$$, '23514', 'photo_required', 'phantom photo rows are rejected');

-- 3. default binder flag and card identity are immutable from the client
reset role;
select pg_temp.act_as((select v from ids where k = 'alex'));
select throws_ok($$ update public.collections set is_default = false where owner_id = (select v from ids where k = 'alex') $$, '42501', null, 'cannot unset default binder');
select throws_ok($$ update public.wishlists set is_default = false where owner_id = (select v from ids where k = 'alex') $$, '42501', null, 'cannot unset default wishlist');
select throws_ok($$ update public.collection_items set card_id = '00000000-0000-0000-0000-00000000ccc2' where id = '00000000-0000-0000-0000-00000000aaa1' $$, '42501', null, 'cannot swap the card of an owned copy');

-- 4. owned quantity cannot drop below the listed quantity
update public.card_listings set quantity = 2 where id = '00000000-0000-0000-0000-00000000dd01';
select throws_ok($$ update public.collection_items set quantity = 1 where id = '00000000-0000-0000-0000-00000000aaa1' $$, '23514', 'listing quantity exceeds owned quantity', 'quantity guard on listed copies');

-- 5. a removed listing cannot be relisted by unlisting + relisting
reset role;
select pg_temp.act_as((select v from ids where k = 'mod'));
select public.admin_set_listing_moderation('00000000-0000-0000-0000-00000000dd01', 'REMOVED', 'fake');
reset role;
select pg_temp.act_as((select v from ids where k = 'alex'));
update public.card_listings set is_active = false where id = '00000000-0000-0000-0000-00000000dd01';
select throws_ok($$
  insert into public.card_listings (item_id, seller_id, card_id, listing_type, price) values ('00000000-0000-0000-0000-00000000aaa1', (select v from ids where k = 'alex'), '00000000-0000-0000-0000-00000000ccc1', 'SALE', 1)
$$, '42501', 'listing_under_moderation', 'relisting a moderated copy is blocked');

-- 6. reports survive deletion of the reported listing, with a snapshot
reset role;
select pg_temp.act_as((select v from ids where k = 'bao'));
insert into public.reports (reporter_id, target_listing_id, reason) values ((select v from ids where k = 'bao'), '00000000-0000-0000-0000-00000000dd01', 'FAKE_CARD');
reset role;
select pg_temp.act_as((select v from ids where k = 'alex'));
delete from public.card_listings where id = '00000000-0000-0000-0000-00000000dd01';
reset role;
select is((select count(*)::int from public.reports where reporter_id = (select v from ids where k = 'bao')), 1, 'report kept after listing deletion');
select is((select target_snapshot ->> 'card' from public.reports where reporter_id = (select v from ids where k = 'bao')), 'Test Card', 'report keeps a snapshot of the listing');
select is((select target_user_id from public.reports where reporter_id = (select v from ids where k = 'bao')), (select v from ids where k = 'alex'), 'report still points at the seller');

-- 7. block relationships cannot be probed for arbitrary pairs
select pg_temp.act_as((select v from ids where k = 'bao'));
select throws_ok($$ select public.is_blocked_between((select v from ids where k = 'alex'), (select v from ids where k = 'mod')) $$, '42501', null, 'is_blocked_between is not client-callable');
select is(public.is_blocked_with((select v from ids where k = 'alex')), false, 'caller-scoped block check works');

-- 8. anonymous views are not counted
reset role;
insert into public.collection_item_photos (item_id, owner_id, thumb_path, medium_path)
select '00000000-0000-0000-0000-00000000bbb1', v, 'https://seed.example/t.webp', 'https://seed.example/m.webp' from ids where k = 'bao';
insert into public.card_listings (id, item_id, seller_id, card_id, listing_type)
select '00000000-0000-0000-0000-00000000dd02', '00000000-0000-0000-0000-00000000bbb1', v, '00000000-0000-0000-0000-00000000ccc1', 'TRADE' from ids where k = 'bao';
set local role anon;
select public.record_listing_view('00000000-0000-0000-0000-00000000dd02');
reset role;
select is((select view_count from public.card_listings where id = '00000000-0000-0000-0000-00000000dd02'), 0, 'anonymous views are ignored');

-- 9. hidden listings are not counted as conversation context
update public.card_listings set moderation_status = 'HIDDEN_PENDING_REVIEW' where id = '00000000-0000-0000-0000-00000000dd02';
select pg_temp.act_as((select v from ids where k = 'alex'));
select public.start_conversation((select v from ids where k = 'bao'), '00000000-0000-0000-0000-00000000dd02');
reset role;
select is((select conversation_count from public.card_listings where id = '00000000-0000-0000-0000-00000000dd02'), 0, 'hidden listing is not counted');

select * from finish();
rollback;

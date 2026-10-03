-- Free-tier guard rails: waitlist cap, daily message quotas, card/photo caps, chat retention.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

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
grant select, insert on ids to authenticated;
create function pg_temp.status_of(p_key text) returns text language sql as $$
  select p.status::text from public.profiles p join ids on ids.v = p.id where ids.k = p_key
$$;

-- Cap = current active users + 2, independent of whatever data the local DB already holds.
update public.app_settings set value = public.active_member_count() + 2 where key = 'max_active_users';

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driveby@ft.dev', '{}', now(), now());
insert into ids values ('alex', pg_temp.mk_user('alex@ft.dev', 'ft_alex'));
insert into ids values ('bao', pg_temp.mk_user('bao@ft.dev', 'ft_bao'));
insert into ids values ('chi', pg_temp.mk_user('chi@ft.dev', 'ft_chi'));
insert into ids values ('dan', pg_temp.mk_user('dan@ft.dev', 'ft_dan'));
-- One transaction shares now(); give the waitlisted users distinct signup times (chi first).
update public.profiles set created_at = now() - interval '2 minutes' where id = (select v from ids where k = 'chi');
update public.profiles set created_at = now() - interval '1 minute' where id = (select v from ids where k = 'dan');
insert into ids values ('mod', (select id from public.profiles where status = 'ACTIVE' and terms_accepted_at is not null limit 1));
update public.profiles set role = 'ADMIN' where id = (select v from ids where k = 'mod');

-- ---------- waitlist ----------
select is(pg_temp.status_of('bao'), 'ACTIVE', 'signups under the cap are active (abandoned signups take no slot)');
select is(pg_temp.status_of('chi'), 'WAITLISTED', 'signup over the cap is waitlisted');
select is((select count(*)::int from public.collections where owner_id = (select v from ids where k = 'chi') and is_default), 1, 'waitlisted user still gets a default binder');

select pg_temp.act_as((select v from ids where k = 'dan'));
select is(public.waitlist_position(), 2, 'second in line sees position 2');
select pg_temp.act_as((select v from ids where k = 'alex'));
select is(public.waitlist_position(), null, 'active user has no waitlist position');
reset role;

insert into public.pokemon_cards (id, external_id, language, name, pokemon_name, set_name, set_code, card_number, printed_total, rarity)
values ('00000000-0000-0000-0000-0000000000f1', 'test-ft-1', 'en', 'Pikachu', 'Pikachu', '151', 'sv03.5', '25', 165, 'Common');

select pg_temp.act_as((select v from ids where k = 'chi'));
select throws_ok($$
  insert into public.collection_items (owner_id, collection_id, card_id)
  select (select v from ids where k = 'chi'), id, '00000000-0000-0000-0000-0000000000f1'
  from public.collections where is_default and owner_id = (select v from ids where k = 'chi')
$$, '42501', null, 'waitlisted user cannot add cards');
select throws_ok($$ select public.start_conversation((select v from ids where k = 'alex')) $$, '42501', null, 'waitlisted user cannot start chats');
select lives_ok($$
  insert into public.wishlist_items (owner_id, wishlist_id, card_id)
  select (select v from ids where k = 'chi'), id, '00000000-0000-0000-0000-0000000000f1'
  from public.wishlists where is_default and owner_id = (select v from ids where k = 'chi')
$$, 'waitlisted user can build a wishlist');
select throws_ok($$ select * from public.admin_list_waitlist() $$, '42501', 'forbidden', 'only admins list the waitlist');
reset role;

-- Suspending an active user frees a slot → longest-waiting user promoted (FIFO).
select pg_temp.act_as((select v from ids where k = 'mod'));
select is((select count(*)::int from public.admin_list_waitlist()), 2, 'admin sees both waitlisted users');
select public.admin_set_user_status((select v from ids where k = 'bao'), 'SUSPENDED', 'test');
reset role;
select is(pg_temp.status_of('chi'), 'ACTIVE', 'suspension promotes the first in line');
select is(pg_temp.status_of('dan'), 'WAITLISTED', 'second in line keeps waiting');

-- Deleting an active account also frees a slot.
delete from auth.users where id = (select v from ids where k = 'alex');
select is(pg_temp.status_of('dan'), 'ACTIVE', 'account deletion promotes the next in line');

-- Raising the cap fills the new slot right away.
insert into ids values ('fay', pg_temp.mk_user('fay@ft.dev', 'ft_fay'));
select is(pg_temp.status_of('fay'), 'WAITLISTED', 'onboarding with no free slot joins the waitlist');
update public.app_settings set value = value + 1 where key = 'max_active_users';
select is(pg_temp.status_of('fay'), 'ACTIVE', 'raising the cap promotes the waitlist');

-- Admin can activate past the cap.
insert into ids values ('eve', pg_temp.mk_user('eve@ft.dev', 'ft_eve'));
select is(pg_temp.status_of('eve'), 'WAITLISTED', 'cap still enforced for new signups');
select pg_temp.act_as((select v from ids where k = 'mod'));
select public.admin_set_user_status((select v from ids where k = 'eve'), 'ACTIVE', 'friend');
reset role;
select is(pg_temp.status_of('eve'), 'ACTIVE', 'admin activates past the cap');

-- ---------- card + photo caps ----------
update public.app_settings set value = 2 where key = 'max_collection_items';
insert into public.collection_items (id, owner_id, collection_id, card_id)
select '00000000-0000-0000-0000-0000000000e1', owner_id, id, '00000000-0000-0000-0000-0000000000f1'
from public.collections where is_default and owner_id = (select v from ids where k = 'eve');
insert into public.collection_items (owner_id, collection_id, card_id)
select owner_id, id, '00000000-0000-0000-0000-0000000000f1'
from public.collections where is_default and owner_id = (select v from ids where k = 'eve');
select throws_ok($$
  insert into public.collection_items (owner_id, collection_id, card_id)
  select owner_id, id, '00000000-0000-0000-0000-0000000000f1'
  from public.collections where is_default and owner_id = (select v from ids where k = 'eve')
$$, 'P0001', 'card_limit', 'card cap blocks the next card');

insert into public.collection_item_photos (item_id, owner_id, thumb_path, medium_path)
select '00000000-0000-0000-0000-0000000000e1', v, v::text || '/e1/' || g || '-t.webp', v::text || '/e1/' || g || '-m.webp'
from ids, generate_series(1, 3) g where k = 'eve';
select throws_ok($$
  insert into public.collection_item_photos (item_id, owner_id, thumb_path, medium_path)
  select '00000000-0000-0000-0000-0000000000e1', v, v::text || '/e1/4-t.webp', v::text || '/e1/4-m.webp' from ids where k = 'eve'
$$, 'P0001', 'photo_limit', 'fourth photo on a card is rejected');

-- ---------- daily message quotas ----------
update public.app_settings set value = 2 where key in ('msg_text_per_day', 'msg_image_per_day');
select pg_temp.act_as((select v from ids where k = 'eve'));
insert into ids select 'conv', public.start_conversation((select v from ids where k = 'dan'));
reset role;

-- Back-dated past the 1-minute burst limit but inside the 24h window.
insert into public.messages (conversation_id, sender_id, kind, body, created_at)
select (select v from ids where k = 'conv'), (select v from ids where k = 'eve'), 'TEXT', 'hi', now() - interval '2 hours'
from generate_series(1, 2);
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body) values ((select v from ids where k = 'conv'), (select v from ids where k = 'eve'), 'third')
$$, 'P0001', 'daily_quota_text', 'text quota reached');
select lives_ok($$
  insert into public.messages (conversation_id, sender_id, kind, image_path)
  values ((select v from ids where k = 'conv'), (select v from ids where k = 'eve'), 'IMAGE', (select v from ids where k = 'conv')::text || '/a.webp')
$$, 'images have a separate quota');

insert into public.messages (conversation_id, sender_id, kind, image_path, created_at)
values ((select v from ids where k = 'conv'), (select v from ids where k = 'eve'), 'IMAGE', (select v from ids where k = 'conv')::text || '/b.webp', now() - interval '2 hours');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, kind, image_path)
  values ((select v from ids where k = 'conv'), (select v from ids where k = 'eve'), 'IMAGE', (select v from ids where k = 'conv')::text || '/c.webp')
$$, 'P0001', 'daily_quota_image', 'image quota reached');

-- Old messages fall out of the rolling window.
update public.messages set created_at = now() - interval '25 hours' where sender_id = (select v from ids where k = 'eve') and kind = 'TEXT';
select lives_ok($$
  insert into public.messages (conversation_id, sender_id, body) values ((select v from ids where k = 'conv'), (select v from ids where k = 'eve'), 'next day')
$$, 'quota resets after 24h');

-- ---------- storage upload caps ----------
insert into storage.objects (bucket_id, name, owner_id)
select 'chat-images', (select v from ids where k = 'conv')::text || '/s' || g || '.webp', (select v from ids where k = 'eve')::text
from generate_series(1, 2) g;
select pg_temp.act_as((select v from ids where k = 'eve'));
select is(public.storage_upload_allowed('chat-images'), false, 'chat uploads stop at the daily image quota');
select is(public.storage_upload_allowed('card-images'), true, 'card uploads allowed under the photo budget');
reset role;

-- ---------- retention purge ----------
update public.messages set created_at = now() - interval '8 days'
where sender_id = (select v from ids where k = 'eve') and (body = 'hi' or image_path like '%/b.webp');
select ok(
  (select v from ids where k = 'conv')::text || '/b.webp' in (select path from public.purge_expired_chat()),
  'purge returns expired chat image paths'
);
select is((select count(*)::int from public.messages where sender_id = (select v from ids where k = 'eve')), 2, 'purge keeps messages inside the retention window');

select * from finish();
rollback;

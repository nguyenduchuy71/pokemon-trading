-- Messaging RLS, blocking, suspension, rate limits, reports, admin RPCs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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
insert into ids values
  ('alex', pg_temp.mk_user('alex@t.dev', 'alex')),
  ('bao', pg_temp.mk_user('bao@t.dev', 'bao')),
  ('chi', pg_temp.mk_user('chi@t.dev', 'chi')),
  ('mod', pg_temp.mk_user('mod@t.dev', 'mod'));
update public.profiles set role = 'ADMIN' where username = 'mod';

-- ---------- conversations ----------
select pg_temp.act_as((select v from ids where k = 'alex'));
insert into ids select 'conv', public.start_conversation((select v from ids where k = 'bao'));
select is(public.start_conversation((select v from ids where k = 'bao')), (select v from ids where k = 'conv'), 'start_conversation reuses the pair conversation');
select throws_ok($$ select public.start_conversation((select v from ids where k = 'alex')) $$, '22023', 'cannot_message_self', 'cannot message self');
select throws_ok($$ insert into public.conversations (created_by) values ((select v from ids where k = 'alex')) $$, '42501', null, 'conversations only via RPC');

insert into public.messages (conversation_id, sender_id, body) values ((select v from ids where k = 'conv'), (select v from ids where k = 'alex'), 'Hi! Is your Charizard still available?');
select is((select count(*)::int from public.messages where conversation_id = (select v from ids where k = 'conv')), 1, 'member sends a message');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body) values ((select v from ids where k = 'conv'), (select v from ids where k = 'bao'), 'spoof')
$$, '42501', null, 'cannot send as another user');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, kind, image_path) values ((select v from ids where k = 'conv'), (select v from ids where k = 'alex'), 'IMAGE', 'other-conv/x.webp')
$$, '42501', null, 'image path must live under the conversation folder');

reset role;
select pg_temp.act_as((select v from ids where k = 'bao'));
select is((select unread_count from public.inbox() where conversation_id = (select v from ids where k = 'conv')), 1, 'recipient sees 1 unread');
update public.conversation_members set last_read_at = now() + interval '1 second' where conversation_id = (select v from ids where k = 'conv') and user_id = (select v from ids where k = 'bao');
select is((select unread_count from public.inbox() where conversation_id = (select v from ids where k = 'conv')), 0, 'marking read clears unread');

reset role;
select pg_temp.act_as((select v from ids where k = 'chi'));
select is((select count(*)::int from public.messages where conversation_id = (select v from ids where k = 'conv')), 0, 'non-member cannot read messages');
select is((select count(*)::int from public.conversation_members where conversation_id = (select v from ids where k = 'conv')), 0, 'non-member cannot read membership');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body) values ((select v from ids where k = 'conv'), (select v from ids where k = 'chi'), 'intrude')
$$, '42501', null, 'non-member cannot post');

-- ---------- blocking ----------
reset role;
select pg_temp.act_as((select v from ids where k = 'bao'));
insert into public.blocked_users (blocker_id, blocked_id) values ((select v from ids where k = 'bao'), (select v from ids where k = 'alex'));
reset role;
select pg_temp.act_as((select v from ids where k = 'alex'));
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body) values ((select v from ids where k = 'conv'), (select v from ids where k = 'alex'), 'still there?')
$$, '42501', null, 'blocked user cannot send');
select throws_ok($$ select public.start_conversation((select v from ids where k = 'bao')) $$, '42501', 'blocked', 'blocked user cannot start conversation');
select is((select count(*)::int from public.blocked_users), 0, 'blocked user cannot see who blocked them');

-- ---------- suspension ----------
reset role;
update public.profiles set status = 'SUSPENDED' where username = 'chi';
select pg_temp.act_as((select v from ids where k = 'chi'));
select throws_ok($$ select public.start_conversation((select v from ids where k = 'alex')) $$, '42501', 'suspended', 'suspended user cannot start conversations');
reset role;
update public.profiles set status = 'ACTIVE' where username = 'chi';

-- ---------- rate limit ----------
select pg_temp.act_as((select v from ids where k = 'chi'));
insert into ids select 'conv2', public.start_conversation((select v from ids where k = 'alex'));
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  select (select v from ids where k = 'conv2'), (select v from ids where k = 'chi'), 'spam ' || g from generate_series(1, 25) g
$$, 'P0001', 'rate_limited', 'more than 20 messages/minute is rejected');

-- ---------- reports & moderation ----------
select lives_ok($$
  insert into public.reports (reporter_id, target_user_id, reason, details) values ((select v from ids where k = 'chi'), (select v from ids where k = 'alex'), 'SPAM', 'test')
$$, 'user files a report');
select throws_ok($$
  insert into public.reports (reporter_id, target_user_id, reason) values ((select v from ids where k = 'chi'), (select v from ids where k = 'chi'), 'SPAM')
$$, '42501', null, 'cannot report self');
select throws_ok($$ select public.admin_set_user_status((select v from ids where k = 'alex'), 'SUSPENDED') $$, '42501', 'forbidden', 'non-admin cannot moderate');
reset role;
select pg_temp.act_as((select v from ids where k = 'mod'));
select lives_ok($$ select public.admin_resolve_report((select id from public.reports limit 1), 'DISMISSED', 'not spam') $$, 'admin resolves report');
select is((select count(*)::int from public.moderation_actions), 1, 'moderation action is logged');

select * from finish();
rollback;

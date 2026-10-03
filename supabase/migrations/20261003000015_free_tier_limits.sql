-- Free-tier guard rails: active-user cap with a waitlist, daily message quotas,
-- per-user card cap and per-card photo cap. Every limit lives in app_settings so an
-- admin can tune it with one UPDATE (SQL editor) without a deploy.

create table public.app_settings (
  key text primary key,
  value int not null check (value >= 0)
);
insert into public.app_settings (key, value) values
  ('max_active_users', 100),
  ('msg_text_per_day', 200),
  ('msg_image_per_day', 5),
  ('max_collection_items', 20),
  ('max_photos_per_item', 3),
  ('message_retention_days', 7);

alter table public.app_settings enable row level security;
create policy "settings are public" on public.app_settings for select using (true);
revoke insert, update, delete on public.app_settings from anon, authenticated;

create function public.app_setting(p_key text) returns int
language sql stable security definer set search_path = '' as $$
  select value from public.app_settings where key = p_key
$$;

-- ---------- waitlist ----------

-- Onboarded and allowed to browse + keep a wishlist (ACTIVE or still waiting for a slot).
create function public.is_onboarded_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status in ('ACTIVE', 'WAITLISTED') and terms_accepted_at is not null
  )
$$;

drop policy "create own wishlist items" on public.wishlist_items;
create policy "create own wishlist items" on public.wishlist_items for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_onboarded_user()
    and exists (select 1 from public.wishlists w where w.id = wishlist_id and w.owner_id = (select auth.uid()))
  );

-- Serialises signups and promotions so two concurrent signups cannot both take the last slot.
create function public.lock_active_user_cap() returns void
language sql security definer set search_path = '' as $$
  select pg_advisory_xact_lock(hashtext('cardswap_active_user_cap'))
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_status public.account_status := 'ACTIVE';
begin
  perform public.lock_active_user_cap();
  if (select count(*) from public.profiles where status = 'ACTIVE') >= public.app_setting('max_active_users') then
    v_status := 'WAITLISTED';
  end if;
  insert into public.profiles (id, username, display_name, avatar_url, status)
  values (
    new.id,
    'collector_' || substr(replace(new.id::text, '-', ''), 1, 8),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 50),
    new.raw_user_meta_data ->> 'avatar_url',
    v_status
  );
  insert into public.collections (owner_id, name, is_default) values (new.id, 'Main Collection', true);
  insert into public.wishlists (owner_id, name, is_default) values (new.id, 'Wishlist', true);
  return new;
end $$;

-- Fill free slots with the longest-waiting collectors (FIFO).
create function public.promote_waitlist() returns void
language plpgsql security definer set search_path = '' as $$
declare v_free int;
begin
  perform public.lock_active_user_cap();
  v_free := public.app_setting('max_active_users') - (select count(*) from public.profiles where status = 'ACTIVE');
  if v_free > 0 then
    update public.profiles set status = 'ACTIVE'
    where id in (
      select id from public.profiles where status = 'WAITLISTED'
      order by created_at, id limit v_free
    );
  end if;
end $$;

-- A slot opens when an active account is deleted or leaves ACTIVE (e.g. suspended).
-- Promotion itself only moves rows *to* ACTIVE, so this never recurses.
create function public.profiles_release_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.promote_waitlist();
  return null;
end $$;
create trigger profiles_release_slot_on_delete after delete on public.profiles
  for each row when (old.status = 'ACTIVE') execute function public.profiles_release_slot();
create trigger profiles_release_slot_on_status after update of status on public.profiles
  for each row when (old.status = 'ACTIVE' and new.status <> 'ACTIVE') execute function public.profiles_release_slot();

-- 1-based place in line for the caller, null when not waitlisted.
create function public.waitlist_position() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.profiles w, public.profiles me
  where me.id = (select auth.uid()) and me.status = 'WAITLISTED'
    and w.status = 'WAITLISTED' and (w.created_at, w.id) <= (me.created_at, me.id)
  having count(*) > 0
$$;

create function public.admin_list_waitlist() returns table (id uuid, username text, display_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, p.username, p.display_name, p.created_at from public.profiles p
    where p.status = 'WAITLISTED' order by p.created_at, p.id limit 500;
end $$;

-- ---------- message quotas (rolling 24h) ----------

create or replace function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if new.kind = 'IMAGE' then
    if (select count(*) from public.messages
        where sender_id = new.sender_id and kind = 'IMAGE' and created_at > now() - interval '24 hours')
       >= public.app_setting('msg_image_per_day') then
      raise exception 'daily_quota_image' using errcode = 'P0001';
    end if;
  elsif (select count(*) from public.messages
         where sender_id = new.sender_id and kind <> 'IMAGE' and created_at > now() - interval '24 hours')
        >= public.app_setting('msg_text_per_day') then
    raise exception 'daily_quota_text' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ---------- card + photo caps (existing data above the caps is kept; only new rows are blocked) ----------

create function public.collection_items_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('cardswap_items:' || new.owner_id::text));
  if (select count(*) from public.collection_items where owner_id = new.owner_id) >= public.app_setting('max_collection_items') then
    raise exception 'card_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger collection_items_limit before insert on public.collection_items
  for each row execute function public.collection_items_limit();

create function public.collection_item_photos_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('cardswap_photos:' || new.item_id::text));
  if (select count(*) from public.collection_item_photos where item_id = new.item_id) >= public.app_setting('max_photos_per_item') then
    raise exception 'photo_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger collection_item_photos_limit before insert on public.collection_item_photos
  for each row execute function public.collection_item_photos_limit();

-- Client encodes 800px WebP (~60-120 KB); 1 MB leaves headroom while capping abuse.
update storage.buckets set file_size_limit = 1048576 where id in ('card-images', 'chat-images');

-- ---------- grants ----------
revoke execute on function public.promote_waitlist() from public, anon, authenticated;
revoke execute on function public.lock_active_user_cap() from public, anon, authenticated;
revoke execute on function public.waitlist_position() from public, anon;
revoke execute on function public.admin_list_waitlist() from public, anon;
grant execute on function public.waitlist_position(), public.admin_list_waitlist() to authenticated;

-- Review follow-ups for the free-tier limits (migration 15):
-- 1. The active-user cap counts onboarded collectors only. Status is decided when terms are
--    accepted, so Google sign-ins that never finish onboarding cannot fill the 100 slots.
-- 2. Raising max_active_users promotes waiting collectors immediately.
-- 3. Storage uploads are capped per user (DB-row caps alone don't stop scripted uploads).
-- 4. Waitlisted collectors may upload an avatar (they can edit their profile while waiting).

-- ---------- 1. cap = onboarded ACTIVE users; decided at onboarding ----------

create function public.active_member_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.profiles where status = 'ACTIVE' and terms_accepted_at is not null
$$;

-- Signup no longer decides; every account starts ACTIVE-but-not-onboarded (cannot create
-- anything until terms are accepted, see is_active_user).
create or replace function public.handle_new_user() returns trigger
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

-- Accepting terms takes a slot, or joins the waitlist when none is free.
create function public.profiles_claim_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.lock_active_user_cap();
  if public.active_member_count() >= public.app_setting('max_active_users') then
    new.status := 'WAITLISTED';
  end if;
  return new;
end $$;
create trigger profiles_claim_slot before update of terms_accepted_at on public.profiles
  for each row when (old.terms_accepted_at is null and new.terms_accepted_at is not null and new.status = 'ACTIVE')
  execute function public.profiles_claim_slot();

create or replace function public.promote_waitlist() returns void
language plpgsql security definer set search_path = '' as $$
declare v_free int;
begin
  perform public.lock_active_user_cap();
  v_free := public.app_setting('max_active_users') - public.active_member_count();
  if v_free > 0 then
    update public.profiles set status = 'ACTIVE'
    where id in (
      select id from public.profiles where status = 'WAITLISTED'
      order by created_at, id limit v_free
    );
  end if;
end $$;

-- ---------- 2. raising the cap fills the new slots ----------

create function public.app_settings_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.promote_waitlist();
  return null;
end $$;
create trigger app_settings_promote after update on public.app_settings
  for each row when (new.key = 'max_active_users' and new.value > old.value)
  execute function public.app_settings_after_update();

-- ---------- 3 + 4. per-user storage caps ----------

-- card-images: 2 objects (thumb + medium) per photo slot. avatars: 10 uploads / 24h (old
-- avatars are not deleted on change). chat-images: the daily image-message quota, so a
-- send that will be rejected cannot be pre-uploaded beyond it.
create function public.storage_upload_allowed(p_bucket text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_bucket
    when 'card-images' then
      (select count(*) from storage.objects where bucket_id = 'card-images' and owner_id = (select auth.uid())::text)
        < public.app_setting('max_collection_items') * public.app_setting('max_photos_per_item') * 2
    when 'avatars' then
      (select count(*) from storage.objects
       where bucket_id = 'avatars' and owner_id = (select auth.uid())::text and created_at > now() - interval '24 hours') < 10
    when 'chat-images' then
      (select count(*) from storage.objects
       where bucket_id = 'chat-images' and owner_id = (select auth.uid())::text and created_at > now() - interval '24 hours')
        < public.app_setting('msg_image_per_day')
    else false
  end
$$;

drop policy "card images: owner uploads" on storage.objects;
create policy "card images: owner uploads" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'card-images' and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user() and public.storage_upload_allowed(bucket_id)
  );
create policy "avatars: owner uploads" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_onboarded_user() and public.storage_upload_allowed(bucket_id)
  );

drop policy "chat images: members upload" on storage.objects;
create policy "chat images: members upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and public.is_conversation_member_text((storage.foldername(name))[1])
    and public.is_active_user() and public.storage_upload_allowed(bucket_id)
  );

revoke execute on function public.active_member_count() from public, anon;
revoke execute on function public.storage_upload_allowed(text) from public, anon;
grant execute on function public.active_member_count(), public.storage_upload_allowed(text) to authenticated;

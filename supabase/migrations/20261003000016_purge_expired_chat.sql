-- Chat retention: messages older than app_settings.message_retention_days are deleted daily.
-- Storage objects cannot be removed with SQL, so this returns the chat-image paths to delete;
-- the purge-chat Edge Function removes them through the Storage API.
-- Conversations and members are kept so the inbox still lists the contact.

create function public.purge_expired_chat() returns table (path text)
language sql security definer set search_path = '' as $$
  with cutoff as (
    select now() - make_interval(days => public.app_setting('message_retention_days')) as t
  ),
  gone as (
    delete from public.messages m using cutoff where m.created_at < cutoff.t
    returning m.image_path
  )
  select image_path from gone where image_path is not null
  union
  -- Orphans (upload succeeded, send failed). The subquery sees the pre-delete snapshot:
  -- a path referenced there is either returned by `gone` above or still in use.
  select o.name from storage.objects o, cutoff
  where o.bucket_id = 'chat-images' and o.created_at < cutoff.t
    and not exists (select 1 from public.messages m where m.image_path = o.name)
$$;

revoke execute on function public.purge_expired_chat() from public, anon, authenticated;
grant execute on function public.purge_expired_chat() to service_role;

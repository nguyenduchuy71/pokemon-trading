-- Buckets: card-images & avatars are public (served via CDN, immutable file names);
-- chat-images is private and readable only by conversation members (signed URLs).
-- Images are resized + re-encoded to WebP client-side (strips EXIF/GPS) before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('card-images', 'card-images', true, 2097152, array['image/webp', 'image/jpeg']),
  ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg']),
  ('chat-images', 'chat-images', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Owner-scoped writes: first path segment must be the caller's uid.
create policy "card images: owner reads own folder" on storage.objects for select to authenticated
  using (bucket_id in ('card-images', 'avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "card images: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id in ('card-images', 'avatars') and (storage.foldername(name))[1] = (select auth.uid())::text and public.is_active_user());
create policy "card images: owner updates" on storage.objects for update to authenticated
  using (bucket_id in ('card-images', 'avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "card images: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id in ('card-images', 'avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Chat images: first path segment is the conversation id.
create policy "chat images: members read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and public.is_conversation_member_text((storage.foldername(name))[1]));
create policy "chat images: members upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and public.is_conversation_member_text((storage.foldername(name))[1])
    and public.is_active_user()
  );

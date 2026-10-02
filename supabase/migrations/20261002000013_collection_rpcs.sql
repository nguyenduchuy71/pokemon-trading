-- Delete a binder without losing cards: items move to the owner's default collection first (atomic).
create function public.delete_collection(p_collection uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_default uuid;
begin
  select id into v_default from public.collections where owner_id = (select auth.uid()) and is_default;
  if v_default is null or v_default = p_collection then
    raise exception 'default collection cannot be deleted' using errcode = '42501';
  end if;
  update public.collection_items set collection_id = v_default, position = 1000000 + position
  where collection_id = p_collection and owner_id = (select auth.uid());
  delete from public.collections where id = p_collection and owner_id = (select auth.uid());
end $$;
revoke execute on function public.delete_collection(uuid) from public, anon;
grant execute on function public.delete_collection(uuid) to authenticated;

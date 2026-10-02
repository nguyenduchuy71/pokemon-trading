-- Mark a thread read using the server clock (client clocks drift → phantom unread badges).
create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security invoker set search_path = '' as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation and user_id = (select auth.uid())
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

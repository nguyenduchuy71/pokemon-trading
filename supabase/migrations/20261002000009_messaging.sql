-- Direct messaging between collectors. Conversations are 1:1 per pair; listing context travels
-- as LISTING messages (a shared reference only — never an order, trade or reservation).
-- Conversations are created exclusively through start_conversation() (see rpcs migration).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.card_listings (id) on delete set null, -- listing that started it
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default 'epoch', -- never read until the member opens the thread
  primary key (conversation_id, user_id)
);
create index conversation_members_user on public.conversation_members (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'TEXT',
  body text check (char_length(body) <= 2000),
  listing_id uuid references public.card_listings (id) on delete set null,
  image_path text,
  created_at timestamptz not null default now(),
  check (
    (kind = 'TEXT' and body is not null and char_length(trim(body)) > 0)
    or (kind = 'LISTING' and listing_id is not null)
    or (kind = 'IMAGE' and image_path is not null)
  )
);
create index messages_thread on public.messages (conversation_id, id desc);
create index messages_sender_recent on public.messages (sender_id, created_at desc);

create function public.is_conversation_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = (select auth.uid())
  )
$$;

-- Storage helper: path prefix is the conversation id as text (no cast errors on junk input).
create function public.is_conversation_member_text(p_conversation text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id::text = p_conversation and user_id = (select auth.uid())
  )
$$;

-- True when any block exists between the caller and another member of the conversation.
create function public.conversation_has_block(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation and m.user_id <> (select auth.uid())
      and public.is_blocked_between(m.user_id, (select auth.uid()))
  )
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "members read conversations" on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy "members read membership" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "mark own membership read" on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members read messages" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
    and public.is_active_user()
    and not public.conversation_has_block(conversation_id)
    and (image_path is null or image_path like conversation_id::text || '/%')
  );

revoke insert, update, delete on public.conversations, public.conversation_members, public.messages from anon, authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant insert (conversation_id, sender_id, kind, body, listing_id, image_path) on public.messages to authenticated;

-- Rate limit (20 messages / minute / sender) and bump conversation recency.
create function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.messages_before_insert();

create function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

alter publication supabase_realtime add table public.messages, public.conversation_members;

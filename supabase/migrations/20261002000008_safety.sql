-- Blocking, reporting and moderation. CardSwap does not arbitrate transactions;
-- moderation covers content and conduct on the platform only.

create table public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocked_users_blocked on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;
create policy "read own blocks" on public.blocked_users for select to authenticated using (blocker_id = (select auth.uid()));
create policy "create own blocks" on public.blocked_users for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "remove own blocks" on public.blocked_users for delete to authenticated using (blocker_id = (select auth.uid()));
revoke update on public.blocked_users from anon, authenticated;

-- Either direction counts; used by messaging RLS and search.
create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;
-- Internal only (used inside other security-definer functions). Clients use is_blocked_with().
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- Caller-scoped: "is there a block between ME and p_other?" — reveals nothing about third parties.
create function public.is_blocked_with(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and public.is_blocked_between((select auth.uid()), p_other)
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_listing_id uuid references public.card_listings (id) on delete set null,
  target_snapshot jsonb, -- listing/card facts at report time, kept if the target is deleted
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'OPEN',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text check (char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
  -- "has a target" is enforced at insert time (reports_before_insert); targets may later be deleted.
);
create unique index reports_one_open_per_listing on public.reports (reporter_id, target_listing_id)
  where status = 'OPEN' and target_listing_id is not null;
create unique index reports_one_open_per_user on public.reports (reporter_id, target_user_id)
  where status = 'OPEN' and target_listing_id is null;
create index reports_open on public.reports (created_at desc) where status = 'OPEN';

alter table public.reports enable row level security;
create policy "file reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.is_active_user() and status = 'OPEN' and target_user_id is distinct from (select auth.uid()));
create policy "read own reports or as admin" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
revoke update, delete on public.reports from anon, authenticated;
revoke insert on public.reports from anon, authenticated;
grant insert (reporter_id, target_user_id, target_listing_id, reason, details) on public.reports to authenticated;

-- Listing reports also record the seller; cap 20 reports/day per reporter; auto-hide at 3 distinct reporters.
create function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.target_user_id is null and new.target_listing_id is null then
    raise exception 'report target required' using errcode = '23514';
  end if;
  if new.target_listing_id is not null then
    select l.seller_id,
           jsonb_build_object('card', c.name, 'set', c.set_name, 'number', c.card_number, 'price', l.price,
                              'currency', l.currency, 'type', l.listing_type, 'description', l.description)
      into new.target_user_id, new.target_snapshot
    from public.card_listings l join public.pokemon_cards c on c.id = l.card_id
    where l.id = new.target_listing_id;
  end if;
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

create function public.reports_auto_hide() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.target_listing_id is not null and (
    select count(distinct reporter_id) from public.reports
    where target_listing_id = new.target_listing_id and status = 'OPEN'
  ) >= 3 then
    update public.card_listings set moderation_status = 'HIDDEN_PENDING_REVIEW'
    where id = new.target_listing_id and moderation_status = 'VISIBLE';
  end if;
  return new;
end $$;
create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.reports_auto_hide();

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  report_id uuid references public.reports (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_listing_id uuid references public.card_listings (id) on delete set null,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.moderation_actions enable row level security;
create policy "admins read moderation log" on public.moderation_actions for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.moderation_actions from anon, authenticated;

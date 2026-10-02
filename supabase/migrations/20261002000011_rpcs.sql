-- Server-side entry points. Security-definer functions validate the caller explicitly.

-- ===================== messaging =====================

-- Opens (or reuses) the 1:1 conversation with another collector. Enforces blocks, suspension
-- and a daily cap on *new* conversations (stricter for accounts younger than 7 days).
create function public.start_conversation(p_other uuid, p_listing uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_conversation uuid;
  v_cap int;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_me = p_other then raise exception 'cannot_message_self' using errcode = '22023'; end if;
  if not public.is_active_user() then raise exception 'suspended' using errcode = '42501'; end if;
  if not public.is_user_active(p_other) then raise exception 'user_unavailable' using errcode = '42501'; end if;
  if public.is_blocked_between(v_me, p_other) then raise exception 'blocked' using errcode = '42501'; end if;
  if p_listing is not null and not exists (
    select 1 from public.card_listings where id = p_listing and seller_id in (v_me, p_other)
  ) then
    raise exception 'listing_mismatch' using errcode = '22023';
  end if;
  -- A listing that is no longer visible is not used as context (and is not counted).
  if p_listing is not null and not exists (
    select 1 from public.card_listings where id = p_listing and is_active and moderation_status = 'VISIBLE'
  ) then
    p_listing := null;
  end if;

  -- Two collectors messaging each other at the same moment must still get ONE conversation.
  perform pg_advisory_xact_lock(hashtextextended(least(v_me, p_other)::text || greatest(v_me, p_other)::text, 0));

  select a.conversation_id into v_conversation
  from public.conversation_members a
  join public.conversation_members b on b.conversation_id = a.conversation_id and b.user_id = p_other
  where a.user_id = v_me
  order by a.joined_at desc
  limit 1;

  if v_conversation is not null then
    return v_conversation;
  end if;

  v_cap := case when (select created_at from public.profiles where id = v_me) > now() - interval '7 days' then 10 else 50 end;
  if (select count(*) from public.conversations where created_by = v_me and created_at > now() - interval '1 day') >= v_cap then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.conversations (created_by, listing_id) values (v_me, p_listing) returning id into v_conversation;
  insert into public.conversation_members (conversation_id, user_id) values (v_conversation, v_me), (v_conversation, p_other);

  if p_listing is not null then
    update public.card_listings set conversation_count = conversation_count + 1 where id = p_listing;
  end if;
  return v_conversation;
end $$;

-- Inbox in one round trip: counterpart, last message preview, unread count.
create function public.inbox(p_limit int default 50) returns table (
  conversation_id uuid,
  last_message_at timestamptz,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  last_kind public.message_kind,
  last_body text,
  last_sender_id uuid,
  unread_count int,
  is_blocked boolean
)
language sql stable security invoker set search_path = '' as $$
  select
    c.id,
    c.last_message_at,
    o.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    lm.kind,
    lm.body,
    lm.sender_id,
    (select count(*)::int from public.messages m
       where m.conversation_id = c.id and m.created_at > me.last_read_at and m.sender_id is distinct from me.user_id),
    coalesce(public.is_blocked_with(o.user_id), false)
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join public.conversation_members o on o.conversation_id = c.id and o.user_id <> me.user_id
  left join public.profiles p on p.id = o.user_id
  left join lateral (
    select m.kind, m.body, m.sender_id from public.messages m
    where m.conversation_id = c.id order by m.id desc limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
  order by c.last_message_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

-- Escape LIKE wildcards in user input ("_" is common in usernames).
create function public.like_escape(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_')
$$;

-- ===================== marketplace =====================

create function public.search_listings(
  p_q text default null,
  p_set_codes text[] default null,
  p_rarities text[] default null,
  p_conditions public.card_condition[] default null,
  p_languages text[] default null,
  p_printings text[] default null,
  p_types public.listing_type[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_currency public.currency_code default 'VND',
  p_city text default null,
  p_card_id uuid default null,
  p_seller uuid default null,
  p_sort text default 'recent',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  listing_id uuid,
  created_at timestamptz,
  listing_type public.listing_type,
  price numeric,
  currency public.currency_code,
  price_converted numeric,
  quantity int,
  looking_for text[],
  view_count int,
  conversation_count int,
  condition public.card_condition,
  printing text,
  grading_company text,
  grade numeric,
  card_id uuid,
  card_name text,
  pokemon_name text,
  set_name text,
  set_code text,
  card_number text,
  printed_total int,
  rarity text,
  card_language text,
  card_image_small text,
  seller_id uuid,
  seller_username text,
  seller_display_name text,
  seller_avatar_url text,
  seller_city text,
  seller_since timestamptz,
  thumb_path text,
  medium_path text
)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select
      nullif(trim(p_q), '') as raw,
      -- "#199/165", "199", "001" → card-number search on the part before the slash
      case when trim(coalesce(p_q, '')) ~ '^#?[0-9]+(/[0-9]+)?$'
        then ltrim(split_part(ltrim(trim(p_q), '#'), '/', 1), '0') end as number_q,
      case when left(trim(coalesce(p_q, '')), 1) = '@' then lower(substr(trim(p_q), 2)) end as user_q,
      array_remove(string_to_array(public.search_normalize(trim(coalesce(p_q, ''))), ' '), '') as words
  ),
  base as (
    select
      l.*,
      i.condition, i.printing, i.grading_company, i.grade,
      c.name as c_name, c.pokemon_name as c_pokemon, c.set_name as c_set_name, c.set_code as c_set_code,
      c.card_number as c_number, c.printed_total as c_total, c.rarity as c_rarity, c.language as c_language,
      c.image_small_url as c_image,
      p.username, p.display_name, p.avatar_url, p.location_city, p.created_at as p_created,
      public.convert_amount(l.price, l.currency, p_currency) as converted
    from public.card_listings l
    join public.collection_items i on i.id = l.item_id
    join public.pokemon_cards c on c.id = l.card_id
    join public.profiles p on p.id = l.seller_id
    cross join q
    where l.is_active
      and l.moderation_status = 'VISIBLE'
      and p.status = 'ACTIVE'
      and not public.is_blocked_with(l.seller_id)
      and (p_card_id is null or l.card_id = p_card_id)
      and (p_seller is null or l.seller_id = p_seller)
      and (p_set_codes is null or c.set_code = any (p_set_codes))
      and (p_rarities is null or c.rarity = any (p_rarities))
      and (p_conditions is null or i.condition = any (p_conditions))
      and (p_languages is null or c.language = any (p_languages))
      and (p_printings is null or i.printing = any (p_printings))
      and (p_types is null or l.listing_type = any (p_types))
      and (p_city is null or p.location_city = p_city)
      and (q.raw is null
        or (q.user_q is not null and p.username like public.like_escape(q.user_q) || '%')
        or (q.number_q is not null and ltrim(c.card_number, '0') = q.number_q)
        or (q.user_q is null and q.number_q is null and not exists (
              select 1 from unnest(q.words) w
              where public.card_haystack(c.name, c.pokemon_name, c.set_name, c.set_code, c.card_number) not like '%' || public.like_escape(w) || '%'
            )))
  )
  select
    b.id, b.created_at, b.listing_type, b.price, b.currency, b.converted, b.quantity, b.looking_for,
    b.view_count, b.conversation_count, b.condition, b.printing, b.grading_company, b.grade,
    b.card_id, b.c_name, b.c_pokemon, b.c_set_name, b.c_set_code, b.c_number, b.c_total, b.c_rarity,
    b.c_language, b.c_image, b.seller_id, b.username, b.display_name, b.avatar_url, b.location_city,
    b.p_created, ph.thumb_path, ph.medium_path
  from base b
  left join lateral (
    select thumb_path, medium_path from public.collection_item_photos
    where item_id = b.item_id order by position, created_at limit 1
  ) ph on true
  where (p_min is null or b.converted >= p_min)
    and (p_max is null or b.converted <= p_max)
  order by
    case when p_sort = 'price_asc' then b.converted end asc nulls last,
    case when p_sort = 'price_desc' then b.converted end desc nulls last,
    case when p_sort = 'popular' then b.conversation_count end desc,
    case when p_sort = 'views' then b.view_count end desc,
    b.created_at desc,
    b.id
  limit least(greatest(p_limit, 1), 48)
  offset least(greatest(p_offset, 0), 2400)
$$;

-- Filter options present among visible listings.
create function public.marketplace_facets() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with v as (
    select c.set_code, c.set_name, c.language, c.rarity, i.printing
    from public.card_listings l
    join public.pokemon_cards c on c.id = l.card_id
    join public.collection_items i on i.id = l.item_id
    where l.is_active and l.moderation_status = 'VISIBLE'
  )
  select jsonb_build_object(
    'sets', coalesce((select jsonb_agg(distinct jsonb_build_object('code', set_code, 'name', set_name, 'language', language)) from v), '[]'::jsonb),
    'rarities', coalesce((select jsonb_agg(distinct rarity) from v where rarity is not null), '[]'::jsonb),
    'languages', coalesce((select jsonb_agg(distinct language) from v), '[]'::jsonb),
    'printings', coalesce((select jsonb_agg(distinct printing) from v), '[]'::jsonb)
  )
$$;

-- Daily-deduplicated view counter (signed-in viewers only; anonymous identifiers are forgeable).
create table public.listing_views_daily (
  listing_id uuid not null references public.card_listings (id) on delete cascade,
  viewer_key text not null,
  day date not null default current_date,
  primary key (listing_id, viewer_key, day)
);
alter table public.listing_views_daily enable row level security; -- no policies: RPC-only
revoke all on public.listing_views_daily from anon, authenticated;

create function public.record_listing_view(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_key text := (select auth.uid())::text;
  v_rows int;
begin
  if v_key is null then return; end if;
  if not exists (
    select 1 from public.card_listings
    where id = p_listing and is_active and moderation_status = 'VISIBLE' and seller_id <> (select auth.uid())
  ) then
    return;
  end if;
  if random() < 0.01 then
    delete from public.listing_views_daily where day < current_date - 2;
  end if;
  insert into public.listing_views_daily (listing_id, viewer_key) values (p_listing, v_key) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.card_listings set view_count = view_count + 1 where id = p_listing;
  end if;
end $$;

-- ===================== catalog =====================

create function public.search_catalog(p_q text, p_language text default null, p_limit int default 20)
returns setof public.pokemon_cards
language sql stable security invoker set search_path = '' as $$
  with q as (
    select
      array_remove(string_to_array(public.search_normalize(trim(coalesce(p_q, ''))), ' '), '') as words,
      case when trim(coalesce(p_q, '')) ~ '^#?[0-9]+(/[0-9]+)?$'
        then ltrim(split_part(ltrim(trim(p_q), '#'), '/', 1), '0') end as number_q
  )
  select c.* from public.pokemon_cards c, q
  where (p_language is null or c.language = p_language)
    and cardinality(q.words) > 0
    and (
      (q.number_q is not null and ltrim(c.card_number, '0') = q.number_q)
      or (
        -- first word narrows through the trigram index; the rest must also match
        public.card_haystack(c.name, c.pokemon_name, c.set_name, c.set_code, c.card_number) like '%' || public.like_escape(q.words[1]) || '%'
        and not exists (
          select 1 from unnest(q.words) w
          where public.card_haystack(c.name, c.pokemon_name, c.set_name, c.set_code, c.card_number) not like '%' || public.like_escape(w) || '%'
        )
      )
    )
  order by
    (public.search_normalize(c.pokemon_name) = public.search_normalize(trim(p_q))) desc,
    c.release_date desc nulls last,
    c.set_code,
    c.card_number
  limit least(greatest(p_limit, 1), 40)
$$;

-- ===================== collection =====================

create function public.collection_stats(p_currency public.currency_code default 'VND') returns table (
  total_cards bigint,
  unique_cards bigint,
  sets bigint,
  estimated_value numeric,
  listed_for_sale bigint,
  listed_for_trade bigint,
  wishlist_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with items as (
    select i.*, c.set_code, l.listing_type, l.price as l_price, l.currency as l_currency
    from public.collection_items i
    join public.pokemon_cards c on c.id = i.card_id
    left join public.card_listings l on l.item_id = i.id and l.is_active
    where i.owner_id = (select auth.uid())
  )
  select
    coalesce(sum(quantity), 0),
    count(distinct card_id),
    count(distinct set_code),
    coalesce(sum(coalesce(
      public.convert_amount(estimated_value, value_currency, p_currency),
      public.convert_amount(l_price, l_currency, p_currency)
    ) * quantity), 0),
    count(*) filter (where listing_type in ('SALE', 'SALE_OR_TRADE')),
    count(*) filter (where listing_type in ('TRADE', 'SALE_OR_TRADE')),
    (select count(*) from public.wishlist_items w where w.owner_id = (select auth.uid()))
  from items
$$;

-- Persist binder order in one transaction. Positions follow array order.
create function public.reorder_collection_items(p_collection uuid, p_item_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.collection_items i
  set position = o.ord
  from unnest(p_item_ids) with ordinality as o(item_id, ord)
  where i.id = o.item_id and i.collection_id = p_collection and i.owner_id = (select auth.uid());
end $$;

-- ===================== wishlist =====================

-- How many visible listings (not mine, not blocked) exist for each of my wanted cards.
create function public.wishlist_availability() returns table (wishlist_item_id uuid, available_count int)
language sql stable security invoker set search_path = '' as $$
  select w.id, count(l.id)::int
  from public.wishlist_items w
  left join public.card_listings l
    on l.card_id = w.card_id and l.is_active and l.moderation_status = 'VISIBLE'
   and l.seller_id <> w.owner_id and not public.is_blocked_with(l.seller_id)
  where w.owner_id = (select auth.uid())
  group by w.id
$$;

-- ===================== profiles =====================

create function public.public_profile(p_username text) returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  location_city text,
  created_at timestamptz,
  collection_size bigint,
  listed_count bigint,
  wishlist_count bigint,
  is_blocked_by_me boolean
)
language sql stable security definer set search_path = '' as $$
  select
    p.id, p.username, p.display_name, p.bio, p.avatar_url, p.location_city, p.created_at,
    (select coalesce(sum(i.quantity), 0) from public.collection_items i
       join public.collections c on c.id = i.collection_id where i.owner_id = p.id and c.is_public),
    (select count(*) from public.card_listings l where l.seller_id = p.id and l.is_active and l.moderation_status = 'VISIBLE'),
    (select count(*) from public.wishlist_items w join public.wishlists wl on wl.id = w.wishlist_id where w.owner_id = p.id and wl.is_public),
    exists (select 1 from public.blocked_users b where b.blocker_id = (select auth.uid()) and b.blocked_id = p.id)
  from public.profiles p
  where p.username = lower(p_username)
    and p.terms_accepted_at is not null
    and (p.status = 'ACTIVE' or p.id = (select auth.uid()) or public.is_admin())
$$;

-- ===================== moderation (admins only) =====================

create function public.admin_resolve_report(p_report uuid, p_status public.report_status, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status = 'OPEN' then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.reports
  set status = p_status, resolved_by = (select auth.uid()), resolution_note = p_note, resolved_at = now()
  where id = p_report;
  insert into public.moderation_actions (admin_id, action, report_id, note)
  values ((select auth.uid()), 'REPORT_' || p_status::text, p_report, p_note);
end $$;

create function public.admin_set_listing_moderation(p_listing uuid, p_status public.moderation_status, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.card_listings set moderation_status = p_status where id = p_listing;
  insert into public.moderation_actions (admin_id, action, target_listing_id, note)
  values ((select auth.uid()), 'LISTING_' || p_status::text, p_listing, p_note);
end $$;

create function public.admin_set_user_status(p_user uuid, p_status public.account_status, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = (select auth.uid()) then raise exception 'cannot_moderate_self' using errcode = '22023'; end if;
  update public.profiles set status = p_status where id = p_user;
  insert into public.moderation_actions (admin_id, action, target_user_id, note)
  values ((select auth.uid()), 'USER_' || p_status::text, p_user, p_note);
end $$;

-- Lock down: functions are executable by authenticated by default via PUBLIC; tighten the sensitive ones.
revoke execute on function public.start_conversation(uuid, uuid) from public, anon;
revoke execute on function public.inbox(int) from public, anon;
revoke execute on function public.collection_stats(public.currency_code) from public, anon;
revoke execute on function public.reorder_collection_items(uuid, uuid[]) from public, anon;
revoke execute on function public.wishlist_availability() from public, anon;
revoke execute on function public.admin_resolve_report(uuid, public.report_status, text) from public, anon;
revoke execute on function public.admin_set_listing_moderation(uuid, public.moderation_status, text) from public, anon;
revoke execute on function public.admin_set_user_status(uuid, public.account_status, text) from public, anon;
grant execute on function public.start_conversation(uuid, uuid), public.inbox(int), public.collection_stats(public.currency_code),
  public.reorder_collection_items(uuid, uuid[]), public.wishlist_availability(),
  public.admin_resolve_report(uuid, public.report_status, text),
  public.admin_set_listing_moderation(uuid, public.moderation_status, text),
  public.admin_set_user_status(uuid, public.account_status, text)
  to authenticated;

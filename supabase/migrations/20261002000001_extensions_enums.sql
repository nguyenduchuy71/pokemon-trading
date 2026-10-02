-- CardSwap: discovery + listing + communication + community.
-- Intentionally NO trades / orders / payments / escrow / transactions / shipping tables. [scope-guard: allow]

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.card_condition as enum ('MINT', 'NEAR_MINT', 'EXCELLENT', 'LIGHT_PLAYED', 'PLAYED', 'POOR');
create type public.listing_type as enum ('SALE', 'TRADE', 'SALE_OR_TRADE');
create type public.currency_code as enum ('VND', 'USD');
create type public.moderation_status as enum ('VISIBLE', 'HIDDEN_PENDING_REVIEW', 'REMOVED');
create type public.user_role as enum ('USER', 'ADMIN');
create type public.account_status as enum ('ACTIVE', 'SUSPENDED');
create type public.wishlist_priority as enum ('HIGH', 'MEDIUM', 'LOW');
create type public.message_kind as enum ('TEXT', 'LISTING', 'IMAGE');
create type public.report_status as enum ('OPEN', 'RESOLVED', 'DISMISSED');
create type public.report_reason as enum (
  'SCAM_SUSPICION', 'HARASSMENT', 'SPAM', 'FAKE_LISTING', 'MISLEADING_CONDITION', 'PROHIBITED_CONTENT',
  'FAKE_CARD', 'WRONG_PRICE', 'WRONG_CARD_INFO', 'MISLEADING_PHOTOS', 'OTHER'
);

-- Ordinal rank for "minimum condition" comparisons (MINT best = 6).
create function public.condition_rank(c public.card_condition) returns int
language sql immutable parallel safe set search_path = '' as $$
  select case c
    when 'MINT' then 6 when 'NEAR_MINT' then 5 when 'EXCELLENT' then 4
    when 'LIGHT_PLAYED' then 3 when 'PLAYED' then 2 else 1 end
$$;

-- Accent/case-insensitive normalisation used by search indexes ("Pokémon" = "pokemon").
create function public.search_normalize(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

-- Shared updated_at trigger.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

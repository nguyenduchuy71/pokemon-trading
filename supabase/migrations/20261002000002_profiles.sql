-- Collector profiles. Privacy: no address, phone, government ID or payment data — ever.
-- Location is an approximate city from a fixed list (mirrors src/constants/vn-cities.ts).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 50),
  bio text check (char_length(bio) <= 500),
  avatar_url text check (char_length(avatar_url) <= 500 and avatar_url ~ '^https?://'),
  location_city text check (location_city in (
    'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Bien Hoa', 'Nha Trang', 'Hue',
    'Vung Tau', 'Da Lat', 'Quy Nhon', 'Buon Ma Thuot', 'Vinh', 'Thu Dau Mot', 'Long Xuyen', 'Ha Long',
    'Thai Nguyen', 'Nam Dinh', 'Other (Vietnam)', 'Outside Vietnam'
  )),
  preferred_locale text not null default 'vi' check (preferred_locale in ('vi', 'en')),
  preferred_currency public.currency_code not null default 'VND',
  role public.user_role not null default 'USER',
  status public.account_status not null default 'ACTIVE',
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Column-level guard: role/status are only changeable by admin RPCs (security definer).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, bio, avatar_url, location_city, preferred_locale, preferred_currency, terms_accepted_at)
  on public.profiles to authenticated;

-- ---------- helpers used by RLS across the schema ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'ADMIN')
$$;

-- Caller finished onboarding and is not suspended → allowed to create content.
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'ACTIVE' and terms_accepted_at is not null
  )
$$;

create function public.is_user_active(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user and status = 'ACTIVE')
$$;

create function public.is_username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = p_username and id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid))
$$;

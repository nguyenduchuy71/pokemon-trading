-- Daily FX snapshot for VND <-> USD display, filtering and sorting.
-- Listing price + currency remain the source of truth; conversions are always labelled "≈" in the UI.
-- Refreshed by the fx-refresh Edge Function (scheduled — see docs/deployment.md).

create table public.fx_rates (
  base public.currency_code not null,
  quote public.currency_code not null,
  rate numeric(20, 10) not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

insert into public.fx_rates (base, quote, rate) values
  ('USD', 'VND', 26300),
  ('VND', 'USD', 1.0 / 26300);

alter table public.fx_rates enable row level security;
create policy "fx rates are public" on public.fx_rates for select using (true);
revoke insert, update, delete on public.fx_rates from anon, authenticated;

create function public.convert_amount(p_amount numeric, p_from public.currency_code, p_to public.currency_code) returns numeric
language sql stable parallel safe set search_path = '' as $$
  select case
    when p_amount is null then null
    when p_from = p_to then p_amount
    else p_amount * (select rate from public.fx_rates where base = p_from and quote = p_to)
  end
$$;

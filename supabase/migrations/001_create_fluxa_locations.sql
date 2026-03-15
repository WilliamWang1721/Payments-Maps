create extension if not exists pgcrypto;

create table if not exists public.fluxa_locations (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,
  address text not null,
  brand text not null default 'Unknown',
  bin text not null default 'N/A',
  city text not null default 'Unknown',
  status text not null default 'active' check (status in ('active', 'inactive')),
  latitude numeric(10, 6) not null,
  longitude numeric(11, 6) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fluxa_locations_status on public.fluxa_locations(status);
create index if not exists idx_fluxa_locations_brand on public.fluxa_locations(brand);
create index if not exists idx_fluxa_locations_geo on public.fluxa_locations(latitude, longitude);

create or replace function public.set_fluxa_locations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fluxa_locations_set_updated_at on public.fluxa_locations;
create trigger fluxa_locations_set_updated_at
before update on public.fluxa_locations
for each row
execute function public.set_fluxa_locations_updated_at();

alter table public.fluxa_locations enable row level security;

drop policy if exists "Fluxa locations are readable" on public.fluxa_locations;
create policy "Fluxa locations are readable"
on public.fluxa_locations
for select
using (true);

drop policy if exists "Fluxa locations are insertable" on public.fluxa_locations;
create policy "Fluxa locations are insertable"
on public.fluxa_locations
for insert
with check (true);

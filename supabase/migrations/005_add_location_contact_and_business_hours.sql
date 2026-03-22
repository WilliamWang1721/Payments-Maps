alter table public.fluxa_locations
  add column if not exists contact_info text,
  add column if not exists business_hours jsonb;

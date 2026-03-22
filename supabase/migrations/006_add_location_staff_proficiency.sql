alter table public.fluxa_locations
  add column if not exists staff_proficiency_level integer
    check (staff_proficiency_level between 1 and 5),
  add column if not exists staff_proficiency_updated_at timestamptz;

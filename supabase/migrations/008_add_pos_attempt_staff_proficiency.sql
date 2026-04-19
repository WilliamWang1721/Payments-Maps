alter table public.pos_attempts
  add column if not exists staff_proficiency_level integer
    check (staff_proficiency_level between 1 and 5);

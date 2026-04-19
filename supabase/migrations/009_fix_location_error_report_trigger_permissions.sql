create or replace function public.handle_location_error_report_created()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.location_error_report_events (
    report_id,
    actor_user_id,
    actor_label,
    event_type,
    visibility,
    to_status,
    metadata
  ) values (
    new.id,
    new.reporter_user_id,
    new.reporter_label,
    'submitted',
    'public',
    new.status,
    jsonb_build_object(
      'category', new.category,
      'severity', new.severity
    )
  );

  return new;
end;
$$;

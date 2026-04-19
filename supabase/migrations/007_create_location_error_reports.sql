create extension if not exists pgcrypto;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  with jwt as (
    select coalesce(auth.jwt(), '{}'::jsonb) as token
  ),
  metadata as (
    select
      coalesce(token -> 'user_metadata', '{}'::jsonb) as user_meta,
      coalesce(token -> 'app_metadata', '{}'::jsonb) as app_meta
    from jwt
  ),
  role_candidates as (
    select lower(trim(value)) as role
    from metadata,
      regexp_split_to_table(coalesce(user_meta ->> 'role', ''), ',') as value
    union all
    select lower(trim(value)) as role
    from metadata,
      regexp_split_to_table(coalesce(app_meta ->> 'role', ''), ',') as value
    union all
    select lower(trim(value)) as role
    from metadata,
      regexp_split_to_table(coalesce(user_meta ->> 'roles', ''), ',') as value
    union all
    select lower(trim(value)) as role
    from metadata,
      regexp_split_to_table(coalesce(app_meta ->> 'roles', ''), ',') as value
    union all
    select lower(trim(value)) as role
    from metadata,
      lateral jsonb_array_elements_text(case
        when jsonb_typeof(user_meta -> 'role') = 'array' then user_meta -> 'role'
        else '[]'::jsonb
      end) as value
    union all
    select lower(trim(value)) as role
    from metadata,
      lateral jsonb_array_elements_text(case
        when jsonb_typeof(app_meta -> 'role') = 'array' then app_meta -> 'role'
        else '[]'::jsonb
      end) as value
    union all
    select lower(trim(value)) as role
    from metadata,
      lateral jsonb_array_elements_text(case
        when jsonb_typeof(user_meta -> 'roles') = 'array' then user_meta -> 'roles'
        else '[]'::jsonb
      end) as value
    union all
    select lower(trim(value)) as role
    from metadata,
      lateral jsonb_array_elements_text(case
        when jsonb_typeof(app_meta -> 'roles') = 'array' then app_meta -> 'roles'
        else '[]'::jsonb
      end) as value
  )
  select
    exists (
      select 1
      from metadata
      where lower(coalesce(user_meta ->> 'is_admin', '')) in ('true', '1', 'yes')
        or lower(coalesce(app_meta ->> 'is_admin', '')) in ('true', '1', 'yes')
        or lower(coalesce(user_meta ->> 'admin', '')) in ('true', '1', 'yes')
        or lower(coalesce(app_meta ->> 'admin', '')) in ('true', '1', 'yes')
    )
    or exists (
      select 1
      from role_candidates
      where role in ('admin', 'super_admin', 'superadmin')
    );
$$;

create or replace function public.current_auth_label()
returns text
language sql
stable
as $$
  with jwt as (
    select coalesce(auth.jwt(), '{}'::jsonb) as token
  )
  select coalesce(
    nullif(trim(token -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(token -> 'user_metadata' ->> 'name'), ''),
    nullif(trim(token ->> 'email'), ''),
    coalesce(auth.uid()::text, 'Unknown User')
  )
  from jwt;
$$;

create table if not exists public.location_error_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  location_source text not null
    check (location_source in ('fluxa_locations', 'pos_machines')),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reporter_label text not null,
  category text not null
    check (category in (
      'location_info_error',
      'support_claim_error',
      'duplicate_or_merge_issue',
      'status_issue',
      'content_issue',
      'feature_bug',
      'other'
    )),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  status text not null default 'submitted'
    check (status in ('submitted', 'triaged', 'need_info', 'accepted', 'rejected', 'resolved', 'closed')),
  summary text not null,
  details text not null,
  field_key text,
  context_tab text
    check (context_tab in ('overview', 'attempt', 'reviews')),
  related_attempt_id uuid,
  related_review_id text,
  related_review_source text
    check (related_review_source in ('comment', 'review')),
  location_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(location_snapshot) = 'object'),
  report_context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(report_context) = 'object'),
  attachments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachments) = 'array'),
  resolution_type text,
  resolution_note text,
  linked_linear_issue_id text,
  linked_linear_issue_url text,
  triaged_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  triaged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_location_error_reports_status
  on public.location_error_reports(status);
create index if not exists idx_location_error_reports_category
  on public.location_error_reports(category);
create index if not exists idx_location_error_reports_severity
  on public.location_error_reports(severity);
create index if not exists idx_location_error_reports_location
  on public.location_error_reports(location_id, location_source);
create index if not exists idx_location_error_reports_reporter
  on public.location_error_reports(reporter_user_id);
create index if not exists idx_location_error_reports_created_at
  on public.location_error_reports(created_at desc);

create or replace function public.set_location_error_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists location_error_reports_set_updated_at on public.location_error_reports;
create trigger location_error_reports_set_updated_at
before update on public.location_error_reports
for each row
execute function public.set_location_error_reports_updated_at();

create table if not exists public.location_error_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.location_error_reports(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text not null,
  event_type text not null
    check (event_type in ('submitted', 'attachments_added', 'status_changed', 'note')),
  visibility text not null default 'public'
    check (visibility in ('public', 'internal')),
  from_status text
    check (from_status in ('submitted', 'triaged', 'need_info', 'accepted', 'rejected', 'resolved', 'closed')),
  to_status text
    check (to_status in ('submitted', 'triaged', 'need_info', 'accepted', 'rejected', 'resolved', 'closed')),
  note text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_location_error_report_events_report
  on public.location_error_report_events(report_id, created_at desc);
create index if not exists idx_location_error_report_events_visibility
  on public.location_error_report_events(visibility);

create or replace function public.handle_location_error_report_created()
returns trigger
language plpgsql
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

drop trigger if exists location_error_report_created on public.location_error_reports;
create trigger location_error_report_created
after insert on public.location_error_reports
for each row
execute function public.handle_location_error_report_created();

create or replace function public.finalize_location_error_report_attachments(
  p_report_id uuid,
  p_attachments jsonb
)
returns public.location_error_reports
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.location_error_reports;
  v_attachments jsonb := coalesce(p_attachments, '[]'::jsonb);
begin
  if v_user_id is null then
    raise exception '当前登录状态已失效，请重新登录后再上传附件。';
  end if;

  if jsonb_typeof(v_attachments) <> 'array' then
    raise exception '附件数据格式无效。';
  end if;

  select *
  into v_report
  from public.location_error_reports
  where id = p_report_id;

  if not found then
    raise exception '错误上报不存在。';
  end if;

  if not public.is_admin_user() and v_report.reporter_user_id <> v_user_id then
    raise exception '只有上报人或管理员可以更新附件。';
  end if;

  update public.location_error_reports
  set attachments = v_attachments
  where id = p_report_id
  returning * into v_report;

  insert into public.location_error_report_events (
    report_id,
    actor_user_id,
    actor_label,
    event_type,
    visibility,
    to_status,
    note,
    metadata
  ) values (
    v_report.id,
    v_user_id,
    public.current_auth_label(),
    'attachments_added',
    'public',
    v_report.status,
    null,
    jsonb_build_object(
      'count',
      jsonb_array_length(v_attachments)
    )
  );

  return v_report;
end;
$$;

create or replace function public.add_location_error_report_event(
  p_report_id uuid,
  p_event_type text,
  p_note text default null,
  p_visibility text default 'internal',
  p_metadata jsonb default '{}'::jsonb
)
returns public.location_error_report_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.location_error_reports;
  v_event public.location_error_report_events;
  v_visibility text := coalesce(nullif(trim(p_visibility), ''), 'internal');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_user_id is null then
    raise exception '当前登录状态已失效，请重新登录后再处理上报。';
  end if;

  if v_visibility not in ('public', 'internal') then
    raise exception '事件可见性无效。';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception '事件元数据格式无效。';
  end if;

  if p_event_type not in ('attachments_added', 'status_changed', 'note') then
    raise exception '事件类型无效。';
  end if;

  select *
  into v_report
  from public.location_error_reports
  where id = p_report_id;

  if not found then
    raise exception '错误上报不存在。';
  end if;

  if not public.is_admin_user() and v_report.reporter_user_id <> v_user_id then
    raise exception '只有上报人或管理员可以追加事件。';
  end if;

  insert into public.location_error_report_events (
    report_id,
    actor_user_id,
    actor_label,
    event_type,
    visibility,
    to_status,
    note,
    metadata
  ) values (
    v_report.id,
    v_user_id,
    public.current_auth_label(),
    p_event_type,
    v_visibility,
    v_report.status,
    nullif(trim(p_note), ''),
    v_metadata
  )
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.transition_location_error_report(
  p_report_id uuid,
  p_status text default null,
  p_note text default null,
  p_resolution_type text default null,
  p_resolution_note text default null,
  p_linked_linear_issue_id text default null,
  p_linked_linear_issue_url text default null,
  p_visibility text default 'internal'
)
returns public.location_error_reports
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.location_error_reports;
  v_previous_status text;
  v_next_status text;
  v_event_type text;
  v_visibility text := coalesce(nullif(trim(p_visibility), ''), 'internal');
begin
  if v_user_id is null then
    raise exception '当前登录状态已失效，请重新登录后再处理上报。';
  end if;

  if not public.is_admin_user() then
    raise exception '只有管理员可以处理错误上报。';
  end if;

  if v_visibility not in ('public', 'internal') then
    raise exception '事件可见性无效。';
  end if;

  select *
  into v_report
  from public.location_error_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception '错误上报不存在。';
  end if;

  v_next_status := coalesce(nullif(trim(p_status), ''), v_report.status);

  if v_next_status not in ('submitted', 'triaged', 'need_info', 'accepted', 'rejected', 'resolved', 'closed') then
    raise exception '错误上报状态无效。';
  end if;

  v_previous_status := v_report.status;
  v_event_type := case
    when v_next_status = v_previous_status then 'note'
    else 'status_changed'
  end;

  update public.location_error_reports
  set
    status = v_next_status,
    resolution_type = case
      when p_resolution_type is null then resolution_type
      else nullif(trim(p_resolution_type), '')
    end,
    resolution_note = case
      when p_resolution_note is null then resolution_note
      else nullif(trim(p_resolution_note), '')
    end,
    linked_linear_issue_id = case
      when p_linked_linear_issue_id is null then linked_linear_issue_id
      else nullif(trim(p_linked_linear_issue_id), '')
    end,
    linked_linear_issue_url = case
      when p_linked_linear_issue_url is null then linked_linear_issue_url
      else nullif(trim(p_linked_linear_issue_url), '')
    end,
    triaged_by = case
      when triaged_at is null and v_next_status <> 'submitted' then v_user_id
      else triaged_by
    end,
    triaged_at = case
      when triaged_at is null and v_next_status <> 'submitted' then now()
      else triaged_at
    end,
    resolved_by = case
      when v_next_status in ('resolved', 'closed') then v_user_id
      else resolved_by
    end,
    resolved_at = case
      when v_next_status in ('resolved', 'closed') then now()
      else resolved_at
    end
  where id = p_report_id
  returning * into v_report;

  insert into public.location_error_report_events (
    report_id,
    actor_user_id,
    actor_label,
    event_type,
    visibility,
    from_status,
    to_status,
    note,
    metadata
  ) values (
    v_report.id,
    v_user_id,
    public.current_auth_label(),
    v_event_type,
    v_visibility,
    case when v_event_type = 'status_changed' then v_previous_status end,
    v_next_status,
    nullif(trim(p_note), ''),
    jsonb_build_object(
      'resolution_type', v_report.resolution_type,
      'linked_linear_issue_id', v_report.linked_linear_issue_id,
      'linked_linear_issue_url', v_report.linked_linear_issue_url
    )
  );

  return v_report;
end;
$$;

grant execute on function public.finalize_location_error_report_attachments(uuid, jsonb) to authenticated;
grant execute on function public.add_location_error_report_event(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.transition_location_error_report(uuid, text, text, text, text, text, text, text) to authenticated;

alter table public.location_error_reports enable row level security;
alter table public.location_error_report_events enable row level security;

drop policy if exists "Users can create own location error reports" on public.location_error_reports;
create policy "Users can create own location error reports"
on public.location_error_reports
for insert
to authenticated
with check (
  auth.uid() is not null
  and reporter_user_id = auth.uid()
);

drop policy if exists "Users can read own or admin location error reports" on public.location_error_reports;
create policy "Users can read own or admin location error reports"
on public.location_error_reports
for select
to authenticated
using (
  public.is_admin_user()
  or reporter_user_id = auth.uid()
);

drop policy if exists "Users can read visible location error report events" on public.location_error_report_events;
create policy "Users can read visible location error report events"
on public.location_error_report_events
for select
to authenticated
using (
  public.is_admin_user()
  or (
    visibility = 'public'
    and exists (
      select 1
      from public.location_error_reports reports
      where reports.id = report_id
        and reports.reporter_user_id = auth.uid()
    )
  )
);

insert into storage.buckets (id, name, public)
values ('location-error-report-attachments', 'location-error-report-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Report owners and admins can read error report attachments" on storage.objects;
create policy "Report owners and admins can read error report attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'location-error-report-attachments'
  and exists (
    select 1
    from public.location_error_reports reports
    where reports.id::text = (storage.foldername(name))[1]
      and (public.is_admin_user() or reports.reporter_user_id = auth.uid())
  )
);

drop policy if exists "Report owners can upload error report attachments" on storage.objects;
create policy "Report owners can upload error report attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'location-error-report-attachments'
  and auth.uid() is not null
  and exists (
    select 1
    from public.location_error_reports reports
    where reports.id::text = (storage.foldername(name))[1]
      and reports.reporter_user_id = auth.uid()
  )
);

drop policy if exists "Report owners and admins can delete error report attachments" on storage.objects;
create policy "Report owners and admins can delete error report attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'location-error-report-attachments'
  and exists (
    select 1
    from public.location_error_reports reports
    where reports.id::text = (storage.foldername(name))[1]
      and (public.is_admin_user() or reports.reporter_user_id = auth.uid())
  )
);

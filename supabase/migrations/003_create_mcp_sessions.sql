create extension if not exists pgcrypto;

create table if not exists public.mcp_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_label text not null default 'Fluxa MCP Session',
  client_type text not null default 'generic',
  scope_template text not null default 'standard_user',
  scopes jsonb not null default '[]'::jsonb,
  token_hint text not null,
  session_token_hash text not null unique,
  last_used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mcp_sessions_scope_array check (jsonb_typeof(scopes) = 'array')
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mcp_sessions'
      and column_name = 'session_name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mcp_sessions'
      and column_name = 'session_label'
  ) then
    alter table public.mcp_sessions rename column session_name to session_label;
  end if;
end
$$;

alter table if exists public.mcp_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists session_label text default 'Fluxa MCP Session',
  add column if not exists client_type text default 'generic',
  add column if not exists scope_template text default 'standard_user',
  add column if not exists scopes jsonb default '[]'::jsonb,
  add column if not exists token_hint text,
  add column if not exists session_token_hash text,
  add column if not exists last_used_at timestamptz,
  add column if not exists expires_at timestamptz default (now() + interval '30 days'),
  add column if not exists revoked_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  alter table public.mcp_sessions
    add constraint mcp_sessions_scope_array
    check (jsonb_typeof(scopes) = 'array');
exception
  when duplicate_object then null;
end
$$;

create index if not exists idx_mcp_sessions_user_id on public.mcp_sessions(user_id);
create index if not exists idx_mcp_sessions_expires_at on public.mcp_sessions(expires_at);
create index if not exists idx_mcp_sessions_revoked_at on public.mcp_sessions(revoked_at);
create index if not exists idx_mcp_sessions_last_used_at on public.mcp_sessions(last_used_at desc);
create unique index if not exists idx_mcp_sessions_session_token_hash
  on public.mcp_sessions(session_token_hash)
  where session_token_hash is not null;

create table if not exists public.mcp_tool_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mcp_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null,
  status text not null check (status in ('success', 'error')),
  tool_arguments_summary jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now()
);

alter table if exists public.mcp_tool_logs
  add column if not exists session_id uuid references public.mcp_sessions(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists tool_name text,
  add column if not exists status text,
  add column if not exists tool_arguments_summary jsonb default '{}'::jsonb,
  add column if not exists result_summary jsonb default '{}'::jsonb,
  add column if not exists error_message text,
  add column if not exists started_at timestamptz default now(),
  add column if not exists finished_at timestamptz default now();

create index if not exists idx_mcp_tool_logs_session_id on public.mcp_tool_logs(session_id);
create index if not exists idx_mcp_tool_logs_user_id on public.mcp_tool_logs(user_id);
create index if not exists idx_mcp_tool_logs_tool_name on public.mcp_tool_logs(tool_name);
create index if not exists idx_mcp_tool_logs_started_at on public.mcp_tool_logs(started_at desc);

create or replace function public.set_mcp_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mcp_sessions_set_updated_at on public.mcp_sessions;
create trigger mcp_sessions_set_updated_at
before update on public.mcp_sessions
for each row
execute function public.set_mcp_sessions_updated_at();

alter table public.mcp_sessions enable row level security;
alter table public.mcp_tool_logs enable row level security;

drop policy if exists "Users can view own MCP sessions" on public.mcp_sessions;
create policy "Users can view own MCP sessions"
on public.mcp_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own MCP sessions" on public.mcp_sessions;
create policy "Users can update own MCP sessions"
on public.mcp_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

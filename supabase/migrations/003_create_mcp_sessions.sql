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

create index if not exists idx_mcp_sessions_user_id on public.mcp_sessions(user_id);
create index if not exists idx_mcp_sessions_expires_at on public.mcp_sessions(expires_at);
create index if not exists idx_mcp_sessions_revoked_at on public.mcp_sessions(revoked_at);
create index if not exists idx_mcp_sessions_last_used_at on public.mcp_sessions(last_used_at desc);

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

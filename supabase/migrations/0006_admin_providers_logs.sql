-- ==============================================================
-- AcadBot Research — 0006: administração (providers e logs)
-- ==============================================================

-- ------------------------------------------------------------
-- provider_config (§43) — gestão dos providers académicos
-- ------------------------------------------------------------
create table if not exists public.provider_config (
  id text primary key check (id in ('crossref', 'semantic_scholar', 'openalex')),
  label text not null,
  enabled boolean not null default true,
  priority integer not null default 1,
  last_error text,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.provider_config enable row level security;

drop policy if exists provider_config_admin on public.provider_config;
create policy provider_config_admin on public.provider_config
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.provider_config (id, label, enabled, priority)
values
  ('crossref', 'Crossref', true, 1),
  ('openalex', 'OpenAlex', true, 2),
  ('semantic_scholar', 'Semantic Scholar', true, 3)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- system_logs (§41) — nunca contém senhas nem API keys
-- ------------------------------------------------------------
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('error', 'warn', 'info')),
  message text not null,
  context jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  endpoint text,
  provider text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists system_logs_created_idx on public.system_logs(created_at desc);
create index if not exists system_logs_level_idx on public.system_logs(level, created_at desc);

alter table public.system_logs enable row level security;

-- Apenas administradores podem ler logs; escrita é feita pelo backend (service_role).
drop policy if exists system_logs_admin_select on public.system_logs;
create policy system_logs_admin_select on public.system_logs
  for select using (public.is_admin());

-- ------------------------------------------------------------
-- Funções auxiliares para o painel administrativo (§42)
-- ------------------------------------------------------------
create or replace function public.acadbot_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'projects', (select count(*) from public.projects),
    'jobs', (select count(*) from public.research_jobs),
    'sources', (select count(*) from public.sources),
    'saved_sources', (select count(*) from public.saved_sources),
    'validations', (select count(*) from public.validation_jobs),
    'exports', (select count(*) from public.exports),
    'errors', (select count(*) from public.system_logs where level = 'error')
  );
$$;

revoke all on function public.acadbot_stats() from public;
grant execute on function public.acadbot_stats() to authenticated;

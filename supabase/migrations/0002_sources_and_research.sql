-- ==============================================================
-- AcadBot Research — 0002: fontes académicas, pesquisa assíncrona
-- ==============================================================

-- ------------------------------------------------------------
-- sources (§35) — tabela central, deduplicada por fingerprint
-- ------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  added_by uuid references auth.users(id) on delete set null,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  year integer,
  abstract text,
  journal text,
  publisher text,
  volume text,
  issue text,
  pages text,
  doi text,
  isbn text,
  url text,
  type text not null default 'other',
  citation_count integer,
  keywords text[] not null default '{}',
  language text,
  open_access boolean not null default false,
  providers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sources_doi_idx on public.sources(doi);
create index if not exists sources_year_idx on public.sources(year);
create index if not exists sources_title_idx on public.sources(lower(title));
create index if not exists sources_added_by_idx on public.sources(added_by);

alter table public.sources enable row level security;

-- Metadados bibliográficos são partilhados (evita duplicação global);
-- escrita apenas pelo backend (service_role) ou pelo próprio utilizador.
drop policy if exists sources_select_authenticated on public.sources;
create policy sources_select_authenticated on public.sources
  for select using (auth.role() = 'authenticated');

drop policy if exists sources_insert_own on public.sources;
create policy sources_insert_own on public.sources
  for insert with check (auth.uid() = added_by);

-- ------------------------------------------------------------
-- research_jobs (§33)
-- ------------------------------------------------------------
create table if not exists public.research_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  topic text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress jsonb not null default '{}'::jsonb,
  error text,
  results_count integer not null default 0,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists research_jobs_user_idx on public.research_jobs(user_id, created_at desc);
create index if not exists research_jobs_project_idx on public.research_jobs(project_id);
create index if not exists research_jobs_status_idx on public.research_jobs(status);

drop trigger if exists research_jobs_set_updated_at on public.research_jobs;
create trigger research_jobs_set_updated_at
  before update on public.research_jobs
  for each row execute function public.set_updated_at();

alter table public.research_jobs enable row level security;

drop policy if exists research_jobs_own on public.research_jobs;
create policy research_jobs_own on public.research_jobs
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- research_queries (§13)
-- ------------------------------------------------------------
create table if not exists public.research_queries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.research_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  language text,
  purpose text,
  created_at timestamptz not null default now(),
  unique (job_id, query)
);

create index if not exists research_queries_job_idx on public.research_queries(job_id);

alter table public.research_queries enable row level security;

drop policy if exists research_queries_own on public.research_queries;
create policy research_queries_own on public.research_queries
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- research_results
-- ------------------------------------------------------------
create table if not exists public.research_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.research_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  rank integer not null,
  relevance_score integer,
  relevance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, source_id)
);

create index if not exists research_results_job_idx on public.research_results(job_id, rank);
create index if not exists research_results_user_idx on public.research_results(user_id);

alter table public.research_results enable row level security;

drop policy if exists research_results_own on public.research_results;
create policy research_results_own on public.research_results
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ==============================================================
-- AcadBot Research — 0003: validação de referências (§21-25)
-- ==============================================================

create table if not exists public.validation_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  raw_reference text not null,
  status text not null default 'unconfirmed'
    check (status in ('confirmed', 'partially_confirmed', 'unconfirmed', 'inconsistent')),
  confidence integer not null default 0,
  parsed jsonb not null default '{}'::jsonb,
  problems jsonb not null default '[]'::jsonb,
  batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validation_jobs_user_idx on public.validation_jobs(user_id, created_at desc);
create index if not exists validation_jobs_status_idx on public.validation_jobs(status);
create index if not exists validation_jobs_batch_idx on public.validation_jobs(batch_id);

drop trigger if exists validation_jobs_set_updated_at on public.validation_jobs;
create trigger validation_jobs_set_updated_at
  before update on public.validation_jobs
  for each row execute function public.set_updated_at();

alter table public.validation_jobs enable row level security;

drop policy if exists validation_jobs_own on public.validation_jobs;
create policy validation_jobs_own on public.validation_jobs
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- validation_items (§24 — validação em massa)
-- ------------------------------------------------------------
create table if not exists public.validation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  raw_reference text not null,
  status text not null default 'unconfirmed'
    check (status in ('confirmed', 'partially_confirmed', 'unconfirmed', 'inconsistent')),
  confidence integer not null default 0,
  problems jsonb not null default '[]'::jsonb,
  validation_job_id uuid references public.validation_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, position)
);

create index if not exists validation_items_user_idx on public.validation_items(user_id, created_at desc);

alter table public.validation_items enable row level security;

drop policy if exists validation_items_own on public.validation_items;
create policy validation_items_own on public.validation_items
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- validation_matches (§23 — confiança por campo)
-- ------------------------------------------------------------
create table if not exists public.validation_matches (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.validation_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank integer not null,
  provider text,
  match_data jsonb not null default '{}'::jsonb,
  confidence integer not null default 0,
  field_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, rank)
);

create index if not exists validation_matches_job_idx on public.validation_matches(job_id, rank);

alter table public.validation_matches enable row level security;

drop policy if exists validation_matches_own on public.validation_matches;
create policy validation_matches_own on public.validation_matches
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

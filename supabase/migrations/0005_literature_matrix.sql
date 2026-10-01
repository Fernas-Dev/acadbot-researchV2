-- ==============================================================
-- AcadBot Research — 0005: matriz de literatura (§29)
-- ==============================================================

create table if not exists public.literature_matrices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists literature_matrices_user_idx on public.literature_matrices(user_id, updated_at desc);

drop trigger if exists literature_matrices_set_updated_at on public.literature_matrices;
create trigger literature_matrices_set_updated_at
  before update on public.literature_matrices
  for each row execute function public.set_updated_at();

alter table public.literature_matrices enable row level security;

drop policy if exists literature_matrices_own on public.literature_matrices;
create policy literature_matrices_own on public.literature_matrices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Campos sem informação na fonte ficam como "Não identificado na fonte" (§29)
create table if not exists public.literature_entries (
  id uuid primary key default gen_random_uuid(),
  matrix_id uuid not null references public.literature_matrices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  author text,
  year integer,
  title text,
  theme text,
  objective text,
  methodology text,
  sample text,
  variables text,
  results text,
  limitations text,
  ai_filled boolean not null default false,
  confidence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matrix_id, source_id)
);

create index if not exists literature_entries_matrix_idx on public.literature_entries(matrix_id);

drop trigger if exists literature_entries_set_updated_at on public.literature_entries;
create trigger literature_entries_set_updated_at
  before update on public.literature_entries
  for each row execute function public.set_updated_at();

alter table public.literature_entries enable row level security;

drop policy if exists literature_entries_own on public.literature_entries;
create policy literature_entries_own on public.literature_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

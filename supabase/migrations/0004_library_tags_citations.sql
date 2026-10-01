-- ==============================================================
-- AcadBot Research — 0004: biblioteca, tags e citações (§26-29)
-- ==============================================================

-- ------------------------------------------------------------
-- saved_sources (§26)
-- ------------------------------------------------------------
create table if not exists public.saved_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'unread' check (status in ('unread', 'reading', 'read', 'important')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_id)
);

create index if not exists saved_sources_user_idx on public.saved_sources(user_id, created_at desc);
create index if not exists saved_sources_project_idx on public.saved_sources(project_id);
create index if not exists saved_sources_status_idx on public.saved_sources(user_id, status);

drop trigger if exists saved_sources_set_updated_at on public.saved_sources;
create trigger saved_sources_set_updated_at
  before update on public.saved_sources
  for each row execute function public.set_updated_at();

alter table public.saved_sources enable row level security;

drop policy if exists saved_sources_own on public.saved_sources;
create policy saved_sources_own on public.saved_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- tags (§27)
-- ------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.tags enable row level security;

drop policy if exists tags_own on public.tags;
create policy tags_own on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- source_tags
-- ------------------------------------------------------------
create table if not exists public.source_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_source_id uuid not null references public.saved_sources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (saved_source_id, tag_id)
);

create index if not exists source_tags_saved_idx on public.source_tags(saved_source_id);

alter table public.source_tags enable row level security;

drop policy if exists source_tags_own on public.source_tags;
create policy source_tags_own on public.source_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- citations (§28)
-- ------------------------------------------------------------
create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  style text not null check (style in ('apa7', 'abnt', 'mla', 'chicago', 'harvard', 'vancouver')),
  full_text text not null,
  narrative text,
  parenthetical text,
  created_at timestamptz not null default now(),
  unique (user_id, source_id, style)
);

create index if not exists citations_user_idx on public.citations(user_id, created_at desc);

alter table public.citations enable row level security;

drop policy if exists citations_own on public.citations;
create policy citations_own on public.citations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

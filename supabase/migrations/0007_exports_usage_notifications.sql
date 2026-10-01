-- ==============================================================
-- AcadBot Research — 0007: exportações, uso, notificações e
-- configurações administrativas (§32, §39, §42)
-- ==============================================================

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('research', 'library', 'matrix', 'citations')),
  format text not null check (format in ('docx', 'pdf', 'csv', 'bibtex', 'ris')),
  file_name text not null,
  row_count integer not null default 0,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists exports_user_idx on public.exports(user_id, created_at desc);

alter table public.exports enable row level security;

drop policy if exists exports_own on public.exports;
create policy exports_own on public.exports
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- usage_records (§39) — quotas diárias e uso de APIs/IA
-- ------------------------------------------------------------
create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('research', 'validation', 'bulk_validation', 'ai', 'export')),
  amount integer not null default 1,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, kind, day)
);

create index if not exists usage_records_day_idx on public.usage_records(day desc);
create index if not exists usage_records_user_idx on public.usage_records(user_id, day desc);

alter table public.usage_records enable row level security;

drop policy if exists usage_records_own on public.usage_records;
create policy usage_records_own on public.usage_records
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- app_settings (§42)
-- ------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

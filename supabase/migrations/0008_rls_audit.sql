-- ==============================================================
-- AcadBot Research — 0008: RLS — verificação e reforço de políticas
-- Executar depois de todas as migrações de tabelas.
-- ==============================================================

-- Todas as tabelas privadas devem ter RLS ativa (§36).
do $$
declare
  t text;
  tabelas text[] := array[
    'profiles', 'projects', 'sources', 'research_jobs', 'research_queries',
    'research_results', 'validation_jobs', 'validation_items', 'validation_matches',
    'saved_sources', 'tags', 'source_tags', 'citations', 'literature_matrices',
    'literature_entries', 'exports', 'usage_records', 'notifications',
    'app_settings', 'provider_config', 'system_logs'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table if exists public.%I enable row level security', t);
    execute format('alter table if exists public.%I force row level security', t);
  end loop;
end $$;

-- Garantir que os utilizadores autenticados têm os privilégios mínimos.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- O service_role (backend) ignora RLS por design, mas mantém-se explícito.
grant all on all tables in schema public to service_role;

-- ------------------------------------------------------------
-- Verificação: lista de tabelas sem RLS (deve devolver 0 linhas)
-- ------------------------------------------------------------
create or replace view public.acadbot_rls_audit as
select c.relname as tabela,
       c.relrowsecurity as rls_ativa,
       c.relforcerowsecurity as rls_forcada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

comment on view public.acadbot_rls_audit is
  'Auditoria: confirma que todas as tabelas têm Row Level Security ativa (rls_ativa = true).';

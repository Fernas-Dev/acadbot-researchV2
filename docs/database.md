# Base de dados (Supabase / PostgreSQL)

As migrações vivem em `supabase/migrations/` e executam-se **por ordem
numérica** no SQL Editor do Supabase. Todas são idempotentes
(`create table if not exists`, `drop policy if exists`).

| Ficheiro | Conteúdo |
|---|---|
| `0001_profiles_and_projects.sql` | Funções (`is_admin`, `set_updated_at`, `handle_new_user` + trigger), `profiles`, `projects` |
| `0002_sources_and_research.sql` | `sources`, `research_jobs`, `research_queries`, `research_results` |
| `0003_validation.sql` | `validation_jobs`, `validation_items`, `validation_matches` |
| `0004_library_tags_citations.sql` | `saved_sources`, `tags`, `source_tags`, `citations` |
| `0005_literature_matrix.sql` | `literature_matrices`, `literature_entries` |
| `0006_admin_providers_logs.sql` | `provider_config` (com seed), `system_logs`, função `acadbot_stats()` |
| `0007_exports_usage_notifications.sql` | `exports`, `usage_records`, `notifications`, `app_settings` |
| `0008_rls_audit.sql` | Força RLS em todas as tabelas + vista `acadbot_rls_audit` |

## Convenções

- Chaves primárias `uuid` (`gen_random_uuid()`), timestamps `timestamptz`
  com `created_at` / `updated_at` (trigger `set_updated_at`).
- `user_id uuid references auth.users(id) on delete cascade` em todas as
  tabelas privadas.
- JSONB para estruturas flexíveis (`authors`, `providers`, `params`,
  `relevance`, `parsed`, `problems`, `metadata`).
- Arrays de texto para listas simples (`keywords`, `tags` resolvidas via
  `source_tags`).

## Relacionamentos principais

```
profiles ── projects ── research_jobs ──┬── research_queries
            │              │             └── research_results ── sources
            │              └── (project_id opcional em research/validation/matrix)
            ├── saved_sources ── sources
            ├── citations ── sources
            └── literature_matrices ── literature_entries ── sources

validation_jobs ── validation_matches
validation_jobs(batch) ── validation_items
```

## Row Level Security (§36)

- RLS **ativa e forçada** em todas as tabelas (`0008_rls_audit.sql` cria a
  vista `acadbot_rls_audit` — deve devolver `rls_ativa = true` para todas).
- Dono dos dados: `auth.uid() = user_id` em `select/insert/update/delete`.
- Admin lê tudo via `public.is_admin()` (`security definer`, sem recursão).
- `sources` é partilhada: leitura para autenticados, escrita apenas pelo
  backend (`service_role`) ou pelo próprio utilizador que adicionou.
- `provider_config`, `system_logs`, `app_settings`: só admin.
- O backend usa `service_role` (ignora RLS **por design**) mas filtra sempre
  por `user_id` em código — defesa em profundidade, não confiança no cliente.

## Perfis e primeiro admin

1. O trigger `on_auth_user_created` cria o `profiles` automaticamente com
   `name/institution/study_area` vindos de `raw_user_meta_data`.
2. Para promover o primeiro administrador (via SQL, com a chave service):
   `update public.profiles set role = 'admin' where email = '...'`.

-- ============================================================
-- SISTEMA 15º BBM — Tabela de DADOS dos módulos (nuvem)
-- Cole no Supabase → SQL Editor → Run.  (depois do schema.sql)
-- ============================================================

-- Uma tabela genérica guarda os registros de qualquer módulo/coleção.
create table if not exists public.app_dados (
  modulo     text not null,                 -- ex: 'bombeiro-mirim'
  colecao    text not null,                 -- ex: 'alunos', 'turmas', 'chamadas'
  item_id    text not null,                 -- id do registro (gerado pelo app)
  dados      jsonb not null default '{}'::jsonb,
  atualizado timestamptz default now(),
  primary key (modulo, colecao, item_id)
);

create index if not exists app_dados_idx on public.app_dados (modulo, colecao);

alter table public.app_dados enable row level security;

-- LER: quem tem visualização ou edição no módulo
drop policy if exists app_dados_select on public.app_dados;
create policy app_dados_select on public.app_dados for select
  using ( public.nivel_acesso(modulo) in ('visualizacao','edicao') );

-- ESCREVER (inserir/alterar/excluir): somente quem tem edição (admin já conta como edição)
drop policy if exists app_dados_write on public.app_dados;
create policy app_dados_write on public.app_dados for all
  using ( public.nivel_acesso(modulo) = 'edicao' )
  with check ( public.nivel_acesso(modulo) = 'edicao' );

-- ============================================================
-- Pronto. A partir daqui os módulos podem salvar na nuvem.
-- ============================================================

-- ============================================================
-- SISTEMA 15º BBM — Schema do banco (Fase 2: login e permissões)
-- Cole este conteúdo no Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabela de PERFIS (1 por usuário do Auth)
-- ------------------------------------------------------------
create table if not exists public.perfis (
  id             uuid primary key references auth.users(id) on delete cascade,
  login          text unique not null,
  nome           text not null,
  posto          text,
  categoria      text,                              -- 'Oficial' | 'Praça/BC'
  role           text not null default 'usuario',   -- 'admin' | 'usuario'
  permissoes     jsonb not null default '{}'::jsonb, -- {"viaturas":"edicao", ...}
  precisa_trocar boolean not null default true,     -- troca de senha no 1º acesso
  created_at     timestamptz default now()
);

alter table public.perfis enable row level security;

-- ------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER = executam com permissão elevada)
-- ------------------------------------------------------------

-- O usuário logado é admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists(select 1 from public.perfis where id = auth.uid() and role = 'admin');
$$;

-- Nível de acesso do usuário logado a um módulo: 'edicao' | 'visualizacao' | 'nenhum'
create or replace function public.nivel_acesso(p_mod text)
returns text language sql security definer stable
set search_path = public as $$
  select case
    when public.is_admin() then 'edicao'
    else coalesce((select permissoes->>p_mod from public.perfis where id = auth.uid()), 'nenhum')
  end;
$$;

-- O próprio usuário marca que já trocou a senha (sem poder mexer em role/permissões)
create or replace function public.marcar_senha_trocada()
returns void language sql security definer
set search_path = public as $$
  update public.perfis set precisa_trocar = false where id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Políticas RLS da tabela perfis
-- ------------------------------------------------------------
-- Ler: o próprio perfil, ou tudo se for admin
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select using (id = auth.uid() or public.is_admin());

-- Inserir/Atualizar/Excluir: somente admin
drop policy if exists perfis_admin_write on public.perfis;
create policy perfis_admin_write on public.perfis
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Pronto. Próximo passo: criar os usuários (script setup-usuarios.ps1).
-- As tabelas dos módulos (viaturas, mirins, etc.) serão criadas
-- nas próximas fases da migração.
-- ============================================================

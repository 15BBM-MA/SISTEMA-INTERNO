-- ============================================================
-- Lista os oficiais que podem ser Chefe de Socorro no checklist.
-- Cole no Supabase → SQL Editor → Run.
--
-- Por que existe: a política perfis_select só deixa cada um ler o
-- próprio perfil (ou tudo, se for admin). Um BC/Praça consultando
-- perfis direto recebe lista vazia e não consegue escolher o chefe.
-- security definer ignora o RLS e expõe apenas as 4 colunas
-- necessárias — nunca role, permissoes ou precisa_trocar.
-- ============================================================
create or replace function public.listar_oficiais()
returns table(id uuid, nome text, posto text, login text)
language sql security definer stable
set search_path = public as $$
  select id, nome, posto, login
  from public.perfis
  where categoria = 'Oficial'
    and posto is distinct from 'Maj BM'
  order by
    case when posto ilike 'Cap%'  then 1
         when posto ilike '%Ten%' then 2
         when posto ilike 'Asp%'  then 3
         else 4 end, nome;
$$;

grant execute on function public.listar_oficiais() to authenticated;

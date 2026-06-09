-- ============================================================
-- Lista o efetivo (cadastro central = Controle de Acessos / perfis)
-- para os demais módulos lerem (Escala, Estrutura) sem cadastro próprio.
-- Cole no Supabase → SQL Editor → Run.
-- ============================================================
create or replace function public.listar_militares()
returns table(nome text, posto text, categoria text, role text)
language sql security definer stable
set search_path = public as $$
  select nome, posto, categoria, role
  from public.perfis
  order by
    case when posto ilike 'Maj%' then 1
         when posto ilike 'Cap%' then 2
         when posto ilike '%Ten%' then 3
         when posto ilike 'Asp%' then 4
         when posto ilike '1%Sgt%' then 5
         when posto ilike '2%Sgt%' then 6
         when posto ilike '3%Sgt%' then 7
         else 8 end, nome;
$$;

grant execute on function public.listar_militares() to authenticated, anon;

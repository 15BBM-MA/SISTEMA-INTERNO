-- ============================================================
-- Notificações push — inscrições dos aparelhos (Web Push / PWA).
-- Cole no Supabase → SQL Editor → Run.
-- ============================================================
create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references public.perfis(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  atualizado  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Cada usuário gerencia só as próprias inscrições (a Edge Function usa a
-- service_role e ignora esta política para poder enviar a qualquer um).
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

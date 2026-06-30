-- Função para admin redefinir senha de qualquer usuário pelo painel
-- Executar UMA VEZ no SQL Editor do Supabase

create or replace function admin_reset_senha(target_id uuid, nova_senha text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Apenas admins podem chamar esta função
  if not exists (
    select 1 from perfis where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acesso negado: apenas administradores podem redefinir senhas.';
  end if;

  if length(nova_senha) < 4 then
    raise exception 'A nova senha deve ter pelo menos 4 caracteres.';
  end if;

  -- Atualiza a senha no auth.users usando bcrypt
  update auth.users
  set encrypted_password = crypt(nova_senha, gen_salt('bf')),
      updated_at = now()
  where id = target_id;

  -- Força redefinição no próximo login
  update perfis
  set precisa_trocar = true
  where id = target_id;
end;
$$;

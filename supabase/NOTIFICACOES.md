# Notificações push — passo a passo (você faz no Supabase, uma vez)

O app (cliente) já está pronto: service worker com push, inscrição por
aparelho e disparo nas pendências (checklist, devolução, permuta, livro).
Falta só a parte do envio, que roda no Supabase.

## 1. Gerar as chaves VAPID
No seu computador (precisa do Node):

```bash
npx web-push generate-vapid-keys
```

Guarde as duas chaves impressas: **Public Key** e **Private Key**.

## 2. Criar a tabela (SQL Editor → Run)
Rode o arquivo `supabase/07_push.sql`.

## 3. Subir a Edge Function
Com o Supabase CLI (na raiz do projeto):

```bash
supabase functions deploy enviar-push
```

(O código está em `supabase/functions/enviar-push/index.ts`.)

## 4. Definir os segredos da função
```bash
supabase secrets set VAPID_PUBLIC=<sua_public_key> \
                     VAPID_PRIVATE=<sua_private_key> \
                     VAPID_SUBJECT=mailto:15cicbma@gmail.com
```

## 5. Colocar a chave PÚBLICA no app
No arquivo `assets/js/main.js`, troque a linha:

```js
VAPID_PUBLIC: (window.BBM_VAPID_PUBLIC || ''),
```

por (cole a MESMA public key da etapa 1):

```js
VAPID_PUBLIC: (window.BBM_VAPID_PUBLIC || 'COLE_AQUI_A_PUBLIC_KEY'),
```

Depois faça o commit/push normalmente.

## Pronto
- No celular, cada pessoa abre o sistema, toca em **“Ativar neste aparelho”**
  (barra azul na home) e aceita a permissão.
- **iPhone:** é obrigatório primeiro **Adicionar à Tela de Início** (instalar o
  app); só assim o iOS entrega push. No Android funciona direto.
- A partir daí, quando surgir uma pendência para a pessoa (assinatura,
  devolução, permuta), ela recebe a notificação no celular mesmo com o app
  fechado.

## Como testar o envio manualmente
No SQL Editor não dá; use o console do navegador logado no sistema:

```js
await BBM.notificar({ login: 'SEU_LOGIN' }, { title:'Teste', body:'Funcionou!', url:'index.html' });
```

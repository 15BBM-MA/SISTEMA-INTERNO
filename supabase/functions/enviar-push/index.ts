// ============================================================
// Edge Function: enviar-push
// Envia uma notificação push para um destinatário (por login, id ou nome).
// Requer os segredos: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT.
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão.)
//
// Deploy:  supabase functions deploy enviar-push
// ============================================================
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Núcleo do nome (ignora posto/graduação) — casa mesmo após promoção.
const POSTOS = new Set(["aspirante","asp","tenente","ten","capitao","cap","major","maj","coronel","cel","tc","subtenente","subten","sub","sargento","sgt","cabo","cb","soldado","sd","bombeiro","civil","bc","bm","1","2","3","o","a"]);
function nucleo(nome: string): string {
  return (nome || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((t) => t && !POSTOS.has(t)).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });

  try {
    const { para, title, body, url, tag } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") || "mailto:15cicbma@gmail.com",
      Deno.env.get("VAPID_PUBLIC")!,
      Deno.env.get("VAPID_PRIVATE")!,
    );

    // resolve o(s) id(s) do destinatário
    let ids: string[] = [];
    if (para?.id) {
      ids = [para.id];
    } else if (para?.login) {
      const { data } = await admin.from("perfis").select("id").eq("login", para.login);
      ids = (data || []).map((r: { id: string }) => r.id);
    } else if (para?.nome) {
      const { data } = await admin.from("perfis").select("id,nome");
      const alvo = nucleo(para.nome);
      ids = (data || []).filter((r: { nome: string }) => nucleo(r.nome) === alvo).map((r: { id: string }) => r.id);
    }
    if (!ids.length) return json({ ok: true, enviados: 0, motivo: "destinatario nao encontrado" });

    const { data: subs } = await admin.from("push_subscriptions").select("*").in("user_id", ids);
    const payload = JSON.stringify({ title, body, url, tag });
    let enviados = 0;
    await Promise.all((subs || []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        enviados++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }));
    return json({ ok: true, enviados });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 400);
  }
});

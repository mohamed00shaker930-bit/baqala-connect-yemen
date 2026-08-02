import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: me, error: meErr } = await caller.rpc("my_permissions", {});
    if (meErr) return json({ error: "auth_failed" });
    if (!me || me.super !== true) return json({ error: "forbidden" });

    const { data: cu } = await caller.auth.getUser();
    const callerId = cu?.user?.id ?? null;

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").replace(/\D/g, "");
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const bundle = body.bundle ? String(body.bundle) : null;

    if (!/^\d{9,15}$/.test(phone)) return json({ error: "invalid_phone" });
    if (password.length < 6) return json({ error: "weak_password" });
    if (!name) return json({ error: "name_required" });

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

    if (bundle) {
      const { data: b } = await admin.from("permission_bundles").select("bundle").eq("bundle", bundle).maybeSingle();
      if (!b) return json({ error: "bundle_not_found" });
    }

    const email = `${phone}@baqalati.app`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name, phone },
    });
    if (cErr || !created?.user) {
      const m = (cErr?.message ?? "").toLowerCase();
      if (m.includes("already") || m.includes("registered") || m.includes("exist")) return json({ error: "phone_taken" });
      return json({ error: "create_failed", detail: cErr?.message ?? null });
    }
    const uid = created.user.id;

    const { error: pErr } = await admin.from("profiles").update({
      account_status: "active", name, approved_at: new Date().toISOString(), approved_by: callerId,
    }).eq("id", uid);
    if (pErr) return json({ error: "profile_failed", detail: pErr.message });

    const { error: rErr } = await admin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (rErr) return json({ error: "role_failed", detail: rErr.message });

    let warning: string | null = null;
    if (bundle) {
      const { data: items } = await admin.from("permission_bundle_items").select("permission").eq("bundle", bundle);
      const perms = (items ?? []).map((i: { permission: string }) => i.permission);
      if (perms.length) {
        const rows = perms.map((p) => ({ user_id: uid, permission: p, granted_by: callerId }));
        const { error: gErr } = await admin.from("admin_permissions").upsert(rows, { onConflict: "user_id,permission", ignoreDuplicates: true });
        if (gErr) warning = "bundle_partial";
      }
    }

    await admin.from("audit_logs").insert({
      user_id: callerId, action: "create_staff", table_name: "profiles",
      record_id: uid, record_label: name, new_data: { bundle },
    });

    return json({ ok: true, user_id: uid, warning });
  } catch (e) {
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});

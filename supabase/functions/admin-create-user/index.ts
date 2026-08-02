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
    const allowed = !!me && (me.super === true || (Array.isArray(me.perms) && me.perms.includes("users.create")));
    if (!allowed) return json({ error: "forbidden" });

    const { data: cu } = await caller.auth.getUser();
    const callerId = cu?.user?.id ?? null;

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").replace(/\D/g, "");
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const userType = body.user_type === "merchant" ? "merchant" : "customer";
    const city = body.city ? String(body.city).trim() : null;
    const district = body.district ? String(body.district).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const businessName = body.business_name ? String(body.business_name).trim() : null;

    if (!/^\d{9,15}$/.test(phone)) return json({ error: "invalid_phone" });
    if (password.length < 6) return json({ error: "weak_password" });
    if (!name) return json({ error: "name_required" });
    if (userType === "merchant" && !businessName) return json({ error: "business_required" });

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const email = `${phone}@baqalati.app`;

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, user_type: userType, city, district, address, business_name: businessName },
    });
    if (cErr || !created?.user) {
      const m = (cErr?.message ?? "").toLowerCase();
      if (m.includes("already") || m.includes("registered") || m.includes("exist")) return json({ error: "phone_taken" });
      return json({ error: "create_failed", detail: cErr?.message ?? null });
    }
    const uid = created.user.id;

    const { error: pErr } = await admin.from("profiles").update({
      account_status: "active",
      approved_at: new Date().toISOString(),
      approved_by: callerId,
    }).eq("id", uid);
    if (pErr) return json({ error: "profile_failed", detail: pErr.message });

    await admin.from("user_roles").upsert({ user_id: uid, role: userType }, { onConflict: "user_id,role", ignoreDuplicates: true });

    if (userType === "merchant") {
      const { data: st } = await admin.from("stores").select("id").eq("owner_id", uid).maybeSingle();
      if (!st) {
        const area = [city, district].filter(Boolean).join(" - ") || null;
        await admin.from("stores").insert({ owner_id: uid, name: businessName ?? name, phone, area, status: "active" });
      }
    }

    await admin.from("audit_logs").insert({
      user_id: callerId, action: "create_user", table_name: "profiles",
      record_id: uid, record_label: name, new_data: { user_type: userType, phone },
    });

    return json({ ok: true, user_id: uid });
  } catch (e) {
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});

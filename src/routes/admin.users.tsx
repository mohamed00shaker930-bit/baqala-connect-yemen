import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Record<string, string>>({});

  const load = async () => {
    const sb = supabase as any;
    let query = sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    if (q.trim().length >= 2) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    const [{ data: profiles }, { data: ad }, { data: ur }] = await Promise.all([
      query,
      sb.from("app_admins").select("user_id"),
      sb.from("user_roles").select("user_id, role"),
    ]);
    setRows(profiles || []);
    setAdmins(new Set((ad || []).map((a: any) => a.user_id)));
    const m: Record<string, string> = {};
    (ur || []).forEach((r: any) => { m[r.user_id] = r.role; });
    setRoles(m);
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (uid: string, isAd: boolean) => {
    const fn = isAd ? "admin_revoke_admin" : "admin_grant_admin";
    const { error } = await (supabase as any).rpc(fn, { _uid: uid });
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحديث");
    load();
  };

  return (
    <AdminShell title="المستخدمون">
      <div className="flex gap-2 mb-3">
        <Input placeholder="ابحث بالاسم أو الجوال" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={load}>بحث</Button>
      </div>
      <div className="space-y-2">
        {rows.map((u) => {
          const isAd = admins.has(u.id);
          const role = roles[u.id];
          return (
            <Card key={u.id} className="p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{u.name || "—"}</p>
                  {role && <Badge variant="outline">{role === "merchant" ? "تاجر" : "عميل"}</Badge>}
                  {isAd && <Badge className="bg-violet-100 text-violet-700">مشرف</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{u.phone}</p>
              </div>
              <Button size="sm" variant={isAd ? "outline" : "default"} onClick={() => toggleAdmin(u.id, isAd)}>
                {isAd ? "إزالة الإشراف" : "ترقية لمشرف"}
              </Button>
            </Card>
          );
        })}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">لا نتائج</p>}
      </div>
    </AdminShell>
  );
}

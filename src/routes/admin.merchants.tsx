import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/merchants")({
  component: Page,
});

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("stores").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).rpc("admin_set_store_status", { _store: id, _status: status });
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحديث");
    load();
  };

  const setCommission = async (id: string, current: number | null) => {
    const raw = prompt("نسبة العمولة لهذا المتجر (٪) - اتركه فارغاً لاستخدام الافتراضية", String(current ?? ""));
    if (raw === null) return;
    const pct = raw.trim() === "" ? null : Number(raw);
    if (raw.trim() !== "" && (Number.isNaN(pct) || (pct as number) < 0 || (pct as number) > 100)) { toast.error("نسبة غير صحيحة"); return; }
    const { error } = await (supabase as any).rpc("admin_set_store_commission", { _store: id, _pct: pct });
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث العمولة");
    load();
  };

  return (
    <AdminShell title="إدارة المتاجر">
      <div className="flex gap-2 mb-3 flex-wrap">
        {["pending", "active", "suspended", "rejected", "all"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "pending" ? "بانتظار" : s === "active" ? "مفعّلة" : s === "suspended" ? "معلّقة" : s === "rejected" ? "مرفوضة" : "الكل"}
          </Button>
        ))}
      </div>
      {loading ? <p className="text-center text-muted-foreground py-8">جاري التحميل...</p> :
        rows.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد متاجر</p> :
        <div className="space-y-2">
          {rows.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{s.name}</h3>
                    <Badge className={statusColor[s.status]}>{s.status}</Badge>
                    {s.commission_pct != null && <Badge variant="outline">عمولة {s.commission_pct}%</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.area || "—"} • {s.phone || "بدون رقم"}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {s.status !== "active" && <Button size="sm" onClick={() => setStatus(s.id, "active")}>اعتماد</Button>}
                {s.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "suspended")}>تعليق</Button>}
                {s.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => setStatus(s.id, "rejected")}>رفض</Button>}
                <Button size="sm" variant="secondary" onClick={() => setCommission(s.id, s.commission_pct)}>تعديل العمولة</Button>
              </div>
            </Card>
          ))}
        </div>
      }
    </AdminShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/dateFormat";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallets")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");

  const load = async () => {
    let q = (supabase as any).from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []);
  };
  useEffect(() => { load(); }, [filter]);

  const respond = async (id: string, approve: boolean) => {
    const { error } = await (supabase as any).rpc("admin_respond_wallet_tx", { _tx: id, _approve: approve });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "تمت الموافقة" : "تم الرفض");
    load();
  };

  return (
    <AdminShell title="المحافظ">
      <div className="flex gap-2 mb-3 flex-wrap">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "pending" ? "بانتظار" : s === "approved" ? "موافق عليها" : s === "rejected" ? "مرفوضة" : "الكل"}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((t) => (
          <Card key={t.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">{Number(t.amount).toLocaleString()} ر.ي</p>
                <p className="text-xs text-muted-foreground">{t.type} • {t.method || "—"}</p>
                {t.note && <p className="text-xs">{t.note}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("ar")}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline">{t.status}</Badge>
                {t.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => respond(t.id, true)}>موافقة</Button>
                    <Button size="sm" variant="destructive" onClick={() => respond(t.id, false)}>رفض</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد عمليات</p>}
      </div>
    </AdminShell>
  );
}

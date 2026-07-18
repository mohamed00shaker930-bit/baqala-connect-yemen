import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/dateFormat";

export const Route = createFileRoute("/admin/orders")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  useEffect(() => {
    (async () => {
      let q = (supabase as any).from("orders").select("*, stores(name)").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      setRows(data || []);
    })();
  }, [filter]);
  return (
    <AdminShell title="كل الطلبات">
      <div className="flex gap-2 mb-3 flex-wrap">
        {["all", "sent", "accepted", "delivered", "cancelled"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "all" ? "الكل" : s === "sent" ? "جديدة" : s === "accepted" ? "مقبولة" : s === "delivered" ? "مكتملة" : "ملغية"}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((o) => (
          <Card key={o.id} className="p-3">
            <div className="flex items-center gap-2 justify-between">
              <div>
                <p className="font-medium text-sm">{o.stores?.name || "متجر"}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
              </div>
              <div className="text-left">
                <p className="font-bold">{Number(o.total).toLocaleString()} ر.ي</p>
                <p className="text-[10px] text-muted-foreground">عمولة {Number(o.commission_amount || 0).toLocaleString()} ({o.commission_pct || 0}%)</p>
              </div>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              <Badge variant="outline">{o.status}</Badge>
              <Badge variant="outline">{o.channel === "online" ? "أونلاين" : "محل"}</Badge>
              <Badge variant="outline">{o.payment_method}</Badge>
              {o.return_status !== "none" && <Badge className="bg-red-100 text-red-700">إرجاع: {o.return_status}</Badge>}
            </div>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">لا طلبات</p>}
      </div>
    </AdminShell>
  );
}

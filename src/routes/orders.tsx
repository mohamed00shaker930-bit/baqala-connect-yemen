import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { fmtRial, fmtDate, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/orders")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, stores(name), order_items(*)").order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  return (
    <CustomerShell title="طلباتي">
      <div className="space-y-3">
        {orders?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد.</Card>}
        {orders?.map((o: any) => {
          const stepIdx = STATUS_ORDER.indexOf(o.status as any);
          return (
            <Card key={o.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{o.stores?.name}</h3>
                  <p className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</p>
                </div>
                <Badge variant={o.status === "delivered" ? "default" : o.status === "declined" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              {stepIdx >= 0 && (
                <div className="flex gap-1">
                  {STATUS_ORDER.map((s, i) => (
                    <div key={s} className={`flex-1 h-1.5 rounded ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              )}
              <div className="text-xs space-y-1 text-muted-foreground">
                {o.order_items?.map((it: any) => <div key={it.id}>{it.name} × {it.qty}</div>)}
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm">{o.payment_method === "cash" ? "نقداً" : `أجل (${o.credit_status || "—"})`}</span>
                <span className="font-bold text-primary">{fmtRial(o.total)}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </CustomerShell>
  );
}

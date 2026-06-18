import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtRial, fmtDate, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/merchant/orders")({
  ssr: false,
  component: MerchantOrders,
});

const NEXT: Record<string, string> = {
  sent: "accepted", accepted: "preparing", preparing: "out_for_delivery", out_for_delivery: "delivered",
};

function MerchantOrders() {
  const qc = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["store-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, order_items(*), profiles!orders_customer_id_fkey(name,phone)").order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const updateStatus = async (id: string, status: string, extra: any = {}) => {
    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString(), ...extra }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم التحديث"); qc.invalidateQueries(); }
  };

  const approveCredit = async (o: any) => {
    // Create/update credit account + charge transaction
    let { data: acc } = await supabase.from("credit_accounts").select("id").eq("customer_id", o.customer_id).eq("store_id", o.store_id).maybeSingle();
    if (!acc) {
      const { data: created, error } = await supabase.from("credit_accounts").insert({ customer_id: o.customer_id, store_id: o.store_id, balance: 0 }).select().single();
      if (error) return toast.error(error.message);
      acc = created;
    }
    await supabase.from("credit_transactions").insert({ account_id: acc!.id, type: "charge", amount: o.total, order_id: o.id, note: "طلب بالأجل" });
    await updateStatus(o.id, "accepted", { credit_status: "approved" });
  };

  return (
    <MerchantShell title="الطلبات الواردة">
      <div className="space-y-3">
        {orders?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات.</Card>}
        {orders?.map((o: any) => {
          const stepIdx = STATUS_ORDER.indexOf(o.status as any);
          const nextStatus = NEXT[o.status];
          const isNewCredit = o.status === "sent" && o.payment_method === "credit" && o.credit_status === "pending";
          return (
            <Card key={o.id} className="p-4 space-y-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{o.profiles?.name || "عميل"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{o.profiles?.phone}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</p>
                </div>
                <Badge variant={o.status === "delivered" ? "default" : o.status === "declined" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              {stepIdx >= 0 && (
                <div className="flex gap-1">
                  {STATUS_ORDER.map((s, i) => <div key={s} className={`flex-1 h-1.5 rounded ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />)}
                </div>
              )}
              <div className="text-sm space-y-1 bg-muted/30 rounded p-2">
                {o.order_items?.map((it: any) => <div key={it.id} className="flex justify-between"><span>{it.name} × {it.qty}</span><span>{fmtRial(Number(it.price) * it.qty)}</span></div>)}
              </div>
              <div className="text-xs text-muted-foreground">
                📍 {o.location_landmark} {o.location_phone && <span dir="ltr"> · {o.location_phone}</span>}
                {o.note && <div className="mt-1">📝 {o.note}</div>}
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <div className="text-sm">{o.payment_method === "cash" ? "💵 نقداً" : `📒 أجل (${o.credit_status})`}</div>
                <span className="font-bold text-primary">{fmtRial(o.total)}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isNewCredit ? (
                  <>
                    <Button size="sm" onClick={() => approveCredit(o)} className="flex-1">قبول الأجل</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(o.id, "declined", { credit_status: "declined" })}>رفض</Button>
                  </>
                ) : o.status === "sent" ? (
                  <>
                    <Button size="sm" onClick={() => updateStatus(o.id, "accepted")} className="flex-1">قبول</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(o.id, "declined")}>رفض</Button>
                  </>
                ) : nextStatus ? (
                  <Button size="sm" onClick={() => updateStatus(o.id, nextStatus)} className="flex-1">
                    التالي: {STATUS_LABEL[nextStatus]}
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </MerchantShell>
  );
}

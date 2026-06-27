import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtRial, fmtDate, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Star, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: OrdersPage,
});

function OrdersPage() {
  const qc = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, stores(name), order_items(*)").order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 15000,
  });
  const { data: customReqs } = useQuery({
    queryKey: ["my-custom-requests"],
    queryFn: async () => (await supabase.from("custom_product_requests").select("*, stores(name)").order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 15000,
  });
  const { data: myRatings } = useQuery({
    queryKey: ["my-ratings"],
    queryFn: async () => (await supabase.from("ratings").select("order_id")).data ?? [],
  });

  const [rateFor, setRateFor] = useState<any>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const ratedOrders = new Set((myRatings ?? []).map((r: any) => r.order_id));

  const submitRating = async () => {
    if (!rateFor) return;
    const { error } = await supabase.from("ratings").insert({
      customer_id: rateFor.customer_id,
      store_id: rateFor.store_id,
      order_id: rateFor.id,
      stars, comment: comment || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("تم التقييم"); setRateFor(null); setStars(5); setComment(""); qc.invalidateQueries(); }
  };

  const respondRequest = async (id: string, accept: boolean) => {
    const { error } = await supabase.from("custom_product_requests")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(accept ? "تم القبول — سيتواصل التاجر" : "تم الرفض"); qc.invalidateQueries(); }
  };

  const pendingQuotes = (customReqs ?? []).filter((r: any) => r.status === "quoted");

  return (
    <CustomerShell title="طلباتي">
      {pendingQuotes.length > 0 && (
        <Card className="p-4 mb-4 border-primary border-2">
          <p className="font-bold mb-2">عروض أسعار بانتظار ردك</p>
          <div className="space-y-3">
            {pendingQuotes.map((r: any) => (
              <div key={r.id} className="border-t pt-2 space-y-2">
                <div>
                  <p className="font-medium text-sm">{r.name} ({r.stores?.name})</p>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <div className="flex justify-between text-sm">
                  <span>الكمية: {r.qty}</span>
                  <span className="font-bold text-primary">{fmtRial(r.merchant_price)} للوحدة</span>
                </div>
                {r.merchant_note && <p className="text-xs text-muted-foreground">📝 {r.merchant_note}</p>}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => respondRequest(r.id, true)}>قبول</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => respondRequest(r.id, false)}>رفض</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {orders?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد.</Card>}
        {orders?.map((o: any) => {
          const stepIdx = STATUS_ORDER.indexOf(o.status as any);
          const canRate = o.status === "delivered" && !ratedOrders.has(o.id);
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
              {canRate && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => { setRateFor(o); setStars(5); setComment(""); }}>
                  <Star className="w-4 h-4 ml-1" /> قيّم التاجر
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!rateFor} onOpenChange={(v) => !v && setRateFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تقييم التاجر</DialogTitle></DialogHeader>
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setStars(n)}>
                <Star className={`w-8 h-8 ${n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea rows={3} placeholder="ملاحظة (اختياري)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button onClick={submitRating}>إرسال</Button>
        </DialogContent>
      </Dialog>
    </CustomerShell>
  );
}

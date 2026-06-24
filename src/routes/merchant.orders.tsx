import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtRial, fmtDate, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
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
      const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 10000,
  });
  const { data: customRequests } = useQuery({
    queryKey: ["store-custom-requests"],
    queryFn: async () => (await supabase.from("custom_product_requests").select("*").order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 10000,
  });
  const { data: existingRatings } = useQuery({
    queryKey: ["my-customer-ratings"],
    queryFn: async () => (await supabase.from("customer_ratings").select("order_id")).data ?? [],
  });

  // Fetch customer names for each order
  const [customers, setCustomers] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  useEffect(() => {
    (async () => {
      if (!orders) return;
      const missing = orders.filter((o: any) => !customers[o.id]);
      for (const o of missing.slice(0, 30)) {
        const { data } = await supabase.rpc("get_order_customer", { _order_id: o.id });
        const row = data?.[0];
        if (row) setCustomers((p) => ({ ...p, [o.id]: row }));
      }
    })();
  }, [orders]);

  const updateStatus = async (id: string, status: string, extra: any = {}) => {
    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString(), ...extra }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم التحديث"); qc.invalidateQueries(); }
  };

  const approveCredit = async (o: any) => {
    let { data: acc } = await supabase.from("credit_accounts").select("id").eq("customer_id", o.customer_id).eq("store_id", o.store_id).maybeSingle();
    if (!acc) {
      const { data: created, error } = await supabase.from("credit_accounts").insert({ customer_id: o.customer_id, store_id: o.store_id, balance: 0 }).select().single();
      if (error) return toast.error(error.message);
      acc = created;
    }
    await supabase.from("credit_transactions").insert({ account_id: acc!.id, type: "charge", amount: o.total, order_id: o.id, note: "طلب بالأجل", status: "approved" });
    await updateStatus(o.id, "accepted", { credit_status: "approved" });
  };

  const [rateFor, setRateFor] = useState<any>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const submitRating = async () => {
    if (!rateFor) return;
    const { error } = await supabase.from("customer_ratings").insert({
      customer_id: rateFor.customer_id,
      store_id: rateFor.store_id,
      order_id: rateFor.id,
      stars, comment: comment || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("تم تقييم العميل"); setRateFor(null); setStars(5); setComment(""); qc.invalidateQueries(); }
  };

  const [quoteFor, setQuoteFor] = useState<any>(null);
  const [quoteForm, setQuoteForm] = useState({ price: "", note: "" });
  const sendQuote = async () => {
    if (!quoteFor) return;
    if (!quoteForm.price) { toast.error("اكتب السعر"); return; }
    const { error } = await supabase.from("custom_product_requests").update({
      merchant_price: Number(quoteForm.price),
      merchant_note: quoteForm.note || null,
      status: "quoted",
    }).eq("id", quoteFor.id);
    if (error) toast.error(error.message);
    else { toast.success("أُرسل السعر للعميل"); setQuoteFor(null); setQuoteForm({ price: "", note: "" }); qc.invalidateQueries(); }
  };

  const ratedOrders = new Set((existingRatings ?? []).map((r) => r.order_id));

  return (
    <MerchantShell title="الطلبات الواردة">
      <Tabs defaultValue="orders">
        <TabsList className="grid grid-cols-2 mb-3">
          <TabsTrigger value="orders">الطلبات ({orders?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="custom">طلبات خاصة ({customRequests?.filter((r) => r.status === "pending").length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {orders?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات.</Card>}
          {orders?.map((o: any) => {
            const stepIdx = STATUS_ORDER.indexOf(o.status as any);
            const nextStatus = NEXT[o.status];
            const isNewCredit = o.status === "sent" && o.payment_method === "credit" && o.credit_status === "pending";
            const c = customers[o.id];
            const canRate = o.status === "delivered" && !ratedOrders.has(o.id);
            return (
              <Card key={o.id} className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">طلب #{o.id.slice(0, 6)}</p>
                    <p className="text-sm">{c?.name || "عميل"}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{c?.phone || o.location_phone || "—"}</p>
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
                  📍 {o.location_landmark}
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
                  {canRate && (
                    <Button size="sm" variant="outline" onClick={() => { setRateFor(o); setStars(5); setComment(""); }}>
                      <Star className="w-4 h-4 ml-1" /> قيّم العميل
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="custom" className="space-y-3">
          {customRequests?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا طلبات خاصة.</Card>}
          {customRequests?.map((r: any) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex justify-between">
                <div className="flex-1">
                  <p className="font-bold">{r.name}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  <p className="text-xs text-muted-foreground">الكمية: {r.qty} · {fmtDate(r.created_at)}</p>
                </div>
                <Badge variant={r.status === "pending" ? "secondary" : r.status === "accepted" || r.status === "converted" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
                  {r.status === "pending" ? "جديد" : r.status === "quoted" ? "تم التسعير" : r.status === "accepted" ? "مقبول" : r.status === "rejected" ? "مرفوض" : "محوّل"}
                </Badge>
              </div>
              {r.image_url && <img src={r.image_url} className="w-24 h-24 object-cover rounded border" />}
              {r.merchant_price && <p className="text-sm">سعرك: <span className="font-bold text-primary">{fmtRial(r.merchant_price)}</span></p>}
              {r.merchant_note && <p className="text-xs text-muted-foreground">ملاحظتك: {r.merchant_note}</p>}
              {r.status === "pending" && (
                <Button size="sm" onClick={() => { setQuoteFor(r); setQuoteForm({ price: "", note: "" }); }}>أرسل سعر</Button>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rateFor} onOpenChange={(v) => !v && setRateFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تقييم العميل</DialogTitle></DialogHeader>
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

      <Dialog open={!!quoteFor} onOpenChange={(v) => !v && setQuoteFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>إرسال سعر: {quoteFor?.name}</DialogTitle></DialogHeader>
          <div><Label>السعر للوحدة (ر.ي)</Label><Input dir="ltr" inputMode="numeric" value={quoteForm.price} onChange={(e) => setQuoteForm({...quoteForm, price: e.target.value})} /></div>
          <div><Label>ملاحظة (اختياري)</Label><Textarea rows={2} value={quoteForm.note} onChange={(e) => setQuoteForm({...quoteForm, note: e.target.value})} /></div>
          <Button onClick={sendQuote}>إرسال</Button>
        </DialogContent>
      </Dialog>
    </MerchantShell>
  );
}

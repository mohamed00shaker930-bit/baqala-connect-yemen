import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cart, useCart } from "@/lib/cart";
import { fmtRial } from "@/lib/format";
import { Trash2, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: CartPage,
});

function CartPage() {
  const c = useCart();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<"cash" | "credit">("cash");
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const total = c.items.reduce((s, i) => s + i.price * i.qty, 0);

  if (c.items.length === 0) {
    return (
      <CustomerShell title="السلة">
        <Card className="p-10 text-center text-muted-foreground">
          <p>سلتك فارغة</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/home" })}>تصفح البقالات</Button>
        </Card>
      </CustomerShell>
    );
  }

  const checkout = async () => {
    if (!landmark.trim()) { toast.error("اكتب وصف موقع التوصيل"); return; }
    if (!c.storeId) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("غير مسجل");
      const { data: order, error } = await supabase.from("orders").insert({
        customer_id: u.user.id,
        store_id: c.storeId,
        total,
        payment_method: payment,
        credit_status: payment === "credit" ? "pending" : null,
        status: "sent",
        note: note || null,
        location_landmark: landmark,
        location_phone: phone || null,
      }).select().single();
      if (error) throw error;
      const items = c.items.map((i) => ({
        order_id: order.id, product_id: i.productId, name: i.name, price: i.price, qty: i.qty, note: i.note || null,
      }));
      const { error: ie } = await supabase.from("order_items").insert(items);
      if (ie) throw ie;
      cart.clear();
      toast.success("تم إرسال الطلب");
      navigate({ to: "/orders" });
    } catch (e: any) { toast.error(e?.message || "فشل إرسال الطلب"); }
    finally { setLoading(false); }
  };

  return (
    <CustomerShell title={`سلة ${c.storeName || ""}`}>
      <div className="space-y-3">
        {c.items.map((i) => (
          <Card key={i.productId} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{i.name}</p>
              <p className="text-xs text-muted-foreground">{fmtRial(i.price)}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => cart.setQty(i.productId, i.qty - 1)}><Minus className="w-3 h-3" /></Button>
              <span className="w-6 text-center font-bold">{i.qty}</span>
              <Button size="sm" className="h-7 w-7 p-0" onClick={() => cart.setQty(i.productId, i.qty + 1)}><Plus className="w-3 h-3" /></Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => cart.remove(i.productId)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Card>
        ))}

        <Card className="p-4 space-y-3">
          <h3 className="font-bold">موقع التوصيل</h3>
          <div className="space-y-2">
            <Label>وصف الموقع / معلم قريب *</Label>
            <Textarea value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="مثال: بجانب الجامع الأزرق، البيت الثاني..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>رقم للتواصل</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="7XXXXXXXX" />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-bold">طريقة الدفع</h3>
          <RadioGroup value={payment} onValueChange={(v) => setPayment(v as any)}>
            <div className="flex items-center gap-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">نقداً عند الاستلام</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="credit" id="credit" /><Label htmlFor="credit">بالأجل (يحتاج موافقة البقالة) — بدون فوائد</Label></div>
          </RadioGroup>
        </Card>

        <Card className="p-4 space-y-2">
          <Label>ملاحظة للبقال (اختياري)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Card>

        <Card className="p-4 sticky bottom-20 bg-card shadow-lg">
          <div className="flex justify-between mb-3">
            <span className="font-bold">الإجمالي</span>
            <span className="font-bold text-primary text-lg">{fmtRial(total)}</span>
          </div>
          <Button onClick={checkout} disabled={loading} className="w-full h-12 text-base">
            {loading ? "..." : "تأكيد الطلب"}
          </Button>
        </Card>
      </div>
    </CustomerShell>
  );
}

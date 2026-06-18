import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Store as StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setUserRole, getUserRole } from "@/lib/auth-helpers";

export const Route = createFileRoute("/choose-role")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const role = await getUserRole(data.session.user.id);
    if (role === "merchant") throw redirect({ to: "/merchant" });
    if (role === "customer") throw redirect({ to: "/home" });
  },
  component: ChooseRolePage,
});

function ChooseRolePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"customer" | "merchant" | null>(null);
  const [storeName, setStoreName] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmCustomer = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setLoading(true);
    try {
      await setUserRole(data.user.id, "customer");
      toast.success("مرحباً بك!");
      navigate({ to: "/home" });
    } catch (e: any) { toast.error(e?.message || "فشلت العملية"); }
    finally { setLoading(false); }
  };

  const confirmMerchant = async () => {
    if (!storeName.trim()) { toast.error("اسم المتجر مطلوب"); return; }
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setLoading(true);
    try {
      await setUserRole(data.user.id, "merchant");
      const { error } = await supabase.from("stores").insert({
        owner_id: data.user.id,
        name: storeName.trim(),
        area: area.trim() || null,
        delivery_info: landmark.trim() || null,
        is_open: true,
      });
      if (error) throw error;
      toast.success("تم إنشاء متجرك");
      navigate({ to: "/merchant" });
    } catch (e: any) { toast.error(e?.message || "فشلت العملية"); }
    finally { setLoading(false); }
  };

  if (!selected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-accent/30 to-background">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">من أنت؟</h1>
            <p className="text-sm text-muted-foreground mt-1">اختر نوع حسابك للمتابعة</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={() => setSelected("customer")} className="text-right">
              <Card className="p-6 hover:border-primary hover:shadow-md transition cursor-pointer h-full">
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <User className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold mb-1">عميل</h2>
                <p className="text-sm text-muted-foreground">أبحث عن بقالة قريبة لأطلب منها وتصلني للبيت.</p>
              </Card>
            </button>
            <button onClick={() => setSelected("merchant")} className="text-right">
              <Card className="p-6 hover:border-primary hover:shadow-md transition cursor-pointer h-full">
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <StoreIcon className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold mb-1">تاجر / صاحب بقالة</h2>
                <p className="text-sm text-muted-foreground">أعرض منتجاتي واستقبل الطلبات وأدير دفتر الأجل.</p>
              </Card>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selected === "customer") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-6 space-y-4">
          <h2 className="text-lg font-bold">حساب عميل</h2>
          <p className="text-sm text-muted-foreground">سنوجّهك للصفحة الرئيسية حيث ترى البقالات القريبة.</p>
          <div className="flex gap-2">
            <Button onClick={confirmCustomer} disabled={loading} className="flex-1 h-12">متابعة</Button>
            <Button variant="outline" onClick={() => setSelected(null)} className="h-12">رجوع</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold">بيانات المتجر</h2>
        <div className="space-y-2">
          <Label>اسم المتجر *</Label>
          <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="مثال: بقالة الإخوة" />
        </div>
        <div className="space-y-2">
          <Label>الحي / المنطقة</Label>
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="مثال: حي السبعين، صنعاء" />
        </div>
        <div className="space-y-2">
          <Label>وصف الموقع / معلومات التوصيل</Label>
          <Textarea value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="بجوار جامع، رسوم التوصيل..." rows={3} />
        </div>
        <div className="flex gap-2">
          <Button onClick={confirmMerchant} disabled={loading} className="flex-1 h-12">إنشاء المتجر</Button>
          <Button variant="outline" onClick={() => setSelected(null)} className="h-12">رجوع</Button>
        </div>
      </Card>
    </div>
  );
}

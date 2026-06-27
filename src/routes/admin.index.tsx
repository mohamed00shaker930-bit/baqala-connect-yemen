import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Store, ShoppingBag, Wallet, Clock, Undo2, BadgeDollarSign, Bell } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </Card>
  );
}

function Overview() {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const sb = supabase as any;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [users, merchants, stores, pendingStores, ordersToday, walletsPending, returnsPending, commToday] = await Promise.all([
        sb.from("profiles").select("*", { count: "exact", head: true }),
        sb.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "merchant"),
        sb.from("stores").select("*", { count: "exact", head: true }).eq("status", "active"),
        sb.from("stores").select("*", { count: "exact", head: true }).eq("status", "pending"),
        sb.from("orders").select("total, commission_amount", { count: "exact" }).gte("created_at", today.toISOString()),
        sb.from("wallet_transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        sb.from("orders").select("*", { count: "exact", head: true }).eq("return_status", "requested"),
        sb.from("orders").select("commission_amount").gte("created_at", today.toISOString()),
      ]);
      const salesToday = (ordersToday.data || []).reduce((a: number, x: any) => a + Number(x.total || 0), 0);
      const commissionToday = (commToday.data || []).reduce((a: number, x: any) => a + Number(x.commission_amount || 0), 0);
      setS({
        users: users.count ?? 0,
        merchants: merchants.count ?? 0,
        stores: stores.count ?? 0,
        pendingStores: pendingStores.count ?? 0,
        ordersToday: ordersToday.count ?? 0,
        walletsPending: walletsPending.count ?? 0,
        returnsPending: returnsPending.count ?? 0,
        salesToday,
        commissionToday,
      });
    })();
  }, []);
  if (!s) return <AdminShell title="نظرة عامة"><div className="text-center p-8 text-muted-foreground">جاري التحميل...</div></AdminShell>;
  return (
    <AdminShell title="نظرة عامة">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="المستخدمون" value={s.users} color="bg-blue-100 text-blue-700" />
        <Stat icon={Store} label="متاجر مفعّلة" value={s.stores} color="bg-emerald-100 text-emerald-700" />
        <Stat icon={Clock} label="متاجر بانتظار الموافقة" value={s.pendingStores} color="bg-amber-100 text-amber-700" />
        <Stat icon={ShoppingBag} label="طلبات اليوم" value={s.ordersToday} color="bg-violet-100 text-violet-700" />
        <Stat icon={BadgeDollarSign} label="مبيعات اليوم" value={s.salesToday.toLocaleString() + " ر.ي"} color="bg-teal-100 text-teal-700" />
        <Stat icon={BadgeDollarSign} label="عمولات اليوم" value={s.commissionToday.toLocaleString() + " ر.ي"} color="bg-orange-100 text-orange-700" />
        <Stat icon={Wallet} label="شحن محافظ معلّق" value={s.walletsPending} color="bg-pink-100 text-pink-700" />
        <Stat icon={Undo2} label="مرتجعات معلّقة" value={s.returnsPending} color="bg-red-100 text-red-700" />
      </div>
      <Card className="p-4 mt-4">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Bell className="w-4 h-4" /> الإجراءات السريعة متاحة من شريط التنقّل بالأسفل: اعتماد المتاجر، شحن المحافظ، إرسال إشعارات، تعديل الإعدادات.
        </p>
      </Card>
    </AdminShell>
  );
}

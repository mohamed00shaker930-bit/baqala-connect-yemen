import { fetchMyStore } from "@/lib/my-store";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { fmtRial } from "@/lib/format";
import { ShoppingBag, Clock, Wallet, Star } from "lucide-react";

export const Route = createFileRoute("/merchant/")({
  ssr: false,
  component: MerchantDashboard,
});

function MerchantDashboard() {
  const { data: store } = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
  });
  const { data: stats } = useQuery({
    queryKey: ["merchant-stats", store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const [orders, credit] = await Promise.all([
        supabase.from("orders").select("status,total,created_at").eq("store_id", store!.id),
        supabase.from("credit_accounts").select("balance").eq("store_id", store!.id),
      ]);
      const today = new Date(); today.setHours(0,0,0,0);
      const todays = (orders.data ?? []).filter((o) => new Date(o.created_at) >= today);
      return {
        newCount: (orders.data ?? []).filter((o) => o.status === "sent").length,
        todayCount: todays.length,
        todayRevenue: todays.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0),
        totalDebt: (credit.data ?? []).reduce((s, c) => s + Number(c.balance), 0),
      };
    },
  });

  return (
    <MerchantShell title={store?.name || "متجري"}>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <ShoppingBag className="w-6 h-6 text-primary mb-2" />
          <p className="text-2xl font-bold">{stats?.newCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">طلبات جديدة</p>
        </Card>
        <Card className="p-4">
          <Clock className="w-6 h-6 text-warning mb-2" />
          <p className="text-2xl font-bold">{stats?.todayCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">طلبات اليوم</p>
        </Card>
        <Card className="p-4">
          <Wallet className="w-6 h-6 text-success mb-2" />
          <p className="text-lg font-bold">{fmtRial(stats?.todayRevenue ?? 0)}</p>
          <p className="text-xs text-muted-foreground">إيرادات اليوم</p>
        </Card>
        <Card className="p-4">
          <Star className="w-6 h-6 text-destructive mb-2" />
          <p className="text-lg font-bold">{fmtRial(stats?.totalDebt ?? 0)}</p>
          <p className="text-xs text-muted-foreground">ديون مستحقة</p>
        </Card>
      </div>
      <Card className="p-4 mt-4">
        <h3 className="font-bold mb-1">{store?.name}</h3>
        <p className="text-sm text-muted-foreground">{store?.area}</p>
        <p className="text-xs mt-2">{store?.is_open ? "✅ المتجر مفتوح" : "🔴 المتجر مغلق"} — التقييم {Number(store?.rating ?? 0).toFixed(1)} ⭐</p>
      </Card>
    </MerchantShell>
  );
}

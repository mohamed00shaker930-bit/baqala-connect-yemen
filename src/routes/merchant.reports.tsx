import { fetchMyStore } from "@/lib/my-store";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtRial } from "@/lib/format";
import { Download, Store as StoreIcon, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/merchant/reports")({
  ssr: false,
  component: Reports,
});

type Range = "today" | "yesterday" | "7d" | "30d";

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "اليوم" },
  { id: "yesterday", label: "أمس" },
  { id: "7d", label: "7 أيام" },
  { id: "30d", label: "30 يوم" },
];

const PAY_LABEL: Record<string, string> = {
  cash: "نقداً", credit: "آجل", jeeb: "جيب", jawali: "جوالي", hasab: "حاسب", onecash: "ون كاش",
};

function rangeBounds(r: Range): { from: Date; to: Date } {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (r === "today") return { from: start, to: now };
  if (r === "yesterday") {
    const y = new Date(start); y.setDate(y.getDate() - 1);
    return { from: y, to: start };
  }
  const days = r === "7d" ? 7 : 30;
  const from = new Date(start); from.setDate(from.getDate() - (days - 1));
  return { from, to: now };
}

function Reports() {
  const [range, setRange] = useState<Range>("today");

  const { data: store } = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
  });

  const { data: orders } = useQuery({
    queryKey: ["reports-orders", store?.id, range],
    enabled: !!store?.id,
    queryFn: async () => {
      const { from, to } = rangeBounds(range);
      const { data } = await supabase
        .from("orders")
        .select("id, total, payment_method, channel, status, created_at, order_items(name, qty, price)")
        .eq("store_id", store!.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = (orders ?? []).filter((o: any) => o.status !== "declined" && o.status !== "cancelled");
    const total = list.reduce((s, o: any) => s + Number(o.total), 0);
    const online = list.filter((o: any) => o.channel === "online");
    const inStore = list.filter((o: any) => o.channel === "in_store");
    const onlineTotal = online.reduce((s, o: any) => s + Number(o.total), 0);
    const inStoreTotal = inStore.reduce((s, o: any) => s + Number(o.total), 0);
    const byPay: Record<string, { count: number; total: number }> = {};
    for (const o of list as any[]) {
      const k = o.payment_method;
      byPay[k] = byPay[k] || { count: 0, total: 0 };
      byPay[k].count++; byPay[k].total += Number(o.total);
    }
    const productMap: Record<string, { name: string; qty: number; total: number }> = {};
    for (const o of list as any[]) {
      for (const it of o.order_items ?? []) {
        const k = it.name;
        productMap[k] = productMap[k] || { name: it.name, qty: 0, total: 0 };
        productMap[k].qty += it.qty;
        productMap[k].total += Number(it.price) * it.qty;
      }
    }
    const top = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
    return {
      count: list.length, total,
      onlineCount: online.length, onlineTotal,
      inStoreCount: inStore.length, inStoreTotal,
      avg: list.length ? total / list.length : 0,
      byPay, top,
    };
  }, [orders]);

  const exportCSV = () => {
    if (!orders?.length) return;
    const rows = [["id", "date", "channel", "payment", "status", "total"]];
    for (const o of orders as any[]) {
      rows.push([o.id, o.created_at, o.channel, o.payment_method, o.status, String(o.total)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sales-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const maxChannel = Math.max(stats.onlineTotal, stats.inStoreTotal, 1);

  return (
    <MerchantShell title="التقارير" action={
      <Button size="sm" variant="secondary" onClick={exportCSV}><Download className="w-4 h-4 ml-1" /> CSV</Button>
    }>
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {RANGES.map((r) => (
          <Button key={r.id} size="sm" variant={range === r.id ? "default" : "outline"} onClick={() => setRange(r.id)}>
            {r.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
          <p className="text-xl font-bold text-primary">{fmtRial(stats.total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">عدد الفواتير</p>
          <p className="text-xl font-bold">{stats.count}</p>
        </Card>
        <Card className="p-4 col-span-2">
          <p className="text-xs text-muted-foreground">متوسط الفاتورة</p>
          <p className="text-lg font-bold">{fmtRial(stats.avg)}</p>
        </Card>
      </div>

      <Card className="p-4 mb-3 space-y-3">
        <h3 className="font-bold text-sm">المبيعات حسب القناة</h3>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="flex items-center gap-1"><StoreIcon className="w-3 h-3" /> داخل المحل ({stats.inStoreCount})</span>
            <span className="font-bold">{fmtRial(stats.inStoreTotal)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${(stats.inStoreTotal / maxChannel) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> أونلاين ({stats.onlineCount})</span>
            <span className="font-bold">{fmtRial(stats.onlineTotal)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-success" style={{ width: `${(stats.onlineTotal / maxChannel) * 100}%` }} />
          </div>
        </div>
      </Card>

      <Card className="p-4 mb-3">
        <h3 className="font-bold text-sm mb-2">حسب طريقة الدفع</h3>
        <div className="space-y-1 text-sm">
          {Object.keys(stats.byPay).length === 0 && <p className="text-xs text-muted-foreground">لا بيانات</p>}
          {Object.entries(stats.byPay).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b py-1">
              <span>{PAY_LABEL[k] ?? k} <span className="text-xs text-muted-foreground">({v.count})</span></span>
              <span className="font-bold">{fmtRial(v.total)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-bold text-sm mb-2">أعلى المنتجات مبيعاً</h3>
        <div className="space-y-1 text-sm">
          {stats.top.length === 0 && <p className="text-xs text-muted-foreground">لا بيانات</p>}
          {stats.top.map((p, i) => (
            <div key={i} className="flex justify-between border-b py-1">
              <span>{i + 1}. {p.name} <span className="text-xs text-muted-foreground">({p.qty})</span></span>
              <span className="font-bold">{fmtRial(p.total)}</span>
            </div>
          ))}
        </div>
      </Card>
    </MerchantShell>
  );
}

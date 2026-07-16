import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BadgeDollarSign, ShoppingBag, CheckCircle2, TrendingUp, Users, Percent,
  ArrowUp, ArrowDown, RefreshCw, Calendar, AlertTriangle, Store as StoreIcon,
  Undo2, Wallet, CreditCard, PackageSearch,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/kpis")({ component: KpisPage });

const COLORS = ["#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#10b981", "#ec4899"];
const fmt = (n: number) => Number(n || 0).toLocaleString("en-US");
const money = (n: number) => `${fmt(Math.round(Number(n || 0)))} ر.ي`;

const STATUS_AR: Record<string, string> = {
  sent: "مرسل", accepted: "مقبول", preparing: "قيد التجهيز",
  out_for_delivery: "في الطريق", delivered: "تم التسليم",
  declined: "مرفوض", cancelled: "ملغي",
};
const CHANNEL_AR: Record<string, string> = { online: "أونلاين", in_store: "المحل" };
const PAY_AR: Record<string, string> = {
  cash: "نقداً", credit: "أجل", jeeb: "جيب", jawali: "جوالي", hasab: "حسب", onecash: "ون كاش",
};

// Yemen is +03:00 (no DST)
const YEMEN_OFFSET = "+03:00";
function ymd(d: Date): string {
  // format YYYY-MM-DD in Yemen offset
  const shifted = new Date(d.getTime() + 3 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}
function fromToday(daysBack: number): { from: string; to: string } {
  const now = new Date();
  const toDate = new Date(now);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - daysBack);
  return { from: ymd(fromDate), to: ymd(toDate) };
}
function monthToDate(): { from: string; to: string } {
  const today = ymd(new Date());
  const from = today.slice(0, 8) + "01";
  return { from, to: today };
}
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00" + YEMEN_OFFSET);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}
function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00" + YEMEN_OFFSET).getTime();
  const d2 = new Date(b + "T00:00:00" + YEMEN_OFFSET).getTime();
  return Math.round((d2 - d1) / 86400000) + 1;
}
function grainFor(days: number): "day" | "week" | "month" {
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

type Preset = "today" | "7" | "30" | "mtd" | "custom";

type Kpis = {
  period: { from: string; to: string; grain: string };
  summary: {
    orders_total: number; orders_prev: number;
    delivered: number; delivered_prev: number;
    revenue: number; revenue_prev: number;
    commission: number; cancelled: number; aov: number;
  };
  by_channel: { channel: string; orders: number; delivered: number; revenue: number }[];
  by_status: { status: string; cnt: number }[];
  by_payment: { method: string; cnt: number; revenue: number }[];
  series: { d: string; orders: number; delivered: number; revenue: number; online_rev: number; instore_rev: number }[];
  top_stores: { id: string; name: string; orders: number; revenue: number }[];
  top_products: { name: string; qty: number; revenue: number }[];
  customers: { new: number; new_prev: number; active: number; active_stores: number };
  credit: { outstanding: number; debtors: number; charges: number; payments: number; collection_rate: number | null };
  attention: {
    pending_stores: number; pending_returns: number; pending_credit_tx: number;
    pending_wallet_tx: number; pending_custom_requests: number;
  };
  ratings: { avg: number | null; cnt: number };
};

function KpisPage() {
  const [preset, setPreset] = useState<Preset>("30");
  const [from, setFrom] = useState<string>(fromToday(29).from);
  const [to, setTo] = useState<string>(fromToday(29).to);
  const [data, setData] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "today") { const r = fromToday(0); setFrom(r.from); setTo(r.to); }
    else if (p === "7") { const r = fromToday(6); setFrom(r.from); setTo(r.to); }
    else if (p === "30") { const r = fromToday(29); setFrom(r.from); setTo(r.to); }
    else if (p === "mtd") { const r = monthToDate(); setFrom(r.from); setTo(r.to); }
  };

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const days = Math.max(1, daysBetween(from, to));
      const grain = grainFor(days);
      const p_from = `${from}T00:00:00${YEMEN_OFFSET}`;
      const p_to = `${addDays(to, 1)}T00:00:00${YEMEN_OFFSET}`;
      const { data: rpc, error } = await (supabase as any).rpc("admin_kpis", { p_from, p_to, p_grain: grain });
      if (error) throw error;
      setData(rpc as Kpis);
    } catch (e: any) {
      setErr(e.message || "تعذّر تحميل المؤشرات");
      toast.error(e.message || "تعذّر تحميل المؤشرات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  return (
    <AdminShell
      title="لوحة المؤشرات"
      action={
        <Button size="sm" variant="ghost" onClick={load} className="text-background hover:bg-background/10">
          <RefreshCw className="w-4 h-4" />
        </Button>
      }
    >
      <RangePicker preset={preset} from={from} to={to} onPreset={applyPreset} onFrom={(v) => { setPreset("custom"); setFrom(v); }} onTo={(v) => { setPreset("custom"); setTo(v); }} />

      {loading ? <LoadingSkeleton /> : err ? (
        <Card className="p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">{err}</p>
          <Button size="sm" onClick={load}>إعادة المحاولة</Button>
        </Card>
      ) : data ? (
        <div className="space-y-4 mt-3">
          <AttentionBar a={data.attention} />
          <KpiGrid s={data.summary} customers={data.customers} />
          <ChartsBlock series={data.series} byPayment={data.by_payment} byChannel={data.by_channel} grain={data.period.grain} />
          <CreditBlock c={data.credit} />
          <TopsBlock topStores={data.top_stores} topProducts={data.top_products} />
          <StatusBlock rows={data.by_status} total={data.summary.orders_total} />
        </div>
      ) : null}
    </AdminShell>
  );
}

/* ============ Filters ============ */
function RangePicker({
  preset, from, to, onPreset, onFrom, onTo,
}: {
  preset: Preset; from: string; to: string;
  onPreset: (p: Preset) => void; onFrom: (v: string) => void; onTo: (v: string) => void;
}) {
  const chip = (p: Preset, label: string) => (
    <button
      key={p}
      onClick={() => onPreset(p)}
      className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${preset === p ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
    >
      {label}
    </button>
  );
  return (
    <Card className="p-3 space-y-2">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {chip("today", "اليوم")}
        {chip("7", "آخر 7 أيام")}
        {chip("30", "آخر 30 يوماً")}
        {chip("mtd", "هذا الشهر")}
        <Popover>
          <PopoverTrigger asChild>
            <button className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex items-center gap-1 ${preset === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <Calendar className="w-3.5 h-3.5" /> مخصص
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">من</label>
              <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">إلى</label>
              <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[11px] text-muted-foreground">{from} → {to}</p>
    </Card>
  );
}

/* ============ Attention bar ============ */
function AttentionBar({ a }: { a: Kpis["attention"] }) {
  const items = [
    { key: "pending_stores", label: "متاجر بانتظار الموافقة", value: a.pending_stores, to: "/admin/merchants" as const },
    { key: "pending_returns", label: "طلبات إرجاع", value: a.pending_returns, to: "/admin/orders" as const },
    { key: "pending_credit_tx", label: "حركات أجل معلقة", value: a.pending_credit_tx, to: null as any },
    { key: "pending_wallet_tx", label: "حركات محفظة معلقة", value: a.pending_wallet_tx, to: "/admin/wallets" as const },
    { key: "pending_custom_requests", label: "طلبات منتجات خاصة", value: a.pending_custom_requests, to: null as any },
  ].filter((x) => Number(x.value) > 0);
  if (!items.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {items.map((it) => {
        const inner = (
          <Card className="p-3 min-w-[180px] bg-amber-50 border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-amber-900 truncate">{it.label}</p>
              <p className="text-lg font-bold text-amber-800 leading-tight">{fmt(it.value)}</p>
            </div>
          </Card>
        );
        return it.to ? (
          <Link key={it.key} to={it.to} className="shrink-0">{inner}</Link>
        ) : (
          <div key={it.key} className="shrink-0">{inner}</div>
        );
      })}
    </div>
  );
}

/* ============ KPI grid with delta ============ */
function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="text-[10px] text-muted-foreground">—</span>;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="w-3 h-3" /> {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiTile({ icon: Icon, label, value, cur, prev, color }: any) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {prev !== undefined && <Delta cur={cur ?? 0} prev={prev ?? 0} />}
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
    </Card>
  );
}

function KpiGrid({ s, customers }: { s: Kpis["summary"]; customers: Kpis["customers"] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <KpiTile icon={BadgeDollarSign} label="الإيرادات المحققة" value={money(s.revenue)} cur={s.revenue} prev={s.revenue_prev} color="bg-teal-100 text-teal-700" />
      <KpiTile icon={ShoppingBag} label="عدد الطلبات" value={fmt(s.orders_total)} cur={s.orders_total} prev={s.orders_prev} color="bg-violet-100 text-violet-700" />
      <KpiTile icon={CheckCircle2} label="طلبات مسلّمة" value={fmt(s.delivered)} cur={s.delivered} prev={s.delivered_prev} color="bg-emerald-100 text-emerald-700" />
      <KpiTile icon={TrendingUp} label="متوسط قيمة الطلب" value={money(s.aov)} color="bg-blue-100 text-blue-700" />
      <KpiTile icon={Users} label="عملاء جدد" value={fmt(customers.new)} cur={customers.new} prev={customers.new_prev} color="bg-pink-100 text-pink-700" />
      <KpiTile icon={Percent} label="عمولة المنصة" value={money(s.commission)} color="bg-orange-100 text-orange-700" />
    </div>
  );
}

/* ============ Charts ============ */
function ChartsBlock({
  series, byPayment, byChannel, grain,
}: {
  series: Kpis["series"]; byPayment: Kpis["by_payment"]; byChannel: Kpis["by_channel"]; grain: string;
}) {
  const revData = useMemo(() => series.map((r) => ({
    d: r.d, online: Math.round(Number(r.online_rev || 0)), instore: Math.round(Number(r.instore_rev || 0)),
  })), [series]);
  const ordersData = useMemo(() => series.map((r) => ({ d: r.d, orders: Number(r.orders || 0) })), [series]);

  const payData = useMemo(() => byPayment.map((p) => ({
    name: PAY_AR[p.method] || p.method, value: Math.round(Number(p.revenue || 0)),
  })), [byPayment]);
  const chData = useMemo(() => byChannel.map((c) => ({
    name: CHANNEL_AR[c.channel] || c.channel, value: Math.round(Number(c.revenue || 0)),
  })), [byChannel]);

  const grainLabel = grain === "week" ? "أسبوعي" : grain === "month" ? "شهري" : "يومي";
  const empty = !series.length;

  return (
    <>
      <Card className="p-3">
        <p className="text-sm font-bold mb-2">الإيرادات ({grainLabel}) — أونلاين × المحل</p>
        {empty ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revData}>
              <defs>
                <linearGradient id="gOn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="d" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Legend />
              <Area type="monotone" dataKey="online" name="أونلاين" stroke="#0d9488" fill="url(#gOn)" stackId="1" />
              <Area type="monotone" dataKey="instore" name="المحل" stroke="#f59e0b" fill="url(#gIn)" stackId="1" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-3">
        <p className="text-sm font-bold mb-2">عدد الطلبات ({grainLabel})</p>
        {empty ? <Empty /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="d" fontSize={10} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" name="طلبات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-sm font-bold mb-2">طرق الدفع (بالإيراد)</p>
          {!payData.length ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={payData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {payData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-sm font-bold mb-2">القنوات (بالإيراد)</p>
          {!chData.length ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75} paddingAngle={2}>
                  {chData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </>
  );
}

/* ============ Credit ============ */
function CreditBlock({ c }: { c: Kpis["credit"] }) {
  const rate = c.collection_rate == null ? null : Math.max(0, Math.min(100, Number(c.collection_rate)));
  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold">الأجل</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="الذمم المستحقة" value={money(c.outstanding)} />
        <MiniStat label="عدد المدينين" value={fmt(c.debtors)} />
        <MiniStat label="مبيعات الأجل (الفترة)" value={money(c.charges)} />
        <MiniStat label="التحصيلات (الفترة)" value={money(c.payments)} />
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">نسبة التحصيل</span>
          <span className="font-bold">{rate == null ? "—" : `${rate.toFixed(1)}%`}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rate ?? 0}%` }} />
        </div>
      </div>
    </Card>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

/* ============ Tops ============ */
function TopsBlock({ topStores, topProducts }: { topStores: Kpis["top_stores"]; topProducts: Kpis["top_products"] }) {
  return (
    <Card className="p-3">
      <Tabs defaultValue="stores">
        <TabsList className="w-full">
          <TabsTrigger value="stores" className="flex-1">
            <StoreIcon className="w-4 h-4 ml-1" /> أفضل المتاجر
          </TabsTrigger>
          <TabsTrigger value="products" className="flex-1">
            <PackageSearch className="w-4 h-4 ml-1" /> الأكثر مبيعاً
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stores" className="mt-3">
          {!topStores.length ? <Empty /> : (
            <div className="divide-y">
              {topStores.map((s, i) => (
                <div key={s.id} className="py-2 flex items-center gap-3">
                  <Badge variant="secondary" className="w-6 justify-center">{i + 1}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{fmt(s.orders)} طلب</p>
                  </div>
                  <p className="text-sm font-bold">{money(s.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="products" className="mt-3">
          {!topProducts.length ? <Empty /> : (
            <div className="divide-y">
              {topProducts.map((p, i) => (
                <div key={i} className="py-2 flex items-center gap-3">
                  <Badge variant="secondary" className="w-6 justify-center">{i + 1}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">الكمية: {fmt(p.qty)}</p>
                  </div>
                  <p className="text-sm font-bold">{money(p.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/* ============ Status ============ */
function StatusBlock({ rows, total }: { rows: Kpis["by_status"]; total: number }) {
  const sum = rows.reduce((a, r) => a + Number(r.cnt || 0), 0) || total || 1;
  const sorted = [...rows].sort((a, b) => b.cnt - a.cnt);
  return (
    <Card className="p-3 space-y-2">
      <p className="text-sm font-bold">حالة الطلبات</p>
      {!sorted.length ? <Empty /> : sorted.map((r) => {
        const pct = (Number(r.cnt || 0) / sum) * 100;
        return (
          <div key={r.status}>
            <div className="flex justify-between text-xs mb-1">
              <span>{STATUS_AR[r.status] || r.status}</span>
              <span className="text-muted-foreground">{fmt(r.cnt)} ({pct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/* ============ Utility ============ */
function Empty() {
  return <p className="text-center text-xs text-muted-foreground py-6">لا بيانات في هذه الفترة</p>;
}
function LoadingSkeleton() {
  return (
    <div className="space-y-3 mt-3">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

import { fetchMyStore } from "@/lib/my-store";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { fmtRial } from "@/lib/format";
import { formatDateTime } from "@/lib/dateFormat";
import { ScanBarcode, Plus, Minus, Trash2, Search, CheckCircle2, Wallet, Banknote, BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerPicker, type PickedCustomer } from "@/components/CustomerPicker";
import { toast } from "sonner";
import {
  getProductsByStore,
  putProduct,
  putProducts,
  getCustomersByStore,
  putCustomers,
  type LocalProduct,
} from "@/lib/offline-db";
import { enqueue, flush, bindQueryClient } from "@/lib/pos-outbox";
import { SyncStatusChip } from "@/components/SyncStatusChip";

export const Route = createFileRoute("/merchant/pos")({
  ssr: false,
  component: POS,
});

type Line = { product_id: string; name: string; price: number; qty: number };
type PayMethod = "cash" | "credit" | "jeeb" | "jawali" | "hasab" | "onecash";

const WALLETS: { id: PayMethod; name: string; short: string }[] = [
  { id: "jeeb", name: "جيب", short: "ج" },
  { id: "jawali", name: "جوالي", short: "ج" },
  { id: "hasab", name: "حاسب", short: "ح" },
  { id: "onecash", name: "ون كاش", short: "1" },
];

function newUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // fallback
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function POS() {
  const qc = useQueryClient();
  useEffect(() => { bindQueryClient(qc); }, [qc]);

  const { data: store } = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
  });

  const { data: products } = useQuery({
    queryKey: ["pos-products", store?.id],
    enabled: !!store?.id,
    placeholderData: [],
    queryFn: async () => {
      const local = await getProductsByStore(store!.id);
      try {
        const { data, error } = await supabase.from("products").select("*").eq("store_id", store!.id).order("name");
        if (error) throw error;
        const rows = (data ?? []) as LocalProduct[];
        if (rows.length) await putProducts(rows);
        return rows;
      } catch {
        return local;
      }
    },
  });

  // load offline customer fallback list
  const { data: offlineCustomers = [] } = useQuery({
    queryKey: ["pos-offline-customers", store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const local = await getCustomersByStore(store!.id);
      try {
        const [accountsRes, pendingRes] = await Promise.all([
          supabase.from("credit_accounts").select("id, customer_id").eq("store_id", store!.id).limit(100),
          supabase.from("pending_customers").select("id,name,phone").eq("store_id", store!.id).limit(200),
        ]);
        if (accountsRes.error && pendingRes.error) return local;

        const merged: { id: string; store_id: string; kind: "registered" | "pending"; name: string; phone: string }[] = [];

        const accounts = (accountsRes.data ?? []) as { id: string; customer_id: string }[];
        for (let i = 0; i < accounts.length; i += 20) {
          const batch = accounts.slice(i, i + 20);
          const results = await Promise.all(
            batch.map(async (acc) => {
              try {
                const { data, error } = await supabase.rpc("get_credit_customer", { _account_id: acc.id });
                if (error) return null;
                const row = Array.isArray(data) ? data[0] : data;
                if (!row?.name) return null;
                return { id: acc.customer_id, store_id: store!.id, kind: "registered" as const, name: row.name as string, phone: (row.phone as string) ?? "" };
              } catch {
                return null;
              }
            })
          );
          for (const r of results) if (r) merged.push(r);
        }

        for (const r of (pendingRes.data ?? []) as any[]) {
          if (r?.id) merged.push({ id: r.id, store_id: store!.id, kind: "pending", name: r.name ?? "", phone: r.phone ?? "" });
        }

        const seen = new Set<string>();
        const uniq = merged.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
        if (uniq.length) {
          try { await putCustomers(uniq); } catch {}
        }
        return uniq.length ? uniq : local;
      } catch {
        return local;
      }
    },

  });

  const [lines, setLines] = useState<Line[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState<PayMethod>("cash");
  const [walletRef, setWalletRef] = useState("");
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [newProd, setNewProd] = useState({ name: "", price: "" });
  const [receipt, setReceipt] = useState<{ id: string; lines: Line[]; total: number; payment: PayMethod } | null>(null);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);

  // flush on mount
  useEffect(() => {
    void flush();
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);
  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [products, search]);

  const addProduct = (pr: { id: string; name: string; price: number }) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product_id === pr.id);
      if (i >= 0) {
        const copy = [...prev]; copy[i] = { ...copy[i], qty: copy[i].qty + 1 }; return copy;
      }
      return [...prev, { product_id: pr.id, name: pr.name, price: Number(pr.price), qty: 1 }];
    });
    try { navigator.vibrate?.(30); } catch {}
  };

  const onDetected = (code: string) => {
    const found = (products ?? []).find((p) => p.barcode === code);
    if (found) {
      addProduct({ id: found.id, name: found.name, price: Number(found.price) });
      setScanOpen(false);
      toast.success(`أُضيف: ${found.name}`);
    } else {
      setScanOpen(false);
      setUnknownCode(code);
    }
  };

  const saveUnknown = async () => {
    if (!unknownCode || !store) return;
    if (!newProd.name.trim() || !newProd.price) { toast.error("اكتب الاسم والسعر"); return; }
    const id = newUuid();
    const row: LocalProduct = {
      id,
      store_id: store.id,
      name: newProd.name.trim(),
      price: Number(newProd.price),
      barcode: unknownCode,
    };
    await putProduct(row);
    await enqueue({
      id: newUuid(),
      kind: "new_product",
      createdAt: new Date().toISOString(),
      payload: row,
    });
    qc.invalidateQueries({ queryKey: ["pos-products"] });
    qc.invalidateQueries({ queryKey: ["my-products"] });
    addProduct({ id, name: row.name, price: row.price });
    setUnknownCode(null); setNewProd({ name: "", price: "" });
    toast.success("أُضيف المنتج وبيع");
    void flush();
  };

  const changeQty = (id: string, delta: number) => {
    setLines((prev) => prev.flatMap((l) => {
      if (l.product_id !== id) return [l];
      const q = l.qty + delta;
      return q <= 0 ? [] : [{ ...l, qty: q }];
    }));
  };
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.product_id !== id));

  const checkout = async () => {
    if (!store) { toast.error("لا يوجد متجر"); return; }
    if (lines.length === 0) { toast.error("الفاتورة فارغة"); return; }
    if (payment === "credit" && !customer) { toast.error("اختر العميل لبيع الأجل"); return; }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { toast.error("غير مسجل"); return; }

      const isWallet = payment !== "cash" && payment !== "credit";
      const orderId = newUuid();
      const createdAt = new Date().toISOString();

      let note: string | null = null;
      let orderCustomerId = uid;
      let creditStatus: string | null = null;
      let orderStatus: string = "delivered";

      if (payment === "credit" && customer?.kind === "pending") {
        note = `أجل لعميل غير مسجل: ${customer.name} (${customer.phone}). سيتم تفعيله عند تسجيله.`;
        orderCustomerId = uid;
        creditStatus = "pending";
        orderStatus = "sent";
      } else if (payment === "credit" && customer?.kind === "registered") {
        orderCustomerId = customer.id;
        creditStatus = "pending";
        orderStatus = "sent";
      } else if (isWallet && walletRef) {
        note = `محفظة ${payment} - مرجع: ${walletRef}`;
      }

      const order = {
        id: orderId,
        store_id: store.id,
        customer_id: orderCustomerId,
        total,
        payment_method: payment,
        status: orderStatus,
        channel: "in_store",
        credit_status: creditStatus,
        note,
        created_at: createdAt,
      };
      const items = lines.map((l) => ({
        id: newUuid(),
        order_id: orderId,
        product_id: l.product_id,
        name: l.name,
        price: l.price,
        qty: l.qty,
      }));

      const credit =
        payment === "credit" && customer
          ? {
              customerKind: customer.kind,
              customerId: customer.id,
              txId: newUuid(),
              amount: total,
              note: customer.kind === "pending"
                ? "بيع داخل المحل - أجل (عميل غير مسجل)"
                : "بيع داخل المحل - أجل",
            }
          : undefined;

      await enqueue({
        id: newUuid(),
        kind: "sale",
        createdAt,
        payload: { order, items, credit },
      });

      setReceipt({ id: orderId, lines, total, payment });
      setLines([]); setWalletRef(""); setPayment("cash"); setCustomer(null);
      toast.success(
        payment === "credit" ? "سُجّل — سيُرسل للعميل عند المزامنة" : "تم إتمام البيع"
      );
      void flush();
    } catch (e: any) {
      toast.error(e.message ?? "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MerchantShell title="نقطة البيع" action={<SyncStatusChip />}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" className="h-16 text-base" onClick={() => setScanOpen(true)}>
            <ScanBarcode className="w-6 h-6 ml-2" /> مسح باركود
          </Button>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-16 pr-9" placeholder="ابحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length > 0 && (
          <Card className="p-2 space-y-1">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => { addProduct({ id: p.id, name: p.name, price: Number(p.price) }); setSearch(""); }}
                className="w-full flex justify-between items-center p-2 hover:bg-accent rounded text-right">
                <span>{p.name}</span>
                <span className="text-primary text-sm">{fmtRial(p.price)}</span>
              </button>
            ))}
          </Card>
        )}

        <Card className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">الفاتورة الحالية</h3>
            {lines.length > 0 && <Button size="sm" variant="ghost" onClick={() => setLines([])}>تفريغ</Button>}
          </div>
          {lines.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">امسح باركود أو ابحث لإضافة منتج</p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.product_id} className="flex items-center gap-2 border-b pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{l.name}</p>
                    <p className="text-xs text-primary">{fmtRial(l.price * l.qty)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => changeQty(l.product_id, -1)}><Minus className="w-3 h-3" /></Button>
                    <span className="w-6 text-center font-bold">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => changeQty(l.product_id, +1)}><Plus className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(l.product_id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {lines.length > 0 && (
          <Card className="p-3 space-y-3">
            <Label>طريقة الدفع</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={payment === "cash" ? "default" : "outline"} onClick={() => setPayment("cash")}>
                <Banknote className="w-4 h-4 ml-1" /> نقداً
              </Button>
              <Button variant={payment === "credit" ? "default" : "outline"} onClick={() => setPayment("credit")}>
                <BookOpen className="w-4 h-4 ml-1" /> آجل
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {WALLETS.map((w) => (
                <Button key={w.id} size="sm" variant={payment === w.id ? "default" : "outline"} onClick={() => setPayment(w.id)} className="flex-col h-14 text-[10px] gap-0">
                  <Wallet className="w-4 h-4" />
                  <span>{w.name}</span>
                </Button>
              ))}
            </div>
            {payment !== "cash" && payment !== "credit" && (
              <Input dir="ltr" placeholder="رقم مرجع المحفظة (اختياري)" value={walletRef} onChange={(e) => setWalletRef(e.target.value)} />
            )}
            {payment === "credit" && store && (
              <div className="border-t pt-3">
                <CustomerPicker
                  storeId={store.id}
                  value={customer}
                  onChange={setCustomer}
                  offlineFallback={offlineCustomers}
                />
                <p className="text-[11px] text-muted-foreground mt-2">سيُرسل للعميل إشعار لقبول الفاتورة قبل إضافتها لذمته.</p>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm text-muted-foreground">الإجمالي</span>
              <span className="text-2xl font-bold text-primary">{fmtRial(total)}</span>
            </div>
            <Button size="lg" className="w-full h-14 text-base" onClick={checkout} disabled={saving}>
              <CheckCircle2 className="w-5 h-5 ml-2" /> {saving ? "جارٍ الحفظ..." : "إتمام البيع"}
            </Button>
          </Card>
        )}
      </div>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={onDetected} title="امسح المنتج" />

      <Dialog open={!!unknownCode} onOpenChange={(v) => !v && setUnknownCode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>منتج جديد</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground" dir="ltr">{unknownCode}</p>
          <Input placeholder="اسم المنتج" value={newProd.name} onChange={(e) => setNewProd({...newProd, name: e.target.value})} />
          <Input dir="ltr" inputMode="numeric" placeholder="السعر" value={newProd.price} onChange={(e) => setNewProd({...newProd, price: e.target.value})} />
          <Button onClick={saveUnknown}>حفظ وإضافة للفاتورة</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>إيصال البيع</DialogTitle></DialogHeader>
          {receipt && (
            <div className="space-y-2">
              <div className="text-center text-xs text-muted-foreground">
                <p className="font-bold text-base text-foreground">{store?.name}</p>
                <p>فاتورة #{receipt.id.slice(0, 8)}</p>
                <p>{new Date().toLocaleString("ar-EG")}</p>
              </div>
              <div className="border-t border-b py-2 space-y-1 text-sm">
                {receipt.lines.map((l) => (
                  <div key={l.product_id} className="flex justify-between">
                    <span>{l.name} × {l.qty}</span>
                    <span>{fmtRial(l.price * l.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>الإجمالي</span>
                <span className="text-primary">{fmtRial(receipt.total)}</span>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                الدفع: {receipt.payment === "cash" ? "نقداً" : receipt.payment === "credit" ? "آجل" : `محفظة (${receipt.payment})`}
              </p>
              <Button className="w-full" onClick={() => setReceipt(null)}>تم</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MerchantShell>
  );
}

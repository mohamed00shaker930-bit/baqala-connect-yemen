import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/merchants")({
  component: Page,
});

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

type BizCat = { id: string; slug: string; name_ar: string; sort_order: number };

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<BizCat[]>([]);
  const [editStore, setEditStore] = useState<any | null>(null);
  const [editCatId, setEditCatId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("stores")
      .select("*, business_categories(id, slug, name_ar)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("business_categories")
        .select("id, slug, name_ar, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setCats(data || []);
    })();
  }, []);

  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).rpc("admin_set_store_status", { _store: id, _status: status });
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحديث");
    load();
  };

  const setCommission = async (id: string, current: number | null) => {
    const raw = prompt("نسبة العمولة لهذا المتجر (٪) - اتركه فارغاً لاستخدام الافتراضية", String(current ?? ""));
    if (raw === null) return;
    const pct = raw.trim() === "" ? null : Number(raw);
    if (raw.trim() !== "" && (Number.isNaN(pct) || (pct as number) < 0 || (pct as number) > 100)) { toast.error("نسبة غير صحيحة"); return; }
    const { error } = await (supabase as any).rpc("admin_set_store_commission", { _store: id, _pct: pct });
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث العمولة");
    load();
  };

  const openEdit = (s: any) => {
    setEditStore(s);
    setEditCatId(s.business_category_id || "");
  };

  const saveEdit = async () => {
    if (!editStore) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("stores")
      .update({ business_category_id: editCatId || null })
      .eq("id", editStore.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ التصنيف");
    setEditStore(null);
    load();
  };

  return (
    <AdminShell title="إدارة المتاجر">
      <div className="flex gap-2 mb-3 flex-wrap">
        {["pending", "active", "suspended", "rejected", "all"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "pending" ? "بانتظار" : s === "active" ? "مفعّلة" : s === "suspended" ? "معلّقة" : s === "rejected" ? "مرفوضة" : "الكل"}
          </Button>
        ))}
      </div>
      {loading ? <p className="text-center text-muted-foreground py-8">جاري التحميل...</p> :
        rows.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد متاجر</p> :
        <div className="space-y-2">
          {rows.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{s.name}</h3>
                    <Badge className={statusColor[s.status]}>{s.status}</Badge>
                    {s.business_categories?.name_ar && <Badge variant="secondary">{s.business_categories.name_ar}</Badge>}
                    {s.commission_pct != null && <Badge variant="outline">عمولة {s.commission_pct}%</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.area || "—"} • {s.phone || "بدون رقم"}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {s.status !== "active" && <Button size="sm" onClick={() => setStatus(s.id, "active")}>اعتماد</Button>}
                {s.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "suspended")}>تعليق</Button>}
                {s.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => setStatus(s.id, "rejected")}>رفض</Button>}
                <Button size="sm" variant="secondary" onClick={() => setCommission(s.id, s.commission_pct)}>تعديل العمولة</Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>تعديل التصنيف</Button>
              </div>
            </Card>
          ))}
        </div>
      }

      <Dialog open={!!editStore} onOpenChange={(o) => { if (!o) setEditStore(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المحل — {editStore?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>تصنيف النشاط</Label>
              <Select value={editCatId || "__none__"} onValueChange={(v) => setEditCatId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون تصنيف</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStore(null)}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

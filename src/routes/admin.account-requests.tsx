import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/dateFormat";

export const Route = createFileRoute("/admin/account-requests")({
  component: AccountRequestsPage,
});

type Req = {
  id: string; name: string | null; phone: string; user_type: string | null;
  city: string | null; district: string | null; address: string | null;
  business_name: string | null; created_at: string;
  business_categories?: { name_ar: string } | null;
};

function AccountRequestsPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<Req | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id,name,phone,user_type,city,district,address,business_name,created_at,business_categories(name_ar)")
      .eq("account_status", "pending")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Req[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, approve: boolean, p_reason?: string) => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("admin_decide_account_request", {
      p_user_id: id, p_approve: approve, ...(approve ? {} : { p_reason: p_reason || null }),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "تمت الموافقة على الطلب" : "تم رفض الطلب");
    setRejecting(null); setReason("");
    load();
  };

  return (
    <AdminShell title="طلبات فتح الحساب">
      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا توجد طلبات معلّقة</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {r.user_type === "merchant" ? "تاجر" : "مستهلك"}
                </span>
                <p className="font-bold">{r.name || "—"}</p>
                <span dir="ltr" className="text-sm text-muted-foreground">{r.phone}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <p>المدينة: {r.city || "—"}</p>
                <p>المديرية: {r.district || "—"}</p>
                <p className="col-span-2">العنوان: {r.address || "—"}</p>
                {r.user_type === "merchant" && <p>اسم النشاط: {r.business_name || "—"}</p>}
                {r.user_type === "merchant" && <p>نوع النشاط: {r.business_categories?.name_ar || "—"}</p>}
                <p className="col-span-2">تاريخ الطلب: {formatDateTime(r.created_at)}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={busy} onClick={() => decide(r.id, true)}>موافقة</Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => { setRejecting(r); setReason(""); }}>رفض</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>رفض الطلب</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">سبب الرفض (اختياري)</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={busy} onClick={() => rejecting && decide(rejecting.id, false, reason.trim())}>
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

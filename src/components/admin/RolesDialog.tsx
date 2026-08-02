import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { LoginSessionsList } from "@/components/admin/LoginSessionsList";
import { AppUsageList } from "@/components/admin/AppUsageList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const STAFF_ROLES = [
  { key: "super_admin", label: "مدير رئيسي" },
  { key: "admin", label: "مدير" },
  { key: "operations", label: "عمليات" },
  { key: "support", label: "خدمة عملاء" },
  { key: "finance", label: "مالية" },
] as const;

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(STAFF_ROLES.map((r) => [r.key, r.label]));

export type RolesDialogUser = {
  user_id: string;
  name: string | null;
  phone: string | null;
  roles: string[] | null;
};

type StoreDetail = { id: string; name: string | null; status: string | null; is_open: boolean | null; commission_pct: number | null };

type UserDetail = {
  user_id: string; name: string | null; phone: string | null; user_type: string | null;
  account_status: string | null; suspended_until: string | null; status_reason: string | null;
  city: string | null; district: string | null; address: string | null; business_name: string | null;
  created_at: string | null; wallet_balance: number; roles: string[]; store?: StoreDetail | null;
};

type Me = { super: boolean; is_staff: boolean; perms: string[] };
type PermDef = { perm: string; grp: string; grp_label: string; label: string; super_only: boolean; sort: number };
type Bundle = { bundle: string; label: string; sort: number; perms: string[] };
type Catalog = { defs: PermDef[]; bundles: Bundle[] };

const DURATIONS = [
  { key: "1d", label: "يوم واحد", days: 1 },
  { key: "3d", label: "٣ أيام", days: 3 },
  { key: "7d", label: "أسبوع", days: 7 },
  { key: "30d", label: "شهر", days: 30 },
  { key: "custom", label: "تاريخ مخصّص", days: 0 },
  { key: "permanent", label: "دائم (حظر)", days: 0 },
] as const;

function untilFromKey(key: string, customUntil: string): string | null {
  if (key === "permanent") return null;
  if (key === "custom") return customUntil ? new Date(customUntil).toISOString() : null;
  const d = DURATIONS.find((x) => x.key === key)?.days ?? 1;
  return new Date(Date.now() + d * 86400000).toISOString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
}

const STAFF_ROLE_KEYS = ["admin", "operations", "support", "finance"];

export function RolesDialog({ user, onClose, onChanged }: { user: RolesDialogUser | null; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [targetPerms, setTargetPerms] = useState<Set<string>>(new Set());
  const [newBundleLabel, setNewBundleLabel] = useState("");

  const [suspendReason, setSuspendReason] = useState("");
  const [durationKey, setDurationKey] = useState<string>("7d");
  const [customUntil, setCustomUntil] = useState("");
  const [amount, setAmount] = useState("");
  const [perkNote, setPerkNote] = useState("");
  const [pName, setPName] = useState("");
  const [pCity, setPCity] = useState("");
  const [pDistrict, setPDistrict] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pBusiness, setPBusiness] = useState("");
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [commission, setCommission] = useState("");

  const rpc = (fn: string, params: Record<string, unknown>) => (supabase as any).rpc(fn, params);

  const loadPermMgmt = useCallback(async (uid: string) => {
    const [c, tp] = await Promise.all([rpc("admin_get_permission_catalog", {}), rpc("admin_list_admin_permissions", { p_uid: uid })]);
    if (!c.error) setCatalog(c.data as Catalog);
    if (!tp.error) setTargetPerms(new Set((tp.data as string[]) || []));
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const meRes = await rpc("my_permissions", {});
    const meVal = (meRes.error ? { super: false, is_staff: false, perms: [] } : meRes.data) as Me;
    setMe(meVal);
    const { data, error } = await rpc("admin_get_user_detail", { p_uid: user.user_id });
    setLoading(false);
    if (error) { toast.error(error.message || "تعذّر جلب تفاصيل المستخدم"); return; }
    const d = data as UserDetail;
    setDetail(d);
    setPName(d.name || ""); setPCity(d.city || ""); setPDistrict(d.district || "");
    setPAddress(d.address || ""); setPBusiness(d.business_name || "");
    setCommission(d.store?.commission_pct != null ? String(d.store.commission_pct) : "");
    const roles = d.roles || [];
    const isSuperT = roles.includes("super_admin");
    const isStaffT = isSuperT || roles.some((r) => STAFF_ROLE_KEYS.includes(r));
    if (isStaffT && !isSuperT && meVal.super) await loadPermMgmt(user.user_id);
  }, [user, loadPermMgmt]);

  useEffect(() => { setDetail(null); setCatalog(null); setTargetPerms(new Set()); if (user) load(); }, [user, load]);

  if (!user) return null;

  const roles = detail?.roles || [];
  const isSuperTarget = roles.includes("super_admin");
  const isStaffTarget = isSuperTarget || roles.some((r) => STAFF_ROLE_KEYS.includes(r));
  const isEndUser = !!detail && !isStaffTarget;
  const isMerchant = detail?.user_type === "merchant";
  const can = (p: string) => !!me && (me.super || (me.perms || []).includes(p));

  const effectiveSuspended =
    detail?.account_status === "suspended" && (!detail?.suspended_until || new Date(detail.suspended_until) > new Date());

  const statusBadge = () => {
    if (!detail) return null;
    if (isStaffTarget) return <Badge className="bg-indigo-600 hover:bg-indigo-600">{isSuperTarget ? "مدير رئيسي" : "مدير"}</Badge>;
    if (effectiveSuspended) {
      if (!detail.suspended_until) return <Badge variant="destructive">محظور</Badge>;
      return <Badge className="bg-amber-500 hover:bg-amber-500">معلّق حتى {fmtDate(detail.suspended_until)}</Badge>;
    }
    if (detail.account_status === "active") return <Badge className="bg-emerald-600 hover:bg-emerald-600">نشط</Badge>;
    return <Badge variant="secondary">{detail.account_status}</Badge>;
  };

  const run = async (key: string, fn: string, params: Record<string, unknown>, okMsg: string, after?: () => void) => {
    setBusy(key);
    const { error } = await rpc(fn, params);
    setBusy(null);
    if (error) { toast.error(error.message || "حدث خطأ"); return; }
    toast.success(okMsg); after?.(); await load(); onChanged();
  };

  const togglePerm = async (perm: string, next: boolean) => {
    setBusy("perm-" + perm);
    const { error } = await rpc("admin_grant_permission", { p_uid: user.user_id, p_perm: perm, p_grant: next });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر التحديث"); return; }
    const s = new Set(targetPerms); if (next) s.add(perm); else s.delete(perm); setTargetPerms(s);
    toast.success("تم التحديث"); onChanged();
  };
  const applyBundle = async (bundle: string) => {
    setBusy("bundle-" + bundle);
    const { error } = await rpc("admin_apply_bundle", { p_uid: user.user_id, p_bundle: bundle });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر التطبيق"); return; }
    toast.success("تم تطبيق المجموعة"); await loadPermMgmt(user.user_id); onChanged();
  };
  const deleteBundle = async (bundle: string) => {
    setBusy("delbundle-" + bundle);
    const { error } = await rpc("admin_delete_bundle", { p_bundle: bundle });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر الحذف"); return; }
    toast.success("تم حذف المجموعة"); await loadPermMgmt(user.user_id);
  };
  const createBundle = async () => {
    if (!newBundleLabel.trim()) { toast.error("اسم المجموعة مطلوب"); return; }
    if (targetPerms.size === 0) { toast.error("حدّد صلاحية واحدة على الأقل أولًا"); return; }
    const key = "b_" + Math.random().toString(36).slice(2, 10);
    setBusy("createbundle");
    const { error } = await rpc("admin_create_bundle", { p_bundle: key, p_label: newBundleLabel.trim(), p_perms: Array.from(targetPerms) });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر الإنشاء"); return; }
    toast.success("تم إنشاء المجموعة"); setNewBundleLabel(""); await loadPermMgmt(user.user_id);
  };
  const revokeAdminTier = () =>
    run("demote", "admin_set_user_role", { _uid: user.user_id, _role: "admin", _grant: false }, "تم إلغاء رتبة المدير");

  const doSuspend = () => {
    if (!suspendReason.trim()) { toast.error("سبب التعليق مطلوب"); return; }
    const until = untilFromKey(durationKey, customUntil);
    if (durationKey === "custom" && !until) { toast.error("اختر تاريخًا صحيحًا"); return; }
    run("suspend", "admin_set_account_status", { p_uid: user.user_id, p_status: "suspended", p_reason: suspendReason.trim(), p_until: until }, "تم تعليق الحساب", () => setSuspendReason(""));
  };
  const doReactivate = () => run("reactivate", "admin_set_account_status", { p_uid: user.user_id, p_status: "active", p_reason: null, p_until: null }, "تمت إعادة التفعيل");
  const doGrant = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("أدخل مبلغًا صحيحًا"); return; }
    run("grant", "admin_grant_wallet_credit", { p_uid: user.user_id, p_amount: amt, p_note: perkNote.trim() || null }, "تم إضافة الرصيد", () => { setAmount(""); setPerkNote(""); });
  };
  const doSaveProfile = () =>
    run("profile", "admin_update_profile", { p_uid: user.user_id, p_name: pName.trim() || null, p_city: pCity || null, p_district: pDistrict || null, p_address: pAddress || null, p_business_name: isMerchant ? pBusiness || null : null }, "تم حفظ البيانات");
  const doSendNotif = () => {
    if (!nTitle.trim() || !nBody.trim()) { toast.error("العنوان والنص مطلوبان"); return; }
    run("notif", "admin_send_notification", { p_uid: user.user_id, p_title: nTitle.trim(), p_body: nBody.trim(), p_type: "admin", p_link: null }, "تم إرسال الإشعار", () => { setNTitle(""); setNBody(""); });
  };
  const doStoreStatus = (next: string) => {
    if (!detail?.store) return;
    run("store-status", "admin_set_store_status", { _store: detail.store.id, _status: next }, next === "suspended" ? "تم تعليق المتجر" : "تم تفعيل المتجر");
  };
  const doStoreCommission = () => {
    if (!detail?.store) return;
    const pct = Number(commission);
    if (isNaN(pct) || pct < 0) { toast.error("أدخل نسبة صحيحة"); return; }
    run("store-commission", "admin_set_store_commission", { _store: detail.store.id, _pct: pct }, "تم حفظ العمولة");
  };

  const showAccount = can("users.suspend") || can("users.wallet_grant") || can("users.edit");
  const endTabs = [
    ...(showAccount ? [{ v: "account", l: "الحساب" }] : []),
    ...(isMerchant && can("stores.manage") ? [{ v: "store", l: "المتجر" }] : []),
    ...(can("users.notify") ? [{ v: "comm", l: "التواصل" }] : []),
    ...(can("oversight.view") ? [{ v: "activity", l: "النشاط" }, { v: "sessions", l: "الجلسات" }, { v: "usage", l: "الاستخدام" }] : []),
  ];

  const groups: { key: string; label: string; items: PermDef[] }[] = [];
  (catalog?.defs || []).forEach((d) => {
    let g = groups.find((x) => x.key === d.grp);
    if (!g) { g = { key: d.grp, label: d.grp_label, items: [] }; groups.push(g); }
    g.items.push(d);
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل المستخدم</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span>{detail?.name || user.name || "—"} • {detail?.phone || user.phone || "—"}</span>
            {statusBadge()}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : isStaffTarget ? (
          !me?.super ? (
            <p className="py-8 text-center text-sm text-muted-foreground">إدارة صلاحيات فريق الإدارة متاحة للمدير الرئيسي فقط.</p>
          ) : isSuperTarget ? (
            <div className="py-8 text-center space-y-1">
              <Badge className="bg-indigo-600 hover:bg-indigo-600">مدير رئيسي</Badge>
              <p className="text-sm text-muted-foreground">هذا مدير رئيسي — يملك جميع الصلاحيات ولا يخضع للإدارة.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="border rounded-lg p-3 space-y-2">
                <span className="text-sm font-medium">حِزم جاهزة</span>
                <div className="flex flex-wrap gap-2">
                  {(catalog?.bundles || []).map((b) => (
                    <span key={b.bundle} className="inline-flex items-center rounded-md border overflow-hidden">
                      <button className="px-2 py-1 text-xs hover:bg-accent disabled:opacity-50" disabled={busy === "bundle-" + b.bundle} onClick={() => applyBundle(b.bundle)}>
                        + {b.label}
                      </button>
                      <button className="px-1.5 py-1 text-xs text-destructive border-r hover:bg-accent disabled:opacity-50" title="حذف المجموعة" disabled={busy === "delbundle-" + b.bundle} onClick={() => deleteBundle(b.bundle)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input className="h-8 text-xs" placeholder="اسم مجموعة جديدة (من الصلاحيات المحددة)" value={newBundleLabel} onChange={(e) => setNewBundleLabel(e.target.value)} />
                  <Button size="sm" variant="outline" disabled={busy === "createbundle"} onClick={createBundle}>حفظ</Button>
                </div>
              </div>

              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.key} className="border rounded-lg p-3 space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">{g.label}</span>
                    {g.items.map((d) => (
                      <div key={d.perm} className="flex items-center justify-between gap-2">
                        <Label htmlFor={"perm-" + d.perm} className="text-sm flex items-center gap-2">
                          {d.label}
                          {d.super_only && <span className="text-[10px] text-muted-foreground">(للرئيسي فقط)</span>}
                        </Label>
                        <Switch
                          id={"perm-" + d.perm}
                          checked={d.super_only ? false : targetPerms.has(d.perm)}
                          disabled={d.super_only || busy === "perm-" + d.perm}
                          onCheckedChange={(v) => togglePerm(d.perm, v)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <Button size="sm" variant="outline" className="text-destructive" disabled={busy === "demote"} onClick={revokeAdminTier}>
                إلغاء رتبة المدير
              </Button>
            </div>
          )
        ) : isEndUser ? (
          endTabs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا تملك صلاحيات على هذا الحساب.</p>
          ) : (
            <Tabs defaultValue={endTabs[0].v} className="mt-2">
              <TabsList className="flex w-full flex-wrap h-auto gap-1">
                {endTabs.map((t) => <TabsTrigger key={t.v} value={t.v} className="text-xs">{t.l}</TabsTrigger>)}
              </TabsList>

              {showAccount && (
                <TabsContent value="account" className="space-y-4 py-2">
                  {can("users.suspend") && (
                    <div className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">حالة الحساب</span>
                        {statusBadge()}
                      </div>
                      {detail?.status_reason && <p className="text-xs text-muted-foreground">السبب: {detail.status_reason}</p>}
                      {effectiveSuspended ? (
                        <Button size="sm" variant="outline" disabled={busy === "reactivate"} onClick={doReactivate}>إعادة تفعيل الحساب</Button>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs">مدّة التعليق</Label>
                          <Select value={durationKey} onValueChange={setDurationKey}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{DURATIONS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
                          </Select>
                          {durationKey === "custom" && <Input type="datetime-local" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} />}
                          <Input placeholder="سبب التعليق (إلزامي)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
                          <Button size="sm" variant="destructive" disabled={busy === "suspend"} onClick={doSuspend}>
                            {durationKey === "permanent" ? "حظر الحساب" : "تطبيق التعليق"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {can("users.wallet_grant") && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">المميزات — رصيد المحفظة</span>
                        <span className="text-sm font-semibold">{detail?.wallet_balance ?? 0}</span>
                      </div>
                      <Input type="number" inputMode="decimal" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      <Input placeholder="ملاحظة (اختياري)" value={perkNote} onChange={(e) => setPerkNote(e.target.value)} />
                      <Button size="sm" disabled={busy === "grant"} onClick={doGrant}>إضافة رصيد</Button>
                    </div>
                  )}

                  {can("users.edit") && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <span className="text-sm font-medium">البيانات الشخصية</span>
                      <div className="space-y-1"><Label className="text-xs">الاسم</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} /></div>
                      {isMerchant && <div className="space-y-1"><Label className="text-xs">اسم النشاط</Label><Input value={pBusiness} onChange={(e) => setPBusiness(e.target.value)} /></div>}
                      <div className="space-y-1"><Label className="text-xs">المدينة</Label><Input value={pCity} onChange={(e) => setPCity(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">المديرية</Label><Input value={pDistrict} onChange={(e) => setPDistrict(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">العنوان</Label><Input value={pAddress} onChange={(e) => setPAddress(e.target.value)} /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">رقم الجوال</Label>
                        <Input value={detail?.phone || ""} disabled readOnly />
                        <p className="text-[11px] text-muted-foreground">تعديل الرقم يتطلب طبقة المصادقة — قريبًا.</p>
                      </div>
                      <Button size="sm" disabled={busy === "profile"} onClick={doSaveProfile}>حفظ البيانات</Button>
                    </div>
                  )}
                </TabsContent>
              )}

              {isMerchant && can("stores.manage") && (
                <TabsContent value="store" className="space-y-3 py-2">
                  {detail?.store ? (
                    <>
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{detail.store.name || "المتجر"}</span>
                          <Badge variant={detail.store.status === "active" ? "default" : "secondary"}>
                            {detail.store.status === "active" ? "مفعّل" : detail.store.status === "suspended" ? "معلّق" : detail.store.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">الحالة التشغيلية: {detail.store.is_open ? "مفتوح" : "مغلق"}</p>
                        {detail.store.status === "active" ? (
                          <Button size="sm" variant="destructive" disabled={busy === "store-status"} onClick={() => doStoreStatus("suspended")}>تعليق المتجر</Button>
                        ) : (
                          <Button size="sm" disabled={busy === "store-status"} onClick={() => doStoreStatus("active")}>تفعيل المتجر</Button>
                        )}
                      </div>
                      <div className="border rounded-lg p-3 space-y-2">
                        <Label className="text-xs">نسبة العمولة (%)</Label>
                        <Input type="number" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
                        <Button size="sm" disabled={busy === "store-commission"} onClick={doStoreCommission}>حفظ العمولة</Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">لا يوجد متجر مرتبط بهذا التاجر.</p>
                  )}
                </TabsContent>
              )}

              {can("users.notify") && (
                <TabsContent value="comm" className="space-y-2 py-2">
                  <div className="border rounded-lg p-3 space-y-2">
                    <span className="text-sm font-medium">إرسال إشعار للمستخدم</span>
                    <Input placeholder="العنوان" value={nTitle} onChange={(e) => setNTitle(e.target.value)} />
                    <Textarea placeholder="نص الإشعار" value={nBody} onChange={(e) => setNBody(e.target.value)} rows={3} />
                    <Button size="sm" disabled={busy === "notif"} onClick={doSendNotif}>إرسال الإشعار</Button>
                  </div>
                </TabsContent>
              )}

              {can("oversight.view") && (
                <>
                  <TabsContent value="activity" className="py-2"><AuditLogList filter={{ userId: user.user_id }} pageSize={20} /></TabsContent>
                  <TabsContent value="sessions" className="py-2"><LoginSessionsList userId={user.user_id} pageSize={20} /></TabsContent>
                  <TabsContent value="usage" className="py-2"><AppUsageList userId={user.user_id} pageSize={20} /></TabsContent>
                </>
              )}
            </Tabs>
          )
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

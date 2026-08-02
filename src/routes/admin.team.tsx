import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateTimeFull } from "@/lib/dateFormat";
import { Shield, UserPlus } from "lucide-react";
import { RolesDialog, STAFF_ROLES, ROLE_LABEL, type RolesDialogUser } from "@/components/admin/RolesDialog";

export const Route = createFileRoute("/admin/team")({ component: Page });

type UserRow = {
  user_id: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  user_kind: "staff" | "merchant" | "customer";
  roles: string[] | null;
  stores: any;
  total_count: number;
};

const PAGE_SIZE = 50;

const STAFF_ERR: Record<string, string> = {
  invalid_phone: "رقم الجوال غير صحيح (٩ إلى ١٥ رقمًا)",
  weak_password: "كلمة المرور يجب ألا تقل عن ٦ أحرف",
  name_required: "الاسم مطلوب",
  phone_taken: "رقم مسجّل مسبقًا (عميل/تاجر/موظف) — الموظف يُنشأ برقم جديد فقط",
  bundle_not_found: "مجموعة الصلاحيات غير موجودة",
  forbidden: "هذه العملية للمدير الرئيسي فقط",
  create_failed: "تعذّر إنشاء الحساب",
  profile_failed: "تعذّر حفظ بيانات الحساب",
  role_failed: "تعذّر تعيين الدور",
  auth_failed: "انتهت الجلسة، أعد تسجيل الدخول",
  server_error: "حدث خطأ في الخادم",
};

function Page() {
  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RolesDialogUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [role, debounced]);

  const load = async () => {
    setLoading(true);
    const params: any = {
      p_kind: "staff",
      p_category_slug: null,
      p_role: role,
      p_search: debounced.length >= 2 ? debounced : null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    };
    const { data, error } = await (supabase as any).rpc("admin_list_users", params);
    if (error) {
      toast.error(error.message);
      setRows([]); setTotal(0);
    } else {
      const list = (data as UserRow[]) || [];
      setRows(list);
      setTotal(list[0]?.total_count ?? 0);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [role, debounced, page]);

  const chips = useMemo(() => {
    const base: Array<{ key: string; label: string; active: boolean; onClick: () => void }> = [
      { key: "all", label: "الكل", active: role === null, onClick: () => setRole(null) },
    ];
    STAFF_ROLES.forEach((r) => {
      base.push({
        key: r.key,
        label: r.label,
        active: role === r.key,
        onClick: () => setRole(r.key),
      });
    });
    return base;
  }, [role]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell
      title="فريق الإدارة"
      action={
        <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4 ms-1" /> إضافة موظف
        </Button>
      }
    >
      <div className="mb-3 -mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max">
          {chips.map((c) => (
            <Button key={c.key} size="sm" variant={c.active ? "default" : "outline"} onClick={c.onClick} className="shrink-0">
              {c.label}
              {c.active && <Badge variant="secondary" className="mr-1 ms-1">{total}</Badge>}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <Input placeholder="ابحث بالاسم أو رقم الجوال" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا نتائج</p>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => (
            <Card key={u.user_id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{u.name || "—"}</p>
                    <Badge className="bg-violet-100 text-violet-700">
                      <Shield className="w-3 h-3 ms-1" />إدارة
                    </Badge>
                    {(u.roles || []).map((r) => (
                      <Badge key={r} variant="outline">{ROLE_LABEL[r] || r}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {u.phone || "—"} • مسجّل {formatDateTimeFull(u.created_at)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing({ user_id: u.user_id, name: u.name, phone: u.phone, roles: u.roles })}>
                  إدارة الصلاحيات
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            السابق
          </Button>
          <span className="text-xs text-muted-foreground">
            صفحة {page + 1} من {totalPages} • {total} نتيجة
          </span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </div>
      )}

      <RolesDialog user={editing} onClose={() => setEditing(null)} onChanged={load} />
      <AddStaffDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </AdminShell>
  );
}

function AddStaffDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [bundle, setBundle] = useState("");
  const [bundles, setBundles] = useState<{ bundle: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setPhone(""); setPassword(""); setName(""); setBundle(""); return; }
    (async () => {
      const { data } = await (supabase as any).rpc("admin_get_permission_catalog", {});
      setBundles((((data as any)?.bundles) || []).map((b: any) => ({ bundle: b.bundle, label: b.label })));
    })();
  }, [open]);

  const create = async () => {
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    if (!/^\d{9,15}$/.test(phone.replace(/\D/g, ""))) { toast.error("رقم الجوال غير صحيح"); return; }
    if (password.length < 6) { toast.error("كلمة المرور قصيرة"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-staff", {
      body: { phone, password, name: name.trim(), bundle: bundle || null },
    });
    setBusy(false);
    if (error) { toast.error("تعذّر الاتصال بالخادم"); return; }
    const res = data as { ok?: boolean; error?: string; warning?: string };
    if (res?.error) { toast.error(STAFF_ERR[res.error] || "تعذّر إنشاء الموظف"); return; }
    toast.success(res?.warning ? "تم إنشاء الموظف (راجع الصلاحيات)" : "تم إنشاء الموظف بنجاح");
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة موظف</DialogTitle>
          <DialogDescription>أنشئ حساب موظف جديدًا من الصفر وعيّن له مجموعة صلاحيات. لا يمكن ترقية عميل أو تاجر موجود.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الاسم</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">رقم الجوال</label>
            <Input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XXXXXXXX" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">كلمة المرور</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="٦ أحرف على الأقل" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">مجموعة الصلاحيات</label>
            <Select value={bundle || "__none"} onValueChange={(v) => setBundle(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="اختر مجموعة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">بدون (صفر صلاحيات)</SelectItem>
                {bundles.map((b) => <SelectItem key={b.bundle} value={b.bundle}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">أنشئ المجموعات من شاشة «إدارة الصلاحيات».</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={create} disabled={busy}>{busy ? "جارٍ الإنشاء…" : "إنشاء الموظف"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

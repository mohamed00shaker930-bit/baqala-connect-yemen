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
                    {u.phone || "—"} • مسجّل {fmtDate(u.created_at)}
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
      <AddStaffDialog open={addOpen} onClose={() => setAddOpen(false)} onGranted={load} />
    </AdminShell>
  );
}

function AddStaffDialog({ open, onClose, onGranted }: { open: boolean; onClose: () => void; onGranted: () => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [role, setRole] = useState<string>("support");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch(""); setDebounced(""); setResults([]); setSelected(null); setRole("support");
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) { setResults([]); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("admin_list_users", {
        p_kind: "non_staff",
        p_category_slug: null,
        p_role: null,
        p_search: debounced,
        p_limit: 20,
        p_offset: 0,
      });
      setLoading(false);
      if (error) { toast.error(error.message); setResults([]); return; }
      setResults((data as UserRow[]) || []);
    })();
  }, [debounced, open]);

  const grant = async () => {
    if (!selected) return;
    setGranting(true);
    const { error } = await (supabase as any).rpc("admin_set_user_role", { _uid: selected.user_id, _role: role, _grant: true });
    setGranting(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("forbidden: super_admin only")) toast.error("هذه الصلاحية للمدير الرئيسي فقط");
      else toast.error(msg);
      return;
    }
    toast.success("تم منح الدور");
    onGranted();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة موظف</DialogTitle>
          <DialogDescription>ابحث عن مستخدم بين العملاء والتجار ثم امنحه دوراً إدارياً.</DialogDescription>
        </DialogHeader>
        {!selected ? (
          <div className="space-y-3">
            <Input placeholder="ابحث بالاسم أو رقم الجوال" value={search} onChange={(e) => setSearch(e.target.value)} />
            {loading ? (
              <p className="text-center text-muted-foreground py-4 text-sm">جاري البحث...</p>
            ) : debounced.length < 2 ? (
              <p className="text-center text-muted-foreground py-4 text-xs">اكتب حرفين على الأقل</p>
            ) : results.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">لا نتائج</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1">
                {results.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelected(u)}
                    className="w-full text-right border rounded-lg p-2 hover:bg-accent"
                  >
                    <p className="text-sm font-medium">{u.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <p className="text-sm font-medium">{selected.name || "—"}</p>
              <p className="text-xs text-muted-foreground">{selected.phone || "—"}</p>
              <button className="text-xs text-primary mt-1" onClick={() => setSelected(null)}>تغيير</button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">الدور</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={grant} disabled={!selected || granting}>منح الدور</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

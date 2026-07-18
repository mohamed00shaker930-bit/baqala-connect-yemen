import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { Store as StoreIcon, User as UserIcon } from "lucide-react";
import { RolesDialog, type RolesDialogUser } from "@/components/admin/RolesDialog";

export const Route = createFileRoute("/admin/users")({ component: Page });

type UserRow = {
  user_id: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  user_kind: "staff" | "merchant" | "customer";
  roles: string[] | null;
  stores: Array<{ id: string; name: string; status: string; category_slug: string | null; category_name: string | null }> | null;
  total_count: number;
};

type BizCat = { id: string; slug: string; name_ar: string; sort_order: number; is_active: boolean };

const KIND_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  merchant: { label: "تاجر", cls: "bg-emerald-100 text-emerald-700", icon: StoreIcon },
  customer: { label: "عميل", cls: "bg-sky-100 text-sky-700", icon: UserIcon },
};

const STORE_STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار",
  active: "مفعّل",
  suspended: "معلّق",
  rejected: "مرفوض",
};

const PAGE_SIZE = 50;

function Page() {
  const [cats, setCats] = useState<BizCat[]>([]);
  const [filter, setFilter] = useState<{ kind: "all" | "customer" | "merchant"; slug?: string | null }>({ kind: "all" });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RolesDialogUser | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("business_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setCats(data || []);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [filter, debounced]);

  const load = async () => {
    setLoading(true);
    const params: any = {
      p_kind: filter.kind === "all" ? null : filter.kind,
      p_category_slug: filter.kind === "merchant" ? filter.slug ?? null : null,
      p_role: null,
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
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, debounced, page]);

  const chips = useMemo(() => {
    const base: Array<{ key: string; label: string; active: boolean; onClick: () => void }> = [
      { key: "all", label: "الكل", active: filter.kind === "all", onClick: () => setFilter({ kind: "all" }) },
      { key: "staff", label: "الإدارة", active: filter.kind === "staff", onClick: () => setFilter({ kind: "staff" }) },
      { key: "customer", label: "العملاء", active: filter.kind === "customer", onClick: () => setFilter({ kind: "customer" }) },
    ];
    cats.forEach((c) => {
      base.push({
        key: `cat-${c.slug}`,
        label: c.name_ar,
        active: filter.kind === "merchant" && filter.slug === c.slug,
        onClick: () => setFilter({ kind: "merchant", slug: c.slug }),
      });
    });
    return base;
  }, [cats, filter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell title="المستخدمون">
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
          {rows.map((u) => {
            const kind = KIND_BADGE[u.user_kind];
            const KindIcon = kind.icon;
            return (
              <Card key={u.user_id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{u.name || "—"}</p>
                      <Badge className={kind.cls}>
                        <KindIcon className="w-3 h-3 ms-1" />{kind.label}
                      </Badge>
                      {u.user_kind === "staff" && (u.roles || []).map((r) => (
                        <Badge key={r} variant="outline">{ROLE_LABEL[r] || r}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {u.phone || "—"} • مسجّل {fmtDate(u.created_at)}
                    </p>
                    {u.user_kind === "merchant" && (u.stores?.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-1">
                        {u.stores!.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-medium">{s.name}</span>
                            {s.category_name && <Badge variant="secondary">{s.category_name}</Badge>}
                            <Badge variant="outline">{STORE_STATUS_LABEL[s.status] || s.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                    إدارة الصلاحيات
                  </Button>
                </div>
              </Card>
            );
          })}
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
    </AdminShell>
  );
}


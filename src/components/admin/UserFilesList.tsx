import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateTimeFull } from "@/lib/dateFormat";
import { roleLabel } from "@/lib/audit-dict";

type UserFile = {
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  user_role: string | null;
  registered_at: string | null;
  total_opens: number;
  is_open_now: boolean;
  last_opened_at: string | null;
  total_logins: number;
  active_sessions: number;
  last_login_at: string | null;
  total_actions: number;
  last_action_at: string | null;
  last_activity_at: string | null;
  total_count: number;
};

const ROLE_CLS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-indigo-100 text-indigo-700",
  operations: "bg-blue-100 text-blue-700",
  support: "bg-teal-100 text-teal-700",
  finance: "bg-orange-100 text-orange-700",
  merchant: "bg-emerald-100 text-emerald-700",
  customer: "bg-sky-100 text-sky-700",
  system: "bg-slate-200 text-slate-700",
  unknown: "bg-muted text-muted-foreground",
};

const FILTERS = [
  { v: "all", l: "الكل" },
  { v: "open", l: "مفتوح الآن" },
] as const;

const PAGE_SIZE = 20;

export function UserFilesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"all" | "open">("all");
  const [rows, setRows] = useState<UserFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [debounced, status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("admin_list_user_files", {
        p_search: debounced || null,
        p_status: status === "all" ? null : status,
        p_user_id: null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (cancelled) return;
      if (error) {
        setRows([]); setTotal(0);
      } else {
        const list = (data as UserFile[]) || [];
        setRows(list);
        setTotal(list[0]?.total_count ?? 0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-3">
        <Input
          placeholder="ابحث بالاسم أو رقم الجوال"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.v}
              size="sm"
              variant={status === f.v ? "default" : "outline"}
              onClick={() => setStatus(f.v)}
            >
              {f.l}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground ms-auto">مستخدم {total}</span>
        </div>
      </Card>

      {loading && rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">جاري التحميل...</p>
      ) : !loading && rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">لا توجد نتائج</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <button
              key={r.user_id}
              type="button"
              onClick={() => navigate({ to: "/admin/user-file/$userId", params: { userId: r.user_id } })}
              className="w-full text-right"
            >
              <Card className="p-3 hover:bg-accent/40 transition-colors cursor-pointer">
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.user_name || "غير معروف"}</span>
                      {r.user_phone && <span className="text-xs text-muted-foreground">{r.user_phone}</span>}
                      <Badge variant="secondary" className={`text-[10px] ${ROLE_CLS[r.user_role || "unknown"] || ROLE_CLS.unknown}`}>
                        {roleLabel(r.user_role)}
                      </Badge>
                      {r.is_open_now ? (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">مفتوح الآن</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">مغلق</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      <span>فتح التطبيق: {r.total_opens} مرة</span>
                      {" • "}
                      <span>آخر فتح: {r.last_opened_at ? formatDateTimeFull(r.last_opened_at) : "لم يفتح التطبيق بعد"}</span>
                      {" • "}
                      <span>تسجيلات الدخول: {r.total_logins}</span>
                      {" • "}
                      <span>العمليات: {r.total_actions}</span>
                    </p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>السابق</Button>
          <span className="text-xs text-muted-foreground">صفحة {page + 1} من {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}

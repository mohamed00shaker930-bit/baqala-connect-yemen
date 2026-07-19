import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { formatDateTimeFull, formatTimeAgo } from "@/lib/dateFormat";

export type LoginSession = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_phone: string | null;
  login_at: string;
  logout_at: string | null;
  last_seen_at: string | null;
  logout_type: "signout" | "expired" | null;
  ip: string | null;
  user_agent: string | null;
  is_active: boolean;
  total_count: number;
};

export function deviceLabel(ua: string | null): string {
  if (!ua) return "متصفح";
  if (/Android/i.test(ua)) return "جوال أندرويد";
  if (/iPhone|iPad|iPod/i.test(ua)) return "آيفون";
  return "متصفح";
}

export function LoginSessionsList({
  userId = null,
  status = null,
  pageSize = 20,
  showUser = false,
  onTotal,
}: {
  userId?: string | null;
  status?: "active" | "ended" | null;
  pageSize?: number;
  showUser?: boolean;
  onTotal?: (n: number) => void;
}) {
  const [rows, setRows] = useState<LoginSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPage(0); }, [userId, status, pageSize]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("admin_list_login_sessions", {
        p_user_id: userId,
        p_status: status,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      if (cancelled) return;
      if (error) {
        setRows([]); setTotal(0); onTotal?.(0);
      } else {
        const list = (data as LoginSession[]) || [];
        setRows(list);
        const t = list[0]?.total_count ?? 0;
        setTotal(t); onTotal?.(t);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, status, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && rows.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">جاري التحميل...</p>;
  }
  if (!loading && rows.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">لا توجد تسجيلات دخول</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const device = deviceLabel(r.user_agent);
        return (
          <Card key={r.id} className="p-3">
            {showUser && (
              <div className="flex items-center gap-2 flex-wrap mb-2 pb-2 border-b">
                {r.user_id ? (
                  <Link
                    to="/admin/user-file/$userId"
                    params={{ userId: r.user_id }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{r.user_name || "غير معروف"}</span>
                    {r.user_phone && <span className="text-xs text-muted-foreground font-normal">{r.user_phone}</span>}
                  </Link>
                ) : (
                  <>
                    <span className="text-sm font-semibold">{r.user_name || "غير معروف"}</span>
                    {r.user_phone && <span className="text-xs text-muted-foreground">{r.user_phone}</span>}
                  </>
                )}
              </div>
            )}
            <div className="flex items-start gap-2 flex-wrap">
              {r.is_active ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">جلسة نشطة</Badge>
              ) : r.logout_type === "expired" ? (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">انتهت الجلسة</Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">تسجيل خروج</Badge>
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs"><span className="text-muted-foreground">دخول:</span> {formatDateTimeFull(r.login_at)}</p>
                {r.is_active ? (
                  r.last_seen_at && <p className="text-xs"><span className="text-muted-foreground">آخر نشاط:</span> {formatTimeAgo(r.last_seen_at)}</p>
                ) : (
                  r.logout_at && <p className="text-xs"><span className="text-muted-foreground">خروج:</span> {formatDateTimeFull(r.logout_at)}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {device}{r.ip ? ` • ${r.ip}` : ""}
                </p>
              </div>
            </div>
          </Card>
        );
      })}

      {total > pageSize && (
        <div className="flex items-center justify-between mt-3 gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>السابق</Button>
          <span className="text-xs text-muted-foreground">صفحة {page + 1} من {totalPages} • {total} جلسة</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}

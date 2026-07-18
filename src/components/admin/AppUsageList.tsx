import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeFull, formatTimeAgo } from "@/lib/dateFormat";
import { deviceLabel } from "@/components/admin/LoginSessionsList";

export type AppUsageRow = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_phone: string | null;
  opened_at: string;
  closed_at: string | null;
  close_type: "closed" | "timeout" | null;
  last_ping_at: string | null;
  user_agent: string | null;
  is_open: boolean;
  duration_seconds: number | null;
  total_count: number;
};

function formatDuration(sec: number | null): string {
  if (sec == null || sec < 0) return "";
  if (sec < 60) return "أقل من دقيقة";
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs} ساعة`;
  return `${hrs} ساعة و ${rem} دقيقة`;
}

export function AppUsageList({
  userId = null,
  status = null,
  pageSize = 20,
  showUser = false,
  onTotal,
}: {
  userId?: string | null;
  status?: "open" | "closed" | null;
  pageSize?: number;
  showUser?: boolean;
  onTotal?: (n: number) => void;
}) {
  const [rows, setRows] = useState<AppUsageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPage(0); }, [userId, status, pageSize]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("admin_list_app_usage", {
        p_user_id: userId,
        p_status: status,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      if (cancelled) return;
      if (error) {
        setRows([]); setTotal(0); onTotal?.(0);
      } else {
        const list = (data as AppUsageRow[]) || [];
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
    return <p className="text-center text-muted-foreground py-8 text-sm">لا توجد سجلات استخدام</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const device = deviceLabel(r.user_agent);
        return (
          <Card key={r.id} className="p-3">
            {showUser && (
              <div className="flex items-center gap-2 flex-wrap mb-2 pb-2 border-b">
                <span className="text-sm font-semibold">{r.user_name || "غير معروف"}</span>
                {r.user_phone && <span className="text-xs text-muted-foreground">{r.user_phone}</span>}
              </div>
            )}
            <div className="flex items-start gap-2 flex-wrap">
              {r.is_open ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">مفتوح الآن</Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">مغلق</Badge>
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs"><span className="text-muted-foreground">فتح:</span> {formatDateTimeFull(r.opened_at)}</p>
                {r.is_open ? (
                  r.last_ping_at && <p className="text-xs"><span className="text-muted-foreground">آخر نشاط:</span> {formatTimeAgo(r.last_ping_at)}</p>
                ) : (
                  <>
                    {r.closed_at && <p className="text-xs"><span className="text-muted-foreground">إغلاق:</span> {formatDateTimeFull(r.closed_at)}</p>}
                    {r.duration_seconds != null && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">المدة:</span> {formatDuration(r.duration_seconds)}
                        {r.close_type === "timeout" && <span className="text-[11px] text-muted-foreground/70 ms-1">(انقطاع)</span>}
                      </p>
                    )}
                  </>
                )}
                <p className="text-[11px] text-muted-foreground">{device}</p>
              </div>
            </div>
          </Card>
        );
      })}

      {total > pageSize && (
        <div className="flex items-center justify-between mt-3 gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>السابق</Button>
          <span className="text-xs text-muted-foreground">صفحة {page + 1} من {totalPages} • {total} سجل</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}

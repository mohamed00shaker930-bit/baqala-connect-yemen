import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { formatDateTimeFull } from "@/lib/dateFormat";
import { tableLabel, roleLabel, fieldLabel, formatAuditValue } from "@/lib/audit-dict";

export type AuditLog = {
  id: string;
  seq?: number;
  user_id: string | null;
  user_name: string | null;
  user_phone?: string | null;
  user_role: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string | null;
  record_label: string | null;
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  created_at: string;
  total_count?: number;
};

export type AuditFilter = {
  userId?: string | null;
  userName?: string | null;
  roleGroup?: "customer" | "merchant" | "staff" | "system" | null;
  action?: string | null;
  tableName?: string | null;
  from?: string | null;
  to?: string | null;
};


const ACTION_META: Record<string, { label: string; cls: string }> = {
  INSERT: { label: "إضافة", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  UPDATE: { label: "تعديل", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  DELETE: { label: "حذف", cls: "bg-red-100 text-red-700 border-red-200" },
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

export function AuditLogList({
  filter,
  pageSize = 20,
  showUser = false,
}: {
  filter: AuditFilter;
  pageSize?: number;
  showUser?: boolean;
}) {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { setPage(0); }, [
    filter.userId, filter.userName, filter.roleGroup, filter.action, filter.tableName, filter.from, filter.to,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const search = filter.userName && filter.userName.trim().length >= 2 ? filter.userName.trim() : null;
      const { data, error } = await (supabase as any).rpc("admin_list_audit_logs", {
        p_search: search,
        p_user_id: filter.userId ?? null,
        p_role_group: filter.roleGroup ?? null,
        p_action: filter.action ?? null,
        p_table: filter.tableName ?? null,
        p_from: filter.from ?? null,
        p_to: filter.to ?? null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      if (cancelled) return;
      if (error) {
        setRows([]); setTotal(0);
      } else {
        const list = (data as AuditLog[]) || [];
        setRows(list);
        setTotal(list[0]?.total_count ?? 0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [filter.userId, filter.userName, filter.roleGroup, filter.action, filter.tableName, filter.from, filter.to, page, pageSize]);


  const toggle = (id: string) => {
    setExpanded((s) => {
      const nx = new Set(s);
      if (nx.has(id)) nx.delete(id); else nx.add(id);
      return nx;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && rows.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">جاري التحميل...</p>;
  }
  if (!loading && rows.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">لا يوجد نشاط مسجّل بعد</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const meta = ACTION_META[r.action] || { label: r.action, cls: "bg-muted" };
        const isOpen = expanded.has(r.id);
        const fields = (r.changed_fields || []).filter(Boolean);
        return (
          <Card key={r.id} className="p-3">
            <div className="flex items-start gap-2 flex-wrap">
              <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  <span className="text-muted-foreground">{tableLabel(r.table_name)}</span>
                  {r.record_label ? <> — <span>{r.record_label}</span></> : null}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTimeFull(r.created_at)}</p>
                {showUser && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {r.user_id ? (
                      <Link
                        to="/admin/user-file/$userId"
                        params={{ userId: r.user_id }}
                        className="inline-flex items-center gap-1 text-xs hover:underline text-primary"
                      >
                        <User className="w-3 h-3" />
                        <span>{r.user_name || "—"}</span>
                        {r.user_phone && <span className="text-[11px] text-muted-foreground">{r.user_phone}</span>}
                      </Link>
                    ) : (
                      <>
                        <span className="text-xs">{r.user_name || "—"}</span>
                        {r.user_phone && <span className="text-[11px] text-muted-foreground">{r.user_phone}</span>}
                      </>
                    )}
                    <Badge variant="secondary" className={`text-[10px] ${ROLE_CLS[r.user_role || "unknown"] || ROLE_CLS.unknown}`}>
                      {roleLabel(r.user_role)}
                    </Badge>
                  </div>
                )}


              </div>
              {r.action === "UPDATE" && fields.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => toggle(r.id)} className="h-7 px-2">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="text-xs mr-1">{fields.length} حقل</span>
                </Button>
              )}
            </div>
            {isOpen && r.action === "UPDATE" && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                {fields.map((f) => (
                  <div key={f} className="text-xs flex items-start gap-2 flex-wrap">
                    <span className="font-medium min-w-[80px]">{fieldLabel(f)}:</span>
                    <span className="text-muted-foreground line-through">{formatAuditValue(r.old_data?.[f])}</span>
                    <span className="text-muted-foreground">←</span>
                    <span className="text-foreground font-medium">{formatAuditValue(r.new_data?.[f])}</span>
                  </div>
                ))}
              </div>
            )}
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeFull, formatTimeAgo } from "@/lib/dateFormat";
import { roleLabel } from "@/lib/audit-dict";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { LoginSessionsList } from "@/components/admin/LoginSessionsList";
import { AppUsageList } from "@/components/admin/AppUsageList";
import { ArrowRight, Activity, LogIn, Smartphone, ListChecks, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/user-file/$userId")({ component: Page });

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

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold mt-1 truncate">{value}</p>
    </Card>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 mt-4">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Page() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<UserFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("admin_list_user_files", {
        p_search: null,
        p_status: null,
        p_user_id: userId,
        p_limit: 1,
        p_offset: 0,
      });
      if (cancelled) return;
      if (error) {
        setRow(null);
      } else {
        const list = (data as UserFile[]) || [];
        setRow(list[0] ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const filter = { userId } as any;

  return (
    <AdminShell
      title="ملف المستخدم"
      action={
        <Button size="sm" variant="ghost" className="text-background hover:bg-background/10" onClick={() => navigate({ to: "/admin/audit" })}>
          <ArrowRight className="w-4 h-4 ms-1" /> رجوع
        </Button>
      }
    >
      {loading ? (
        <p className="text-center text-muted-foreground py-8 text-sm">جاري التحميل...</p>
      ) : !row ? (
        <p className="text-center text-muted-foreground py-8 text-sm">لم يتم العثور على المستخدم</p>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold">{row.user_name || "غير معروف"}</h2>
                  {row.is_open_now && (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">مفتوح الآن</Badge>
                  )}
                </div>
                {row.user_phone && <p className="text-xs text-muted-foreground mt-1">{row.user_phone}</p>}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <Badge variant="secondary" className={`text-[10px] ${ROLE_CLS[row.user_role || "unknown"] || ROLE_CLS.unknown}`}>
                    {roleLabel(row.user_role)}
                  </Badge>
                  {row.registered_at && (
                    <span className="text-[11px] text-muted-foreground">تاريخ التسجيل: {formatDateTimeFull(row.registered_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <StatCard label="العمليات" value={row.total_actions} icon={ListChecks} />
            <StatCard label="تسجيلات الدخول" value={row.total_logins} icon={LogIn} />
            <StatCard label="مرات فتح التطبيق" value={row.total_opens} icon={Smartphone} />
            <StatCard label="آخر نشاط" value={row.last_activity_at ? formatTimeAgo(row.last_activity_at) : "—"} icon={Clock} />
          </div>

          <Section title="سجل العمليات" icon={Activity}>
            <AuditLogList filter={filter} pageSize={10} />
          </Section>

          <Section title="تسجيلات الدخول والخروج" icon={LogIn}>
            <LoginSessionsList userId={userId} pageSize={10} />
          </Section>

          <Section title="فتح وإغلاق التطبيق" icon={Smartphone}>
            <AppUsageList userId={userId} pageSize={10} />
          </Section>
        </>
      )}
    </AdminShell>
  );
}

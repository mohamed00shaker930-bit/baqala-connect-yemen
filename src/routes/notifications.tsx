import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications, markAllRead, markRead, type AppNotification } from "@/lib/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck, ShoppingBag, Undo2, Wallet, Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({ ssr: false, component: NotificationsPage });

const ICONS: Record<string, any> = { order: ShoppingBag, return: Undo2, wallet: Wallet, info: Bell };

function fmt(d: string) {
  const dt = new Date(d);
  const diffMin = Math.round((Date.now() - dt.getTime()) / 60000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `قبل ${diffMin} د`;
  if (diffMin < 1440) return `قبل ${Math.round(diffMin / 60)} س`;
  return dt.toLocaleDateString("ar");
}

function NotificationsPage() {
  const { data } = useNotifications();
  const qc = useQueryClient();
  const nav = useNavigate();
  const list = data ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  const open = async (n: AppNotification) => {
    if (!n.read_at) { await markRead(n.id); qc.invalidateQueries({ queryKey: ["notifications"] }); }
    if (n.link) nav({ to: n.link as any });
  };

  return (
    <CustomerShell title="الإشعارات">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} غير مقروء` : "لا جديد"}</p>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={async () => { await markAllRead(); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
            <CheckCheck className="w-4 h-4 ml-1" /> تعليم الكل
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {list.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد إشعارات بعد</Card>}
        {list.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          return (
            <Card key={n.id} onClick={() => open(n)}
              className={`p-3 flex gap-3 cursor-pointer transition ${!n.read_at ? "bg-primary/5 border-primary/30" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{fmt(n.created_at)}</p>
              </div>
              {!n.read_at && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
            </Card>
          );
        })}
      </div>
    </CustomerShell>
  );
}

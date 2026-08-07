import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, markAllRead, markRead, type AppNotification } from "@/lib/notifications";
import { formatTimeAgo } from "@/lib/dateFormat";
import { CheckCheck, Megaphone, ShoppingBag, Undo2, Wallet, Bell, UserRound, Users, Inbox, Search } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AdminNotificationsPage,
});

const ICONS: Record<string, any> = { order: ShoppingBag, return: Undo2, wallet: Wallet, info: Bell };

type OversightRow = AppNotification & { user_id: string; owner_name: string | null; owner_phone: string | null };

function AdminNotificationsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [search, setSearch] = useState("");

  const { data: mine } = useNotifications();
  const myList = mine ?? [];
  const myUnread = myList.filter((n) => !n.read_at).length;

  const { data: me } = useQuery({
    queryKey: ["admin-notif-me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("name, phone").eq("id", user.id).maybeSingle();
      return { name: data?.name ?? null, phone: data?.phone ?? null };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-notif-stats"],
    queryFn: async () => {
      const total = await supabase.from("notifications").select("id", { count: "exact", head: true });
      const unread = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      return { total: total.count ?? 0, unread: unread.count ?? 0 };
    },
  });

  const { data: allRows } = useQuery({
    queryKey: ["admin-notif-all"],
    queryFn: async (): Promise<OversightRow[]> => {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = (notifs as any[]) ?? [];
      const ids = [...new Set(rows.map((n) => n.user_id).filter(Boolean))];
      const owners: Record<string, { name: string | null; phone: string | null }> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, name, phone").in("id", ids);
        for (const p of (profs as any[]) ?? []) owners[p.id] = { name: p.name, phone: p.phone };
      }
      return rows.map((n) => ({
        ...n,
        owner_name: owners[n.user_id]?.name ?? null,
        owner_phone: owners[n.user_id]?.phone ?? null,
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = allRows ?? [];
    if (!q) return rows;
    return rows.filter((r) =>
      (r.title || "").toLowerCase().includes(q) ||
      (r.body || "").toLowerCase().includes(q) ||
      (r.owner_name || "").toLowerCase().includes(q) ||
      (r.owner_phone || "").includes(q)
    );
  }, [allRows, search]);

  const openMine = async (n: AppNotification) => {
    if (!n.read_at) { await markRead(n.id); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["admin-notif-stats"] }); }
    if (n.link) nav({ to: n.link as any });
  };

  return (
    <AdminShell title="مركز الإشعارات" action={
      <Button asChild size="sm" variant="secondary">
        <Link to="/admin/broadcast"><Megaphone className="w-4 h-4 ml-1" /> إرسال إشعار</Link>
      </Button>
    }>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <UserRound className="w-3.5 h-3.5" />
        <span>الحساب: {me?.name?.trim() || "بدون اسم"}</span>
        {me?.phone && <span dir="ltr">({me.phone})</span>}
        <Badge variant="secondary" className="text-[10px]">إدارة</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">إشعارات النظام</p>
          <p className="text-lg font-bold">{stats?.total ?? "—"}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">غير مقروء (الجميع)</p>
          <p className="text-lg font-bold text-warning">{stats?.unread ?? "—"}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[11px] text-muted-foreground">غير مقروء لديك</p>
          <p className="text-lg font-bold text-primary">{myUnread}</p>
        </Card>
      </div>

      <Tabs defaultValue="mine" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mine" className="gap-1"><Inbox className="w-4 h-4" /> إشعاراتي</TabsTrigger>
          <TabsTrigger value="all" className="gap-1"><Users className="w-4 h-4" /> كل المستخدمين</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{myUnread > 0 ? `${myUnread} غير مقروء` : "لا جديد"}</p>
            {myUnread > 0 && (
              <Button size="sm" variant="outline" onClick={async () => { await markAllRead(); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["admin-notif-stats"] }); }}>
                <CheckCheck className="w-4 h-4 ml-1" /> تعليم الكل
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {myList.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد إشعارات بعد</Card>}
            {myList.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <Card key={n.id} onClick={() => openMine(n)}
                  className={`p-3 flex gap-3 cursor-pointer transition ${!n.read_at ? "bg-primary/5 border-primary/30" : ""}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{formatTimeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-3">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pr-9" placeholder="ابحث بالعنوان أو النص أو اسم/رقم المستخدم..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">آخر 100 إشعار مرسل في النظام — للمراقبة فقط، وحالة القراءة تخص صاحب الإشعار.</p>
          <div className="space-y-2">
            {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا نتائج</Card>}
            {filtered.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <Card key={n.id} className="p-3 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{n.title}</p>
                      {!n.read_at ? <Badge variant="outline" className="text-[10px]">غير مقروء</Badge> : <Badge variant="secondary" className="text-[10px]">مقروء</Badge>}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      <UserRound className="w-3 h-3 inline ml-0.5" />
                      {n.owner_name?.trim() || "بدون اسم"}
                      {n.owner_phone && <span dir="ltr"> ({n.owner_phone})</span>}
                      {" — "}{formatTimeAgo(n.created_at)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

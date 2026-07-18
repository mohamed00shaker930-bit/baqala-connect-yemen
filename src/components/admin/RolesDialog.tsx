import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { LoginSessionsList } from "@/components/admin/LoginSessionsList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const STAFF_ROLES = [
  { key: "super_admin", label: "مدير رئيسي" },
  { key: "admin", label: "مدير" },
  { key: "operations", label: "عمليات" },
  { key: "support", label: "خدمة عملاء" },
  { key: "finance", label: "مالية" },
] as const;

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(STAFF_ROLES.map((r) => [r.key, r.label]));

export type RolesDialogUser = {
  user_id: string;
  name: string | null;
  phone: string | null;
  roles: string[] | null;
};

export function RolesDialog({ user, onClose, onChanged }: { user: RolesDialogUser | null; onClose: () => void; onChanged: () => void }) {
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setRoles(new Set(user?.roles || []));
  }, [user]);

  if (!user) return null;

  const toggle = async (role: string, next: boolean) => {
    setBusy(role);
    const { error } = await (supabase as any).rpc("admin_set_user_role", { _uid: user.user_id, _role: role, _grant: next });
    setBusy(null);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("forbidden: super_admin only")) toast.error("هذه الصلاحية للمدير الرئيسي فقط");
      else if (msg.includes("cannot remove the last super_admin")) toast.error("لا يمكن إزالة آخر مدير رئيسي");
      else toast.error(msg);
      return;
    }
    const nx = new Set(roles);
    if (next) nx.add(role); else nx.delete(role);
    setRoles(nx);
    toast.success("تم التحديث");
    onChanged();
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل المستخدم</DialogTitle>
          <DialogDescription>
            {user.name || "—"} • {user.phone || "—"}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="roles" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="roles">الصلاحيات</TabsTrigger>
            <TabsTrigger value="activity">سجل النشاط</TabsTrigger>
          </TabsList>
          <TabsContent value="roles" className="space-y-3 py-2">
            {STAFF_ROLES.map((r) => {
              const checked = roles.has(r.key);
              return (
                <div key={r.key} className="flex items-center justify-between border rounded-lg p-3">
                  <Label htmlFor={`role-${r.key}`} className="text-sm">{r.label}</Label>
                  <Switch
                    id={`role-${r.key}`}
                    checked={checked}
                    disabled={busy === r.key}
                    onCheckedChange={(v) => toggle(r.key, v)}
                  />
                </div>
              );
            })}
          </TabsContent>
          <TabsContent value="activity" className="py-2">
            <AuditLogList filter={{ userId: user.user_id }} pageSize={20} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/permissions")({ component: Page });

type PermDef = { perm: string; grp: string; grp_label: string; label: string; super_only: boolean; sort: number };
type Bundle = { bundle: string; label: string; sort: number; perms: string[] };
type Catalog = { defs: PermDef[]; bundles: Bundle[] };

function groupDefs(defs: PermDef[]) {
  const g: { key: string; label: string; items: PermDef[] }[] = [];
  defs.forEach((d) => {
    let x = g.find((e) => e.key === d.grp);
    if (!x) { x = { key: d.grp, label: d.grp_label, items: [] }; g.push(x); }
    x.items.push(d);
  });
  return g;
}

function PermPicker({ groups, selected, onToggle }: { groups: ReturnType<typeof groupDefs>; selected: Set<string>; onToggle: (perm: string, next: boolean) => void }) {
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key} className="border rounded-lg p-2 space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground">{g.label}</span>
          {g.items.map((d) => (
            <div key={d.perm} className="flex items-center justify-between gap-2">
              <span className="text-sm flex items-center gap-1">{d.label}{d.super_only && <span className="text-[10px] text-muted-foreground">(للرئيسي فقط)</span>}</span>
              <Switch checked={d.super_only ? false : selected.has(d.perm)} disabled={d.super_only} onCheckedChange={(v) => onToggle(d.perm, v)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Page() {
  const [isSuper, setIsSuper] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [edited, setEdited] = useState<Record<string, Set<string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newPerms, setNewPerms] = useState<Set<string>>(new Set());

  const rpc = (fn: string, params: Record<string, unknown>) => (supabase as any).rpc(fn, params);

  const loadCatalog = useCallback(async () => {
    const { data, error } = await rpc("admin_get_permission_catalog", {});
    if (error) { toast.error(error.message || "تعذّر التحميل"); return; }
    const c = data as Catalog;
    setCatalog(c);
    const e: Record<string, Set<string>> = {};
    (c.bundles || []).forEach((b) => { e[b.bundle] = new Set(b.perms || []); });
    setEdited(e);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await rpc("my_permissions", {});
      const sup = !!data && data.super === true;
      setIsSuper(sup);
      if (sup) await loadCatalog();
    })();
  }, [loadCatalog]);

  if (isSuper === false) {
    return <AdminShell title="إدارة الصلاحيات"><p className="text-center text-muted-foreground py-10">هذه الشاشة متاحة للمدير الرئيسي فقط.</p></AdminShell>;
  }

  const groups = groupDefs(catalog?.defs || []);

  const toggleEdited = (bundle: string, perm: string, next: boolean) => {
    setEdited((prev) => {
      const s = new Set(prev[bundle] || []); if (next) s.add(perm); else s.delete(perm);
      return { ...prev, [bundle]: s };
    });
  };
  const saveBundle = async (bundle: string) => {
    setBusy("save-" + bundle);
    const { error } = await rpc("admin_update_bundle", { p_bundle: bundle, p_perms: Array.from(edited[bundle] || []) });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر الحفظ"); return; }
    toast.success("تم حفظ المجموعة"); await loadCatalog();
  };
  const deleteBundle = async (bundle: string) => {
    setBusy("del-" + bundle);
    const { error } = await rpc("admin_delete_bundle", { p_bundle: bundle });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر الحذف"); return; }
    toast.success("تم حذف المجموعة"); await loadCatalog();
  };
  const createBundle = async () => {
    if (!newLabel.trim()) { toast.error("اسم المجموعة مطلوب"); return; }
    if (newPerms.size === 0) { toast.error("اختر صلاحية واحدة على الأقل"); return; }
    const key = "b_" + Math.random().toString(36).slice(2, 10);
    setBusy("create");
    const { error } = await rpc("admin_create_bundle", { p_bundle: key, p_label: newLabel.trim(), p_perms: Array.from(newPerms) });
    setBusy(null);
    if (error) { toast.error(error.message || "تعذّر الإنشاء"); return; }
    toast.success("تم إنشاء المجموعة"); setNewLabel(""); setNewPerms(new Set()); await loadCatalog();
  };

  return (
    <AdminShell title="إدارة الصلاحيات">
      <Card className="p-3 mb-4 space-y-3">
        <div className="flex items-center gap-2"><Plus className="w-4 h-4" /><span className="font-medium">إنشاء مجموعة صلاحيات جديدة</span></div>
        <Input placeholder="اسم المجموعة (مثال: مدراء أقسام)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <PermPicker groups={groups} selected={newPerms} onToggle={(p, n) => setNewPerms((prev) => { const s = new Set(prev); if (n) s.add(p); else s.delete(p); return s; })} />
        <Button size="sm" disabled={busy === "create"} onClick={createBundle}>إنشاء المجموعة</Button>
      </Card>

      {!catalog ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : (catalog.bundles || []).length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا توجد مجموعات بعد.</p>
      ) : (
        <div className="space-y-3">
          {catalog.bundles.map((b) => (
            <Card key={b.bundle} className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.label}</span>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === "del-" + b.bundle} onClick={() => deleteBundle(b.bundle)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <PermPicker groups={groups} selected={edited[b.bundle] || new Set()} onToggle={(p, n) => toggleEdited(b.bundle, p, n)} />
              <Button size="sm" disabled={busy === "save-" + b.bundle} onClick={() => saveBundle(b.bundle)}>
                <Save className="w-4 h-4 ms-1" /> حفظ التغييرات
              </Button>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

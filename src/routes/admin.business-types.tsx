import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUp, ArrowDown, Plus, Trash2, Check, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/business-types")({
  component: BusinessTypesPage,
});

type Row = { id: string; slug: string; name_ar: string; sort_order: number; is_active: boolean };

function BusinessTypesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("business_categories").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { error } = await (supabase as any).from("business_categories").insert({
      name_ar: newName.trim(), slug: `type_${Date.now()}`, sort_order: maxOrder + 1, is_active: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setNewName(""); toast.success("تمت الإضافة"); load();
  };

  const rename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await (supabase as any).from("business_categories").update({ name_ar: editName.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditId(null); toast.success("تم التعديل"); load();
  };

  const toggle = async (r: Row) => {
    const { error } = await (supabase as any).from("business_categories").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const other = rows[index + dir];
    const cur = rows[index];
    if (!other || !cur) return;
    const sb = supabase as any;
    const [a, b] = [cur.sort_order, other.sort_order];
    const { error } = await sb.from("business_categories").update({ sort_order: b }).eq("id", cur.id);
    const { error: e2 } = await sb.from("business_categories").update({ sort_order: a }).eq("id", other.id);
    if (error || e2) { toast.error((error || e2)!.message); return; }
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    const { error } = await (supabase as any).from("business_categories").delete().eq("id", toDelete.id);
    setBusy(false);
    setToDelete(null);
    if (error) {
      toast.error("لا يمكن حذف نوع مرتبط بحسابات، قم بإخفائه بدلاً من ذلك");
      return;
    }
    toast.success("تم الحذف"); load();
  };

  return (
    <AdminShell title="أنواع الأنشطة">
      <Card className="p-3 flex gap-2 mb-4">
        <Input placeholder="اسم النوع الجديد" value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} disabled={!newName.trim() || busy}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا توجد أنواع أنشطة</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Card key={r.id} className="p-3 flex items-center gap-2">
              <div className="flex flex-col">
                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1">
                {editId === r.id ? (
                  <div className="flex gap-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && rename(r.id)} />
                    <Button size="icon" onClick={() => rename(r.id)}><Check className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <p className={`font-medium ${r.is_active ? "" : "text-muted-foreground line-through"}`}>{r.name_ar}</p>
                )}
              </div>
              {editId !== r.id && (
                <Button size="icon" variant="ghost" onClick={() => { setEditId(r.id); setEditName(r.name_ar); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(r)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نوع النشاط</AlertDialogTitle>
            <AlertDialogDescription>هل تريد حذف «{toDelete?.name_ar}»؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

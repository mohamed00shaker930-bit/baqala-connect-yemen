import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/banners")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [image_url, setImg] = useState("");
  const [link, setLink] = useState("");

  const load = async () => {
    const { data } = await (supabase as any).from("banners").select("*").order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!image_url.trim()) { toast.error("أدخل رابط الصورة"); return; }
    const { error } = await (supabase as any).from("banners").insert({ title, image_url, link: link || null, active: true });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت الإضافة");
    setTitle(""); setImg(""); setLink("");
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    await (supabase as any).from("banners").update({ active: !active }).eq("id", id);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("حذف هذا البانر؟")) return;
    await (supabase as any).from("banners").delete().eq("id", id);
    load();
  };

  return (
    <AdminShell title="البانرات">
      <Card className="p-4 space-y-3 mb-4">
        <div><Label>عنوان (اختياري)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>رابط الصورة</Label><Input value={image_url} onChange={(e) => setImg(e.target.value)} placeholder="https://..." /></div>
        <div><Label>رابط داخلي (اختياري)</Label><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/store/..." /></div>
        <Button onClick={add} className="w-full">إضافة بانر</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((b) => (
          <Card key={b.id} className="p-2 flex items-center gap-3">
            <img src={b.image_url} className="w-20 h-12 object-cover rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium">{b.title || "بدون عنوان"}</p>
              <p className="text-xs text-muted-foreground truncate">{b.link || "—"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggle(b.id, b.active)}>{b.active ? "إخفاء" : "إظهار"}</Button>
            <Button size="sm" variant="ghost" onClick={() => del(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">لا بانرات</p>}
      </div>
    </AdminShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fmtRial } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/merchant/products")({
  ssr: false,
  component: MerchantProducts,
});

function MerchantProducts() {
  const qc = useQueryClient();
  const { data: store } = useQuery({
    queryKey: ["my-store"],
    queryFn: async () => (await supabase.from("stores").select("*").maybeSingle()).data,
  });
  const { data: cats } = useQuery({
    queryKey: ["my-cats", store?.id], enabled: !!store?.id,
    queryFn: async () => (await supabase.from("categories").select("*").eq("store_id", store!.id).order("sort_order")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["my-products", store?.id], enabled: !!store?.id,
    queryFn: async () => (await supabase.from("products").select("*").eq("store_id", store!.id).order("name")).data ?? [],
  });

  const [openCat, setOpenCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [openProd, setOpenProd] = useState(false);
  const [p, setP] = useState({ name: "", price: "", image_url: "", category_id: "" });

  const addCat = async () => {
    if (!catName.trim() || !store) return;
    const { error } = await supabase.from("categories").insert({ store_id: store.id, name: catName.trim(), sort_order: (cats?.length ?? 0) });
    if (error) toast.error(error.message); else { toast.success("أُضيفت الفئة"); setCatName(""); setOpenCat(false); qc.invalidateQueries(); }
  };

  const addProd = async () => {
    if (!p.name || !p.price || !store) return;
    const { error } = await supabase.from("products").insert({
      store_id: store.id, name: p.name, price: Number(p.price),
      image_url: p.image_url || null, category_id: p.category_id || null,
    });
    if (error) toast.error(error.message); else { toast.success("أُضيف المنتج"); setP({ name: "", price: "", image_url: "", category_id: "" }); setOpenProd(false); qc.invalidateQueries(); }
  };

  const toggleStock = async (id: string, in_stock: boolean) => {
    await supabase.from("products").update({ in_stock }).eq("id", id);
    qc.invalidateQueries();
  };

  const removeProd = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast.success("تم الحذف"); qc.invalidateQueries();
  };

  return (
    <MerchantShell title="المنتجات" action={
      <Dialog open={openProd} onOpenChange={setOpenProd}>
        <DialogTrigger asChild><Button size="sm" variant="secondary"><Plus className="w-4 h-4 ml-1" />منتج</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>منتج جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم</Label><Input value={p.name} onChange={(e) => setP({...p, name: e.target.value})} /></div>
            <div><Label>السعر (ر.ي)</Label><Input dir="ltr" value={p.price} onChange={(e) => setP({...p, price: e.target.value})} inputMode="numeric" /></div>
            <div><Label>رابط الصورة (اختياري)</Label><Input dir="ltr" value={p.image_url} onChange={(e) => setP({...p, image_url: e.target.value})} /></div>
            <div>
              <Label>الفئة</Label>
              <Select value={p.category_id} onValueChange={(v) => setP({...p, category_id: v})}>
                <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                <SelectContent>{cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={addProd} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    }>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">الفئات</h3>
            <Dialog open={openCat} onOpenChange={setOpenCat}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>فئة جديدة</DialogTitle></DialogHeader>
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="مثل: مشروبات" />
                <Button onClick={addCat}>حفظ</Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap gap-2">
            {cats?.length === 0 && <p className="text-xs text-muted-foreground">لا فئات بعد</p>}
            {cats?.map((c) => <span key={c.id} className="text-xs bg-accent px-2 py-1 rounded-full">{c.name}</span>)}
          </div>
        </Card>

        <div className="space-y-2">
          {products?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا منتجات بعد. أضف منتجك الأول.</Card>}
          {products?.map((pr) => (
            <Card key={pr.id} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xl shrink-0">
                {pr.image_url ? <img src={pr.image_url} className="w-full h-full object-cover rounded" /> : "🛒"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{pr.name}</p>
                <p className="text-xs text-primary">{fmtRial(pr.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pr.in_stock} onCheckedChange={(v) => toggleStock(pr.id, v)} />
                <Button size="sm" variant="ghost" onClick={() => removeProd(pr.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MerchantShell>
  );
}

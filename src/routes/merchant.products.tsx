import { fetchMyStore } from "@/lib/my-store";
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
import { Plus, Trash2, Camera, Link2, X, ScanBarcode, LibraryBig } from "lucide-react";
import { CatalogPicker } from "@/components/CatalogPicker";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/merchant/products")({
  ssr: false,
  component: MerchantProducts,
});

function MerchantProducts() {
  const qc = useQueryClient();
  const { data: store } = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
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
  const [p, setP] = useState({ name: "", price: "", image_url: "", category_id: "", barcode: "" });
  const [imgMode, setImgMode] = useState<"url" | "camera">("url");
  const [scanOpen, setScanOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const importFromCatalog = async ({ items, categories }: { items: any[]; categories: any[] }) => {
    if (!store) { toast.error("لا يوجد متجر"); return; }
    let createdCats = 0, createdItems = 0;
    const existingCatNames = new Set((cats ?? []).map((c) => c.name.toLowerCase()));
    const catNameToId = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    // Insert new categories
    const newCats = categories.filter((c) => !existingCatNames.has(c.name.toLowerCase()));
    // Also infer categories from item.category_name when missing
    for (const it of items) {
      const cn = it.category_name?.trim();
      if (cn && !existingCatNames.has(cn.toLowerCase()) && !newCats.find((c) => c.name.toLowerCase() === cn.toLowerCase())) {
        newCats.push({ name: cn });
      }
    }
    if (newCats.length) {
      const baseOrder = cats?.length ?? 0;
      const { data: inserted, error } = await supabase.from("categories")
        .insert(newCats.map((c, i) => ({ store_id: store.id, name: c.name, sort_order: baseOrder + i })))
        .select("id, name");
      if (error) { toast.error(error.message); return; }
      createdCats = inserted?.length ?? 0;
      inserted?.forEach((r) => catNameToId.set(r.name.toLowerCase(), r.id));
    }

    // Insert products
    if (items.length) {
      const rows = items.map((it) => ({
        store_id: store.id,
        name: it.name,
        price: Number(it.default_price) || 0,
        image_url: it.image_url || null,
        barcode: it.barcode || null,
        category_id: it.category_name ? (catNameToId.get(it.category_name.toLowerCase()) ?? null) : null,
      }));
      const { error } = await supabase.from("products").insert(rows);
      if (error) { toast.error(error.message); return; }
      createdItems = rows.length;
    }

    toast.success(`أُضيف ${createdItems} منتج و ${createdCats} فئة`);
    setCatalogOpen(false);
    qc.invalidateQueries();
  };

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("الصورة كبيرة جداً (الحد 2 ميجا)"); return; }
    // Downscale via canvas to keep payload small
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        setP((prev) => ({ ...prev, image_url: dataUrl }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addCat = async () => {
    if (!catName.trim()) { toast.error("اكتب اسم الفئة"); return; }
    if (!store) { toast.error("لا يوجد متجر. أنشئ متجراً أولاً"); return; }
    const { error } = await supabase.from("categories").insert({ store_id: store.id, name: catName.trim(), sort_order: (cats?.length ?? 0) });
    if (error) toast.error(error.message); else { toast.success("أُضيفت الفئة"); setCatName(""); setOpenCat(false); qc.invalidateQueries(); }
  };

  const addProd = async () => {
    if (!p.name.trim()) { toast.error("اكتب اسم المنتج"); return; }
    if (!p.price) { toast.error("اكتب السعر"); return; }
    if (!store) { toast.error("لا يوجد متجر. أنشئ متجراً أولاً"); return; }
    const { error } = await supabase.from("products").insert({
      store_id: store.id, name: p.name.trim(), price: Number(p.price),
      image_url: p.image_url || null, category_id: p.category_id || null,
      barcode: p.barcode.trim() || null,
    });
    if (error) toast.error(error.message); else { toast.success("أُضيف المنتج"); setP({ name: "", price: "", image_url: "", category_id: "", barcode: "" }); setOpenProd(false); qc.invalidateQueries(); }
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
      <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)}>
        <LibraryBig className="w-4 h-4 ml-1" />المكتبة
      </Button>
      <Dialog open={openProd} onOpenChange={setOpenProd}>
        <DialogTrigger asChild><Button size="sm" variant="secondary"><Plus className="w-4 h-4 ml-1" />منتج</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>منتج جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم</Label><Input value={p.name} onChange={(e) => setP({...p, name: e.target.value})} /></div>
            <div><Label>السعر (ر.ي)</Label><Input dir="ltr" value={p.price} onChange={(e) => setP({...p, price: e.target.value})} inputMode="numeric" /></div>
            <div className="space-y-2">
              <Label>صورة المنتج</Label>
              {p.image_url ? (
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border">
                  <img src={p.image_url} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setP({...p, image_url: ""})}
                    className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
                    <Camera className="w-4 h-4 ml-1" /> التقط صورة
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => galleryRef.current?.click()}>
                    من المعرض
                  </Button>
                  <Button type="button" size="sm" variant={imgMode==="url"?"default":"outline"} onClick={() => setImgMode("url")}>
                    <Link2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {!p.image_url && imgMode === "url" && (
                <Input dir="ltr" placeholder="https://..." value={p.image_url} onChange={(e) => setP({...p, image_url: e.target.value})} />
              )}
            </div>
            <div>
              <Label>الفئة</Label>
              <Select value={p.category_id} onValueChange={(v) => setP({...p, category_id: v})}>
                <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                <SelectContent>{cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>الباركود (اختياري)</Label>
              <div className="flex gap-2">
                <Input dir="ltr" value={p.barcode} onChange={(e) => setP({...p, barcode: e.target.value})} placeholder="6219..." />
                <Button type="button" variant="outline" size="icon" onClick={() => setScanOpen(true)}>
                  <ScanBarcode className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button onClick={addProd} className="w-full">حفظ</Button>
          </div>
          <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={(code) => { setP((prev) => ({...prev, barcode: code})); setScanOpen(false); }} title="مسح باركود المنتج" />
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Pencil, Trash2, Plus, ArrowUp, ArrowDown, Image as ImageIcon,
  ChevronLeft, ChevronRight, Package, Search, Download, Upload, Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/library")({ component: LibraryPage });

const BUCKET = "products-library";
const PAGE_SIZE = 50;
const DEFAULT_SECTIONS = [
  "المقاضي",
  "الإحتياجات اليومية",
  "الاساسيات المنزلية",
  "التسالى والحلويات",
  "الجمال والعناية الشخصية",
  "المشروبات",
];

type Category = {
  id: string;
  name: string;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  main_section: string | null;
};

type Item = {
  id: string;
  name: string;
  image_url: string | null;
  barcode: string | null;
  default_price: number;
  description: string;
  category_id: string | null;
  category_name: string | null;
  main_section: string | null;
  sort_order: number;
};

// -------- image helpers --------
async function compressImage(file: File, maxW = 800): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, maxW / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || file), "image/webp", 0.85)!
  );
  return blob;
}

async function uploadImage(file: File, oldUrl?: string | null): Promise<string> {
  const blob = await compressImage(file, 800);
  const ext = "webp";
  const path = `admin/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // best-effort delete old
  if (oldUrl) {
    const marker = `/${BUCKET}/`;
    const idx = oldUrl.indexOf(marker);
    if (idx !== -1) {
      const old = decodeURIComponent(oldUrl.slice(idx + marker.length));
      supabase.storage.from(BUCKET).remove([old]).catch(() => {});
    }
  }
  return data.publicUrl;
}

function LibraryPage() {
  return (
    <AdminShell title="إدارة المكتبة">
      <Tabs defaultValue="cats" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="cats">الفئات</TabsTrigger>
          <TabsTrigger value="items">المنتجات</TabsTrigger>
        </TabsList>
        <TabsContent value="cats"><CategoriesTab /></TabsContent>
        <TabsContent value="items"><ItemsTab /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

// ========== Categories ==========
function CategoriesTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: cc }] = await Promise.all([
      (supabase as any).from("catalog_categories").select("id,name,image_url,icon,sort_order,main_section").order("sort_order", { ascending: true }),
      (supabase as any).rpc("catalog_category_counts"),
    ]);
    setCats((c as Category[]) || []);
    const cm: Record<string, number> = {};
    (cc || []).forEach((r: any) => { cm[r.category_id] = Number(r.items_count); });
    setCounts(cm);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sections = useMemo(() => {
    const s = new Set<string>(DEFAULT_SECTIONS);
    cats.forEach((c) => c.main_section && s.add(c.main_section));
    return Array.from(s);
  }, [cats]);

  const swap = async (a: Category, b: Category) => {
    await (supabase as any).from("catalog_categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await (supabase as any).from("catalog_categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    load();
  };

  const moveUp = (i: number) => { if (i > 0) swap(cats[i], cats[i - 1]); };
  const moveDown = (i: number) => { if (i < cats.length - 1) swap(cats[i], cats[i + 1]); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{cats.length} فئة</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 ml-1" />إضافة فئة</Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">جاري التحميل...</Card>
      ) : cats.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا فئات</Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cats.map((c, i) => (
            <Card key={c.id} className="p-3 space-y-2">
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-bold text-sm line-clamp-1">{c.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{c.main_section || "بلا قسم"}</p>
                <p className="text-[11px] text-primary">{counts[c.id] || 0} منتج</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 h-8 px-1" onClick={() => setEditing(c)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => moveUp(i)} disabled={i === 0}>
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => moveDown(i)} disabled={i === cats.length - 1}>
                  <ArrowDown className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDeleteTarget(c)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CategoryDialog
        open={addOpen || !!editing}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        category={editing}
        sections={sections}
        nextSortOrder={(cats[cats.length - 1]?.sort_order ?? 0) + 1}
        onSaved={load}
      />

      <DeleteCategoryDialog
        target={deleteTarget}
        productCount={deleteTarget ? counts[deleteTarget.id] || 0 : 0}
        otherCats={cats.filter((c) => c.id !== deleteTarget?.id)}
        onClose={() => setDeleteTarget(null)}
        onDone={load}
      />
    </div>
  );
}

function CategoryDialog({
  open, onClose, category, sections, nextSortOrder, onSaved,
}: {
  open: boolean; onClose: () => void; category: Category | null;
  sections: string[]; nextSortOrder: number; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [mainSection, setMainSection] = useState<string>("");
  const [customSection, setCustomSection] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(category?.name || "");
      setMainSection(category?.main_section && sections.includes(category.main_section) ? category.main_section : (category?.main_section ? "__custom" : ""));
      setCustomSection(category?.main_section && !sections.includes(category.main_section) ? category.main_section : "");
      setImageUrl(category?.image_url || null);
    }
  }, [open, category]);

  const onPickImage = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f, imageUrl);
      setImageUrl(url);
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) { toast.error("أدخل اسم الفئة"); return; }
    const finalSection = mainSection === "__custom" ? customSection.trim() : mainSection.trim();
    setSaving(true);
    try {
      if (category) {
        const oldName = category.name;
        const oldSection = category.main_section;
        const { error } = await (supabase as any).from("catalog_categories").update({
          name: name.trim(),
          main_section: finalSection || null,
          image_url: imageUrl,
        }).eq("id", category.id);
        if (error) throw error;
        // sync catalog_items
        const patch: any = {};
        if (oldName !== name.trim()) patch.category_name = name.trim();
        if ((oldSection || null) !== (finalSection || null)) patch.main_section = finalSection || null;
        if (Object.keys(patch).length > 0) {
          await (supabase as any).from("catalog_items").update(patch).eq("category_id", category.id);
        }
        toast.success("تم التحديث");
      } else {
        const { error } = await (supabase as any).from("catalog_categories").insert({
          name: name.trim(),
          main_section: finalSection || null,
          image_url: imageUrl,
          sort_order: nextSortOrder,
        });
        if (error) throw error;
        toast.success("تمت الإضافة");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle>{category ? "تعديل فئة" : "إضافة فئة"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الاسم</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>القسم الرئيسي</Label>
            <Select value={mainSection} onValueChange={setMainSection}>
              <SelectTrigger><SelectValue placeholder="اختر قسماً" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                <SelectItem value="__custom">+ قسم جديد</SelectItem>
              </SelectContent>
            </Select>
            {mainSection === "__custom" && (
              <Input className="mt-2" placeholder="اسم القسم الجديد" value={customSection} onChange={(e) => setCustomSection(e.target.value)} />
            )}
          </div>
          <div>
            <Label>الصورة</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
              </div>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "جاري الرفع..." : "رفع صورة"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? "جاري..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  target, productCount, otherCats, onClose, onDone,
}: {
  target: Category | null; productCount: number;
  otherCats: Category[]; onClose: () => void; onDone: () => void;
}) {
  const [moveTo, setMoveTo] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (target) setMoveTo(""); }, [target]);

  const doDelete = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (productCount > 0) {
        if (!moveTo) { toast.error("اختر فئة النقل"); setBusy(false); return; }
        const dest = otherCats.find((c) => c.id === moveTo);
        if (!dest) { setBusy(false); return; }
        const { error: e1 } = await (supabase as any).from("catalog_items").update({
          category_id: dest.id,
          category_name: dest.name,
          main_section: dest.main_section,
        }).eq("category_id", target.id);
        if (e1) throw e1;
      }
      const { error } = await (supabase as any).from("catalog_categories").delete().eq("id", target.id);
      if (error) throw error;
      toast.success("تم الحذف");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "فشل الحذف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الفئة "{target?.name}"</AlertDialogTitle>
          <AlertDialogDescription>
            {productCount > 0
              ? `هذه الفئة تحتوي ${productCount} منتج. اختر فئة أخرى لنقل المنتجات إليها قبل الحذف.`
              : "لا منتجات في هذه الفئة. سيتم الحذف مباشرة."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {productCount > 0 && (
          <div>
            <Label>نقل المنتجات إلى</Label>
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
              <SelectContent>
                {otherCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); doDelete(); }} disabled={busy}>
            {busy ? "جاري..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ========== Items ==========
function ItemsTab() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    (supabase as any).from("catalog_categories").select("id,name,image_url,icon,sort_order,main_section").order("sort_order")
      .then(({ data }: any) => setCats(data || []));
  }, []);

  const applySort = (query: any) => {
    switch (sortBy) {
      case "price_desc": return query.order("default_price", { ascending: false, nullsFirst: false });
      case "price_asc": return query.order("default_price", { ascending: true, nullsFirst: false });
      case "name_asc": return query.order("name", { ascending: true });
      case "name_desc": return query.order("name", { ascending: false });
      case "newest":
      default: return query.order("created_at", { ascending: false });
    }
  };

  const load = async () => {
    setLoading(true);
    let query = (supabase as any).from("catalog_items")
      .select("id,name,image_url,barcode,default_price,description,category_id,category_name,main_section,sort_order", { count: "exact" });
    if (q.trim()) {
      const term = q.trim().replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%`);
    }
    if (categoryFilter !== "__all") query = query.eq("category_id", categoryFilter);
    query = applySort(query).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await query;
    setItems((data as Item[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, [page, q, categoryFilter, sortBy]);

  useEffect(() => { setPage(0); }, [q, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); setQ(qInput); };

  const del = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("catalog_items").delete().eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    if (deleteTarget.image_url) {
      const marker = `/${BUCKET}/`;
      const idx = deleteTarget.image_url.indexOf(marker);
      if (idx !== -1) {
        const old = decodeURIComponent(deleteTarget.image_url.slice(idx + marker.length));
        supabase.storage.from(BUCKET).remove([old]).catch(() => {});
      }
    }
    toast.success("تم الحذف");
    setDeleteTarget(null);
    load();
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const all: any[] = [];
      const size = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await (supabase as any).from("catalog_items")
          .select("id,name,barcode,default_price,description,main_section,category_path,subcategory,category_name,image_url,usage_count,sort_order,source,created_at")
          .order("main_section", { ascending: true, nullsFirst: false })
          .order("category_path", { ascending: true, nullsFirst: false })
          .order("name", { ascending: true })
          .range(from, from + size - 1);
        if (error) throw error;
        const rows = (data || []) as any[];
        all.push(...rows);
        if (rows.length < size) break;
        from += size;
      }
      const headers = [
        "المعرف (لا تعدّله)", "اسم المنتج", "الباركود", "السعر", "الوصف",
        "القسم الرئيسي", "الفئة", "الفئة الفرعية", "اسم الفئة",
        "رابط الصورة", "عدد الاستخدام", "الترتيب", "المصدر", "تاريخ الإضافة",
      ];
      const aoa: any[][] = [headers];
      for (const r of all) {
        aoa.push([
          r.id ?? "",
          r.name ?? "",
          r.barcode ?? "",
          r.default_price ?? "",
          r.description ?? "",
          r.main_section ?? "",
          r.category_path ?? "",
          r.subcategory ?? "",
          r.category_name ?? "",
          r.image_url ?? "",
          r.usage_count ?? "",
          r.sort_order ?? "",
          r.source ?? "",
          r.created_at ?? "",
        ]);
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Force id (col A) and barcode (col C) to text
      const range = XLSX.utils.decode_range(ws["!ref"]!);
      for (let R = 1; R <= range.e.r; R++) {
        for (const C of [0, 2]) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (cell && cell.v != null && cell.v !== "") {
            cell.t = "s";
            cell.v = String(cell.v);
            cell.z = "@";
          }
        }
      }
      ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, Math.min(40, h.length + 6)) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
      XLSX.writeFile(wb, "wasl-library.xlsx");
      toast.success(`تم تصدير ${all.length} منتج`);
    } catch (e: any) {
      toast.error(e.message || "فشل التصدير");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الباركود..." value={qInput} onChange={(e) => setQInput(e.target.value)} className="pr-9" />
        </form>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="الفرز" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="price_desc">السعر: من الأعلى إلى الأدنى</SelectItem>
            <SelectItem value="price_asc">السعر: من الأدنى إلى الأعلى</SelectItem>
            <SelectItem value="name_asc">الاسم: أ → ي</SelectItem>
            <SelectItem value="name_desc">الاسم: ي → أ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="md:w-56"><SelectValue placeholder="الفئة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">كل الفئات</SelectItem>
            {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportExcel} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Download className="w-4 h-4 ml-1" />}
          تصدير Excel
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 ml-1" />استيراد Excel
        </Button>
        <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 ml-1" />إضافة منتج</Button>
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">صورة</TableHead>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الفئة</TableHead>
              <TableHead className="text-right">الباركود</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا منتجات</TableCell></TableRow>
            ) : items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                    {it.image_url ? <img src={it.image_url} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{it.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{it.category_name || "—"}</TableCell>
                <TableCell className="text-xs">{it.barcode || "—"}</TableCell>
                <TableCell className="text-xs">{it.default_price}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setEditing(it)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDeleteTarget(it)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{total} منتج · صفحة {page + 1} من {totalPages}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronRight className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}><ChevronLeft className="w-4 h-4" /></Button>
        </div>
      </div>

      <ItemDialog
        open={addOpen || !!editing}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        item={editing}
        cats={cats}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف "{deleteTarget?.name}" من المكتبة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); del(); }}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ItemDialog({
  open, onClose, item, cats, onSaved,
}: {
  open: boolean; onClose: () => void; item: Item | null;
  cats: Category[]; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(item?.name || "");
      setCategoryId(item?.category_id || "");
      setBarcode(item?.barcode || "");
      setPrice(String(item?.default_price ?? 0));
      setDescription(item?.description || "");
      setImageUrl(item?.image_url || null);
    }
  }, [open, item]);

  const onPickImage = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f, imageUrl);
      setImageUrl(url);
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!name.trim()) { toast.error("أدخل اسم المنتج"); return; }
    setSaving(true);
    try {
      const cat = cats.find((c) => c.id === categoryId);
      const payload: any = {
        name: name.trim(),
        barcode: barcode.trim() || null,
        default_price: Number(price) || 0,
        description: description,
        image_url: imageUrl,
        category_id: categoryId || null,
        category_name: cat?.name || null,
        main_section: cat?.main_section || null,
      };
      if (item) {
        const { error } = await (supabase as any).from("catalog_items").update(payload).eq("id", item.id);
        if (error) throw error;
        toast.success("تم التحديث");
      } else {
        const { error } = await (supabase as any).from("catalog_items").insert(payload);
        if (error) throw error;
        toast.success("تمت الإضافة");
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle>{item ? "تعديل منتج" : "إضافة منتج"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <Label>الاسم</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>الفئة</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الباركود</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
          <div>
            <Label>السعر الافتراضي</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>الصورة</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
              </div>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "جاري..." : "رفع صورة"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? "جاري..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

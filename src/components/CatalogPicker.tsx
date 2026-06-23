import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtRial } from "@/lib/format";
import { Search, Package } from "lucide-react";

type CatalogItem = {
  id: string;
  name: string;
  default_price: number;
  image_url: string | null;
  barcode: string | null;
  category_name: string | null;
  usage_count: number;
};
type CatalogCat = { id: string; name: string; icon: string | null; usage_count: number };

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (selection: { items: CatalogItem[]; categories: CatalogCat[] }) => void;
}

export function CatalogPicker({ open, onClose, onImport }: Props) {
  const [q, setQ] = useState("");
  const [pickedItems, setPickedItems] = useState<Record<string, CatalogItem>>({});
  const [pickedCats, setPickedCats] = useState<Record<string, CatalogCat>>({});

  const { data: items = [] } = useQuery({
    queryKey: ["catalog-items"], enabled: open,
    queryFn: async () => (await supabase.from("catalog_items").select("*").order("usage_count", { ascending: false }).limit(500)).data as CatalogItem[] ?? [],
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["catalog-cats"], enabled: open,
    queryFn: async () => (await supabase.from("catalog_categories").select("*").order("usage_count", { ascending: false })).data as CatalogCat[] ?? [],
  });

  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.name.toLowerCase().includes(s) || (i.barcode ?? "").includes(s));
  }, [items, q]);
  const filteredCats = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(s));
  }, [cats, q]);

  const total = Object.keys(pickedItems).length + Object.keys(pickedCats).length;

  const reset = () => { setPickedItems({}); setPickedCats({}); setQ(""); };
  const handleImport = () => {
    onImport({ items: Object.values(pickedItems), categories: Object.values(pickedCats) });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>استيراد من المكتبة</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الباركود" className="pr-9" />
        </div>
        <Tabs defaultValue="items" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="items">منتجات ({filteredItems.length})</TabsTrigger>
            <TabsTrigger value="cats">فئات ({filteredCats.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="flex-1 overflow-y-auto space-y-1 mt-2">
            {filteredItems.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا منتجات</p>}
            {filteredItems.map((it) => {
              const checked = !!pickedItems[it.id];
              return (
                <label key={it.id} className="flex items-center gap-2 p-2 rounded border hover:bg-accent cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    setPickedItems((p) => { const n = {...p}; if (v) n[it.id] = it; else delete n[it.id]; return n; });
                  }} />
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden">
                    {it.image_url ? <img src={it.image_url} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.category_name ?? "—"} · {fmtRial(it.default_price)}</p>
                  </div>
                </label>
              );
            })}
          </TabsContent>
          <TabsContent value="cats" className="flex-1 overflow-y-auto space-y-1 mt-2">
            {filteredCats.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا فئات</p>}
            {filteredCats.map((c) => {
              const checked = !!pickedCats[c.id];
              return (
                <label key={c.id} className="flex items-center gap-2 p-2 rounded border hover:bg-accent cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    setPickedCats((p) => { const n = {...p}; if (v) n[c.id] = c; else delete n[c.id]; return n; });
                  }} />
                  <span className="text-xl">{c.icon ?? "📦"}</span>
                  <span className="flex-1 text-sm">{c.name}</span>
                </label>
              );
            })}
          </TabsContent>
        </Tabs>
        <Button onClick={handleImport} disabled={total === 0} className="w-full">
          استيراد المحدد ({total})
        </Button>
      </DialogContent>
    </Dialog>
  );
}

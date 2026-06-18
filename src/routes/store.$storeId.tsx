import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cart, useCart } from "@/lib/cart";
import { fmtRial } from "@/lib/format";
import { Plus, Minus, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/store/$storeId")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: StorePage,
});

function StorePage() {
  const { storeId } = Route.useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const cartState = useCart();

  const { data: store } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => (await supabase.from("stores").select("*").eq("id", storeId).maybeSingle()).data,
  });
  const { data: products } = useQuery({
    queryKey: ["store-products", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(name)").eq("store_id", storeId).order("name");
      return data ?? [];
    },
  });

  const filtered = (products ?? []).filter((p) => p.name.includes(q));
  const grouped = filtered.reduce((acc: Record<string, typeof filtered>, p) => {
    const k = (p as any).categories?.name || "منتجات";
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  const getQty = (id: string) => cartState.items.find((i) => i.productId === id)?.qty || 0;

  return (
    <CustomerShell title={store?.name || "متجر"} action={
      cartState.items.length > 0 && (
        <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/cart" })}>
          <ShoppingCart className="w-4 h-4 ml-1" />{fmtRial(cart.total())}
        </Button>
      )
    }>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث عن منتج..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
        </div>

        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="font-bold text-sm mb-2 text-primary">{cat}</h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map((p) => {
                const qty = getQty(p.id);
                return (
                  <Card key={p.id} className="p-3 space-y-2">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-3xl">
                      {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : "🛒"}
                    </div>
                    <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{fmtRial(p.price)}</span>
                      {!p.in_stock ? (
                        <span className="text-[10px] text-destructive">نفد</span>
                      ) : qty === 0 ? (
                        <Button size="sm" onClick={() => {
                          if (!store) return;
                          cart.add(storeId, store.name, { productId: p.id, name: p.name, price: Number(p.price), qty: 1, imageUrl: p.image_url });
                          toast.success("أضيف للسلة");
                        }} className="h-8 w-8 p-0"><Plus className="w-4 h-4" /></Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => cart.setQty(p.id, qty - 1)}><Minus className="w-3 h-3" /></Button>
                          <span className="w-6 text-center text-sm font-bold">{qty}</span>
                          <Button size="sm" className="h-7 w-7 p-0" onClick={() => cart.setQty(p.id, qty + 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد منتجات بعد.</Card>}
      </div>
    </CustomerShell>
  );
}

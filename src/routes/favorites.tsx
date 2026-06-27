import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Store as StoreIcon, Heart } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { fmtRial } from "@/lib/format";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favorites")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: FavoritesPage,
});

function FavoritesPage() {
  const { data: favs } = useFavorites();
  const storeIds = (favs ?? []).filter((f: any) => f.target_type === "store").map((f: any) => f.target_id);
  const productIds = (favs ?? []).filter((f: any) => f.target_type === "product").map((f: any) => f.target_id);

  const { data: stores } = useQuery({
    queryKey: ["fav-stores", storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return [];
      const { data } = await supabase.from("stores").select("*").in("id", storeIds);
      return data ?? [];
    },
    enabled: !!favs,
  });
  const { data: products } = useQuery({
    queryKey: ["fav-products", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data } = await supabase.from("products").select("*, stores(name)").in("id", productIds);
      return data ?? [];
    },
    enabled: !!favs,
  });

  return (
    <CustomerShell title="المفضلة">
      <Tabs defaultValue="stores">
        <TabsList className="w-full">
          <TabsTrigger value="stores" className="flex-1">المتاجر</TabsTrigger>
          <TabsTrigger value="products" className="flex-1">المنتجات</TabsTrigger>
        </TabsList>
        <TabsContent value="stores" className="space-y-3 mt-3">
          {(stores ?? []).length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <Heart className="w-10 h-10 mx-auto opacity-40 mb-2" />لا توجد متاجر مفضّلة بعد.
            </Card>
          )}
          {stores?.map((s: any) => (
            <Link key={s.id} to="/store/$storeId" params={{ storeId: s.id }}>
              <Card className="p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-bold">{s.name}</div>
                  {s.area && <div className="text-xs text-muted-foreground">{s.area}</div>}
                </div>
                <FavoriteButton type="store" id={s.id} />
              </Card>
            </Link>
          ))}
        </TabsContent>
        <TabsContent value="products" className="mt-3">
          {(products ?? []).length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <Heart className="w-10 h-10 mx-auto opacity-40 mb-2" />لا توجد منتجات مفضّلة بعد.
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            {products?.map((p: any) => (
              <Link key={p.id} to="/store/$storeId" params={{ storeId: p.store_id }}>
                <Card className="p-3 space-y-2 relative">
                  <FavoriteButton type="product" id={p.id} className="absolute top-2 right-2 z-10" />
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-3xl">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : "🛒"}
                  </div>
                  <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary text-sm">{fmtRial(p.price)}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{p.stores?.name}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </CustomerShell>
  );
}

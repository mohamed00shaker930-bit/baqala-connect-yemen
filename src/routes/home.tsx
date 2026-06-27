import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/auth-helpers";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Store as StoreIcon, Navigation, RotateCcw, Heart, Wallet, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { BannerCarousel } from "@/components/BannerCarousel";
import { useEffect, useMemo, useState } from "react";
import { getCachedLocation, requestCurrentPosition, haversineKm, fmtDistance, type LatLng } from "@/lib/geo";
import { cart } from "@/lib/cart";
import { fmtRial } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/home")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const role = await getUserRole(data.session.user.id);
    if (!role) throw redirect({ to: "/choose-role" });
    if (role === "merchant") throw redirect({ to: "/merchant" });
  },
  component: HomePage,
});

function HomePage() {
  const [myLoc, setMyLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => { setMyLoc(getCachedLocation()); }, []);

  const detect = async () => {
    setLocating(true);
    try {
      const p = await requestCurrentPosition();
      setMyLoc(p);
      toast.success("تم تحديد موقعك — رتّبنا المتاجر بالأقرب");
    } catch { toast.error("تعذّر الحصول على الموقع"); }
    finally { setLocating(false); }
  };

  const { data: stores, isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("rating", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders-home"],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("id, store_id, total, created_at, stores(name), order_items(product_id, name, qty, price, image_url)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const sorted = useMemo(() => {
    if (!stores) return [];
    if (!myLoc) return stores;
    return [...stores].map((s) => {
      const dist = s.lat != null && s.lng != null ? haversineKm(myLoc, { lat: Number(s.lat), lng: Number(s.lng) }) : Infinity;
      return { ...s, _dist: dist };
    }).sort((a, b) => a._dist - b._dist);
  }, [stores, myLoc]);

  const reorder = (o: any) => {
    if (!o.stores?.name) return;
    cart.clear();
    for (const it of (o.order_items ?? [])) {
      cart.add(o.store_id, o.stores.name, { productId: it.product_id, name: it.name, price: Number(it.price), qty: it.qty, imageUrl: it.image_url });
    }
    toast.success("أُضيفت طلبيتك السابقة للسلة");
  };

  return (
    <CustomerShell title="بقالات قريبة منك" action={
      <Button size="sm" variant="secondary" onClick={detect} disabled={locating}>
        <Navigation className="w-4 h-4 ml-1" /> {locating ? "..." : (myLoc ? "تحديث" : "موقعي")}
      </Button>
    }>
      {/* اطلب مرة أخرى */}
      {(recentOrders ?? []).length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm flex items-center gap-1"><RotateCcw className="w-4 h-4" /> اطلب مرة أخرى</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x">
            {recentOrders!.map((o: any) => (
              <Card key={o.id} className="p-3 min-w-[200px] snap-start space-y-2">
                <div className="font-bold text-sm truncate">{o.stores?.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {(o.order_items ?? []).slice(0, 3).map((i: any) => i.name).join("، ")}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary font-bold">{fmtRial(o.total)}</span>
                  <Button size="sm" className="h-7 text-xs" onClick={() => reorder(o)}>أعد الطلب</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* روابط سريعة */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link to="/favorites">
          <Card className="p-3 flex items-center gap-2 hover:border-primary"><Heart className="w-5 h-5 text-destructive" /><span className="text-sm font-medium">المفضلة</span></Card>
        </Link>
        <Link to="/locations">
          <Card className="p-3 flex items-center gap-2 hover:border-primary"><MapPin className="w-5 h-5 text-primary" /><span className="text-sm font-medium">مواقعي</span></Card>
        </Link>
      </div>

      <div className="space-y-3">
        {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        {!isLoading && sorted.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <StoreIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد بقالات مسجلة بعد.</p>
          </Card>
        )}
        {sorted.map((s: any) => (
          <div key={s.id} className="relative">
            <FavoriteButton type="store" id={s.id} className="absolute top-3 left-3 z-10" />
            <Link to="/store/$storeId" params={{ storeId: s.id }}>
              <Card className="p-4 hover:border-primary transition">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <StoreIcon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0 pl-8">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold truncate">{s.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.is_open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {s.is_open ? "مفتوح" : "مغلق"}
                      </span>
                    </div>
                    {s.area && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{s.area}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />{Number(s.rating).toFixed(1)}</span>
                      {myLoc && Number.isFinite(s._dist) && (
                        <span className="flex items-center gap-1 text-primary font-medium"><Navigation className="w-3 h-3" />{fmtDistance(s._dist)}</span>
                      )}
                      {s.delivery_info && <span className="text-muted-foreground truncate">{s.delivery_info}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        ))}
      </div>
    </CustomerShell>
  );
}

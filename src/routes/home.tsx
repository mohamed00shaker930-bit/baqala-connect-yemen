import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/auth-helpers";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Star, MapPin, Store as StoreIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: stores, isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("rating", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <CustomerShell title="بقالات قريبة منك">
      <div className="space-y-3">
        {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        {!isLoading && stores?.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <StoreIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد بقالات مسجلة بعد.</p>
            <p className="text-xs mt-1">ادعُ تاجراً قريباً للانضمام للتطبيق.</p>
          </Card>
        )}
        {stores?.map((s) => (
          <Link key={s.id} to="/store/$storeId" params={{ storeId: s.id }}>
            <Card className="p-4 hover:border-primary transition">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <StoreIcon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{s.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.is_open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {s.is_open ? "مفتوح" : "مغلق"}
                    </span>
                  </div>
                  {s.area && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{s.area}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />{Number(s.rating).toFixed(1)}</span>
                    {s.delivery_info && <span className="text-muted-foreground truncate">{s.delivery_info}</span>}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </CustomerShell>
  );
}

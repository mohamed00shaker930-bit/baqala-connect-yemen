import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtRial, fmtDate } from "@/lib/format";
import { Undo2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/merchant/returns")({
  ssr: false,
  component: MerchantReturns,
});

const LABEL: Record<string, string> = { requested: "بانتظار الموافقة", approved: "مقبول", rejected: "مرفوض" };

function MerchantReturns() {
  const qc = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["return-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("*, order_items(*)")
        .neq("return_status", "none")
        .order("return_requested_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const respond = async (id: string, approve: boolean) => {
    const { error } = await supabase.from("orders").update({
      return_status: approve ? "approved" : "rejected",
      return_responded_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(approve ? "تمت الموافقة على الإرجاع" : "تم الرفض"); qc.invalidateQueries(); }
  };

  return (
    <MerchantShell title="المرتجعات">
      <div className="space-y-3">
        {(orders ?? []).length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Undo2 className="w-10 h-10 mx-auto opacity-40 mb-2" />لا توجد طلبات إرجاع.
          </Card>
        )}
        {orders?.map((o: any) => (
          <Card key={o.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">طلب #{o.id.slice(0, 6)}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(o.return_requested_at || o.created_at)}</p>
              </div>
              <Badge variant={o.return_status === "approved" ? "default" : o.return_status === "rejected" ? "destructive" : "secondary"}>
                {LABEL[o.return_status]}
              </Badge>
            </div>
            <div className="text-xs space-y-1 text-muted-foreground">
              {o.order_items?.map((it: any) => <div key={it.id}>{it.name} × {it.qty}</div>)}
            </div>
            {o.return_reason && (
              <div className="text-sm bg-accent/30 p-2 rounded">
                <span className="font-bold">السبب:</span> {o.return_reason}
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">قيمة الطلب</span>
              <span className="font-bold text-primary">{fmtRial(o.total)}</span>
            </div>
            {o.return_status === "requested" && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => respond(o.id, true)}>
                  <Check className="w-4 h-4 ml-1" /> قبول
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => respond(o.id, false)}>
                  <X className="w-4 h-4 ml-1" /> رفض
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </MerchantShell>
  );
}

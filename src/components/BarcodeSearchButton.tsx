import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtRial } from "@/lib/format";

type Match = {
  id: string;
  name: string;
  price: number;
  store_id: string;
  stores: { id: string; name: string; area: string | null } | null;
};

export function BarcodeSearchButton() {
  const navigate = useNavigate();
  const [scanOpen, setScanOpen] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);

  const goToStore = (storeId: string, productName: string) => {
    setMatches(null);
    navigate({ to: "/store/$storeId", params: { storeId }, search: { q: productName } });
  };

  const onDetected = async (code: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, store_id, stores(id, name, area)")
        .eq("barcode", code);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Match[];
      setScanOpen(false);
      if (rows.length === 0) {
        toast.error("لم يتم العثور على هذا المنتج في أي متجر قريب حالياً");
      } else if (rows.length === 1) {
        goToStore(rows[0].store_id, rows[0].name);
      } else {
        setMatches(rows);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("تعذّر البحث عن الباركود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        className="relative p-2 rounded-full hover:bg-accent/50 text-primary-foreground"
        aria-label="مسح الباركود للبحث عن منتج"
      >
        <ScanBarcode className="w-5 h-5" />
      </button>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={onDetected}
        title="مسح باركود المنتج"
      />

      <Dialog open={!!matches} onOpenChange={(v) => !v && setMatches(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>متوفر في عدة متاجر</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(matches ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => goToStore(m.store_id, m.name)}
                className="w-full text-right p-3 rounded-lg border hover:bg-accent transition flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{m.stores?.name || "متجر"}</div>
                  {m.stores?.area && (
                    <div className="text-xs text-muted-foreground truncate">{m.stores.area}</div>
                  )}
                </div>
                <div className="text-sm font-bold text-primary shrink-0">{fmtRial(Number(m.price))}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

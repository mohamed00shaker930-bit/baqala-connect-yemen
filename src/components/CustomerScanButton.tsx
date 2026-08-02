import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart, type CartItem } from "@/lib/cart";
import { getCachedLocation, haversineKm } from "@/lib/geo";

type Candidate = { storeId: string; storeName: string; item: CartItem; dist: number };

export function CustomerScanButton() {
  const cartState = useCart();
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<Candidate | null>(null);

  const doAdd = (c: Candidate) => {
    cart.add(c.storeId, c.storeName, c.item);
    toast.success(`أُضيف ${c.item.name} من ${c.storeName} إلى السلة`);
  };

  const onDetected = async (code: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, in_stock, store_id, stores!inner(id, name, lat, lng)")
        .eq("barcode", code);
      if (error) throw error;
      setScanOpen(false);

      const rows = (data ?? []).filter((p: any) => p.in_stock !== false && p.stores);
      if (rows.length === 0) {
        toast.error("هذا المنتج غير متوفّر في أي متجر حالياً");
        return;
      }

      const loc = getCachedLocation();
      const cands: Candidate[] = rows.map((p: any) => {
        const s = p.stores;
        const dist = loc && s.lat != null && s.lng != null
          ? haversineKm(loc, { lat: Number(s.lat), lng: Number(s.lng) })
          : Number.POSITIVE_INFINITY;
        return {
          storeId: p.store_id,
          storeName: s.name as string,
          dist,
          item: { productId: p.id, name: p.name, price: Number(p.price), qty: 1, imageUrl: p.image_url } as CartItem,
        };
      });
      cands.sort((a, b) => a.dist - b.dist);
      const best = cands[0];

      if (cartState.storeId && cartState.storeId !== best.storeId && cartState.items.length > 0) {
        setPendingSwitch(best);
        return;
      }
      doAdd(best);
    } catch (e: any) {
      console.error(e);
      setScanOpen(false);
      toast.error("تعذّر البحث عن الباركود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setScanOpen(true)}
        className="text-primary-foreground hover:bg-primary-foreground/10"
        aria-label="مسح باركود منتج"
      >
        <ScanBarcode className="w-5 h-5" />
      </Button>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={onDetected}
        title="امسح باركود المنتج"
      />

      <AlertDialog open={!!pendingSwitch} onOpenChange={(o) => !o && setPendingSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تبديل المتجر؟</AlertDialogTitle>
            <AlertDialogDescription>
              سلتك الحالية من متجر آخر، وإضافة هذا المنتج ستُفرغها. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingSwitch) doAdd(pendingSwitch); setPendingSwitch(null); }}>
              متابعة وتفريغ السلة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";

type BarcodeSearchButtonProps = {
  storeId: string;
  onFound: (productName: string) => void;
};

export function BarcodeSearchButton({ storeId, onFound }: BarcodeSearchButtonProps) {
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDetected = async (code: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("barcode", code)
        .maybeSingle();
      if (error) throw error;
      setScanOpen(false);
      if (!data) {
        toast.error("هذا الباركود غير موجود في منتجات هذا المتجر");
      } else {
        onFound(data.name);
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
    </>
  );
}

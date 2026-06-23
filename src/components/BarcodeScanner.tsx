import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function BarcodeScanner({
  open,
  onClose,
  onDetected,
  title = "مسح الباركود",
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (cancelled) return;
            if (result) {
              const code = result.getText();
              try { navigator.vibrate?.(60); } catch {}
              onDetected(code);
            }
          },
        );
        controlsRef.current = controls;
      } catch (e) {
        console.error("camera error", e);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute inset-8 border-2 border-primary/80 rounded-lg pointer-events-none" />
        </div>
        <div className="p-3">
          <Button variant="outline" className="w-full" onClick={onClose}>
            <X className="w-4 h-4 ml-1" /> إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

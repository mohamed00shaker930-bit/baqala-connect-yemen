import { useEffect, useRef, useState } from "react";
import { isLockEnabled, isLockedNow, markLocked, markUnlocked, verifyPin, PIN_LENGTH, clearPin } from "@/lib/app-lock";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Delete, ShoppingBasket } from "lucide-react";

const IDLE_MS = 5 * 60 * 1000;

export function LockScreen() {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Initial mount: if enabled and previously locked OR fresh visit, lock.
  useEffect(() => {
    if (!isLockEnabled()) return;
    if (isLockedNow()) {
      setLocked(true);
    } else {
      // lock on every cold start
      markLocked();
      setLocked(true);
    }
  }, []);

  // Idle / visibility based auto-lock
  useEffect(() => {
    if (!isLockEnabled()) return;
    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        markLocked();
        setLocked(true);
      }, IDLE_MS);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        markLocked();
        setLocked(true);
      } else {
        reset();
      }
    };
    const events: (keyof DocumentEventMap)[] = ["click", "keydown", "touchstart", "scroll", "mousemove"];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", onVis);
    reset();
    return () => {
      events.forEach((e) => document.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", onVis);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [locked]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    (async () => {
      const ok = await verifyPin(pin);
      if (ok) {
        markUnlocked();
        setLocked(false);
        setPin("");
        setError(false);
      } else {
        setError(true);
        try { navigator.vibrate?.(120); } catch {}
        setTimeout(() => { setPin(""); setError(false); }, 600);
      }
    })();
  }, [pin]);

  if (!locked) return null;

  const press = (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    setPin((p) => p + d);
  };
  const back = () => setPin((p) => p.slice(0, -1));
  const forgot = async () => {
    if (!confirm("سيتم تسجيل خروجك وحذف رمز القفل. متابعة؟")) return;
    clearPin();
    await supabase.auth.signOut();
    location.href = "/auth";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-3">
        <ShoppingBasket className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-bold mb-1">بقالتي مقفل</h2>
      <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1"><Lock className="w-3 h-3" /> أدخل رمز الدخول</p>

      <div className={`flex gap-3 mb-8 ${error ? "animate-pulse" : ""}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              error ? "bg-destructive" : i < pin.length ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="aspect-square rounded-full bg-accent hover:bg-accent/70 text-2xl font-bold transition active:scale-95"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press("0")}
          className="aspect-square rounded-full bg-accent hover:bg-accent/70 text-2xl font-bold transition active:scale-95"
        >0</button>
        <button
          onClick={back}
          className="aspect-square rounded-full flex items-center justify-center hover:bg-accent transition"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      <button onClick={forgot} className="mt-6 text-xs text-muted-foreground underline">
        نسيت الرمز؟
      </button>
    </div>
  );
}

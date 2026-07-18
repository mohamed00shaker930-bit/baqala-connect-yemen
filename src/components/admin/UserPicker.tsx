import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type PickedUser = { user_id: string; name: string | null; phone: string | null };

export function UserPicker({
  value,
  onChange,
  placeholder = "ابحث بالاسم أو رقم الجوال",
  kind = null,
  disabled = false,
}: {
  value: PickedUser | null;
  onChange: (u: PickedUser | null) => void;
  placeholder?: string;
  kind?: "customer" | "merchant" | "staff" | null;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<PickedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  // reset search state when kind changes
  useEffect(() => {
    setQ("");
    setDebounced("");
    setResults([]);
    setOpen(false);
  }, [kind]);

  useEffect(() => {
    if (value) return;
    if (debounced.length < 2) { setResults([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).rpc("admin_list_users", {
        p_kind: kind,
        p_category_slug: null,
        p_role: null,
        p_search: debounced,
        p_limit: 8,
        p_offset: 0,
      });
      if (cancelled) return;
      setResults(((data as any[]) || []).map((r) => ({ user_id: r.user_id, name: r.name, phone: r.phone })));
      setOpen(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced, value, kind]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 bg-muted/40">
        <span className="text-sm font-medium truncate flex-1">
          {value.name || "—"}
          {value.phone && <span className="text-xs text-muted-foreground mr-2 ms-2">{value.phone}</span>}
        </span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { onChange(null); setQ(""); setResults([]); }}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        disabled={disabled}
      />
      {!disabled && open && (loading || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-64 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">جاري البحث...</div>}
          {!loading && results.map((r) => (
            <button
              key={r.user_id}
              type="button"
              className="w-full text-right px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 justify-between"
              onClick={() => { onChange(r); setOpen(false); setQ(""); }}
            >
              <span className="truncate">{r.name || "—"}</span>
              <span className="text-xs text-muted-foreground">{r.phone || ""}</span>
            </button>
          ))}
          {!disabled && !loading && results.length === 0 && debounced.length >= 2 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">لا نتائج</div>
          )}
        </div>
      )}
    </div>
  );
}

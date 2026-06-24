import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

export type PickedCustomer = {
  kind: "registered" | "pending";
  id: string;
  name: string;
  phone: string;
};

function normalizeYemenPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("967")) return "+" + digits;
  if (digits.startsWith("7") && digits.length === 9) return "+967" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+967" + digits.slice(1);
  return null;
}

export function CustomerPicker({
  storeId,
  value,
  onChange,
}: {
  storeId: string;
  value: PickedCustomer | null;
  onChange: (c: PickedCustomer | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string | null; phone: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const doSearch = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data, error } = await supabase.rpc("search_customers_by_name", { _q: text.trim() });
    setSearching(false);
    if (!error) setResults((data ?? []) as any);
  };

  const createPending = async () => {
    if (!newName.trim()) { toast.error("اكتب اسم العميل"); return; }
    const phone = normalizeYemenPhone(newPhone);
    if (!phone) { toast.error("رقم جوال غير صحيح"); return; }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data, error } = await supabase.from("pending_customers")
      .insert({ store_id: storeId, name: newName.trim(), phone, created_by: uid })
      .select().single();
    if (error) { toast.error(error.message); return; }
    onChange({ kind: "pending", id: data.id, name: data.name, phone: data.phone });
    setOpenNew(false); setNewName(""); setNewPhone("");
  };

  if (value) {
    return (
      <div className="flex items-center justify-between bg-accent/50 rounded p-2">
        <div>
          <p className="font-medium text-sm">{value.name} {value.kind === "pending" && <span className="text-[10px] text-amber-600">(غير مسجل)</span>}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{value.phone}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onChange(null)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>العميل</Label>
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pr-9" placeholder="ابحث بالاسم أو الجوال..." value={q} onChange={(e) => doSearch(e.target.value)} />
      </div>
      {searching && <p className="text-xs text-muted-foreground">جاري البحث...</p>}
      {results.length > 0 && (
        <div className="border rounded divide-y max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange({ kind: "registered", id: r.id, name: r.name || "—", phone: r.phone || "" })}
              className="w-full text-right p-2 hover:bg-accent flex justify-between items-center"
            >
              <span className="text-sm">{r.name || "—"}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">{r.phone}</span>
            </button>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpenNew(true)}>
        <UserPlus className="w-4 h-4 ml-1" /> عميل جديد غير مسجل
      </Button>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            عند تسجيل العميل لاحقاً في التطبيق بنفس الرقم سترتبط مديونياته تلقائياً.
          </p>
          <Input placeholder="اسم العميل" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input dir="ltr" inputMode="tel" placeholder="7XXXXXXXX" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <Button onClick={createPending}>حفظ</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

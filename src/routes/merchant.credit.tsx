import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtRial, fmtDate } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/merchant/credit")({
  ssr: false,
  component: MerchantCredit,
});

function MerchantCredit() {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({
    queryKey: ["store-credit"],
    queryFn: async () => {
      const { data } = await supabase.from("credit_accounts")
        .select("*, profiles!credit_accounts_customer_id_fkey(name,phone), credit_transactions(*)")
        .order("balance", { ascending: false });
      return data ?? [];
    },
  });

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [type, setType] = useState<"charge" | "payment">("payment");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const add = async () => {
    if (!openFor || !amount) return;
    const { error } = await supabase.from("credit_transactions").insert({
      account_id: openFor, type, amount: Number(amount), note: note || null,
    });
    if (error) toast.error(error.message); else { toast.success("تم التسجيل"); setOpenFor(null); setAmount(""); setNote(""); qc.invalidateQueries(); }
  };

  const totalDebt = accounts?.reduce((s, a) => s + Number(a.balance), 0) ?? 0;

  return (
    <MerchantShell title="دفتر الأجل">
      <Card className="p-4 mb-4 bg-foreground text-background">
        <p className="text-xs opacity-70">إجمالي الديون المستحقة</p>
        <p className="text-2xl font-bold mt-1">{fmtRial(totalDebt)}</p>
        <p className="text-[11px] mt-1 opacity-70">بدون فوائد — قاعدة شرعية</p>
      </Card>

      <div className="space-y-3">
        {accounts?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد حسابات أجل.</Card>}
        {accounts?.map((a: any) => (
          <Card key={a.id} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-bold">{a.profiles?.name || "عميل"}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{a.profiles?.phone}</p>
              </div>
              <span className="font-bold text-primary">{fmtRial(a.balance)}</span>
            </div>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {a.credit_transactions?.slice(0, 6).map((t: any) => (
                <div key={t.id} className="flex justify-between border-b last:border-0 py-1">
                  <span className={t.type === "charge" ? "text-destructive" : "text-success"}>
                    {t.type === "charge" ? "مديونية" : "دفعة"}
                  </span>
                  <span className="text-muted-foreground">{fmtDate(t.created_at)}</span>
                  <span>{fmtRial(t.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setType("payment"); setOpenFor(a.id); }}>تسجيل دفعة</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setType("charge"); setOpenFor(a.id); }}>إضافة مديونية</Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!openFor} onOpenChange={(v) => !v && setOpenFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{type === "payment" ? "تسجيل دفعة" : "إضافة مديونية"}</DialogTitle></DialogHeader>
          <Input dir="ltr" placeholder="المبلغ" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={add}>حفظ</Button>
        </DialogContent>
      </Dialog>
    </MerchantShell>
  );
}

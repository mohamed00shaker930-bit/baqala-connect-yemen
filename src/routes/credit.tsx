import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { fmtRial, fmtDate } from "@/lib/format";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/credit")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: CreditPage,
});

function CreditPage() {
  const { data: accounts } = useQuery({
    queryKey: ["my-credit"],
    queryFn: async () => {
      const { data } = await supabase.from("credit_accounts")
        .select("*, stores(name), credit_transactions(*)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalDebt = accounts?.reduce((s, a) => s + Number(a.balance), 0) ?? 0;

  return (
    <CustomerShell title="دفتر الأجل">
      <Card className="p-4 mb-4 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">إجمالي المستحق عليك</p>
            <p className="text-2xl font-bold mt-1">{fmtRial(totalDebt)}</p>
          </div>
          <Wallet className="w-10 h-10 opacity-50" />
        </div>
        <p className="text-[11px] mt-2 opacity-80">بدون فوائد أو غرامات تأخير — مبلغ ثابت</p>
      </Card>

      <div className="space-y-3">
        {accounts?.length === 0 && <Card className="p-8 text-center text-muted-foreground">لا توجد حسابات أجل بعد.</Card>}
        {accounts?.map((a: any) => (
          <Card key={a.id} className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">{a.stores?.name}</h3>
              <span className="font-bold text-primary">{fmtRial(a.balance)}</span>
            </div>
            <div className="space-y-1 text-sm">
              {a.credit_transactions?.slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex justify-between border-b last:border-0 py-1.5">
                  <span className={t.type === "charge" ? "text-destructive" : "text-success"}>
                    {t.type === "charge" ? "+ مديونية" : "- دفعة"}
                  </span>
                  <span className="text-muted-foreground text-xs">{fmtDate(t.created_at)}</span>
                  <span className="font-medium">{fmtRial(t.amount)}</span>
                </div>
              ))}
              {!a.credit_transactions?.length && <p className="text-xs text-muted-foreground text-center py-2">لا حركات بعد</p>}
            </div>
          </Card>
        ))}
      </div>
    </CustomerShell>
  );
}

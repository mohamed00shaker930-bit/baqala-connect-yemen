import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerShell } from "@/components/CustomerShell";
import { Card } from "@/components/ui/card";
import { Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/profile")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });

  return (
    <CustomerShell title="حسابي">
      <Card className="p-6 text-center mb-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-3xl font-bold mb-3">
          {profile?.name?.[0] || "؟"}
        </div>
        <h2 className="font-bold text-lg">{profile?.name || "بدون اسم"}</h2>
        <p className="text-sm text-muted-foreground" dir="ltr">{profile?.phone}</p>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold mb-2">المساعدة</h3>
        <a href="tel:+967700000000" className="flex items-center gap-3 p-2 rounded hover:bg-accent">
          <Phone className="w-5 h-5 text-primary" /> اتصل بنا
        </a>
        <a href="https://wa.me/967700000000" target="_blank" className="flex items-center gap-3 p-2 rounded hover:bg-accent">
          <MessageCircle className="w-5 h-5 text-success" /> واتساب
        </a>
      </Card>
    </CustomerShell>
  );
}

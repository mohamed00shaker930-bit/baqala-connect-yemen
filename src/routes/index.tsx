import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/auth-helpers";

export const Route = createFileRoute("/")({
  ssr: false,
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth", replace: true }); return; }
      const role = await getUserRole(data.session.user.id);
      if (!role) navigate({ to: "/choose-role", replace: true });
      else if (role === "merchant") navigate({ to: "/merchant", replace: true });
      else navigate({ to: "/home", replace: true });
    })();
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

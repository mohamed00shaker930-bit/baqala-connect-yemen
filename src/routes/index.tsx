import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/auth-helpers";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const role = await getUserRole(data.session.user.id);
    if (!role) throw redirect({ to: "/choose-role" });
    if (role === "merchant") throw redirect({ to: "/merchant" });
    throw redirect({ to: "/home" });
  },
  component: () => null,
});

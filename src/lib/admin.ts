import { supabase } from "@/integrations/supabase/client";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await (supabase as any)
    .from("app_admins")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return !!data;
}

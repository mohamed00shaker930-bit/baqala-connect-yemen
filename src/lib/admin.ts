import { supabase } from "@/integrations/supabase/client";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await (supabase as any).rpc("is_admin", { _uid: auth.user.id });
  if (error) {
    console.error("Admin check failed", error);
    return false;
  }
  return data === true;
}

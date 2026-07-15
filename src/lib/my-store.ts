import { supabase } from "@/integrations/supabase/client";
import { metaGet, metaSet } from "./offline-db";

const STORE_META_KEY = "my-store";

export async function fetchMyStore() {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) {
    return (await metaGet<any>(STORE_META_KEY)) ?? null;
  }
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      try { await metaSet(STORE_META_KEY, data); } catch {}
    }
    return data;
  } catch {
    return (await metaGet<any>(STORE_META_KEY)) ?? null;
  }
}

import { supabase } from "@/integrations/supabase/client";

/** Yemeni mobile: 9 digits, starts with 77/78/71/73 (no country code). */
export function isValidYemeniPhone(p: string): boolean {
  return /^(77|78|71|73)\d{7}$/.test(p);
}

/** Auth identity email derived from the bare 9-digit phone. */
export function phoneToEmail(phone: string): string {
  return `${phone}@baqalati.app`;
}

export async function signIn(phone: string, password: string) {
  return supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
}

export async function getUserRole(userId: string): Promise<"customer" | "merchant" | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return (data?.role as "customer" | "merchant" | null) ?? null;
}

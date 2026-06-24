import { supabase } from "@/integrations/supabase/client";

// Demo/fake OTP system. Real Twilio integration can replace generateOtp + verify.
const OTP_KEY = "baqalati_pending_otp";

export function normalizePhone(raw: string): string {
  // Keep digits, prepend Yemen country code if missing
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("967")) return "+" + digits;
  if (digits.startsWith("00967")) return "+" + digits.slice(2);
  if (digits.startsWith("7") && digits.length === 9) return "+967" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+967" + digits.slice(1);
  return "+" + digits;
}

export function phoneToEmail(phone: string): string {
  // Use phone as the email identity for Supabase auth (demo)
  return `${phone.replace(/\D/g, "")}@baqalati.app`;
}

export function phoneToPassword(phone: string): string {
  // Deterministic password (demo only — replace with real SMS OTP via Twilio later)
  return `Baqalati!${phone.replace(/\D/g, "")}_secret`;
}

export function generateOtp(phone: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  if (typeof window !== "undefined") {
    sessionStorage.setItem(OTP_KEY, JSON.stringify({ phone, code, ts: Date.now() }));
  }
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(OTP_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.phone !== phone) return false;
    if (Date.now() - data.ts > 10 * 60 * 1000) return false;
    return data.code === code;
  } catch { return false; }
}

export function clearOtp() {
  if (typeof window !== "undefined") sessionStorage.removeItem(OTP_KEY);
}

/** Sign in with the phone-derived demo credentials, creating the account if needed. */
export async function signInOrSignUpWithPhone(phone: string, name?: string) {
  const email = phoneToEmail(phone);
  const password = phoneToPassword(phone);

  // Try sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError && signInData.user) {
    // ensure profile exists
    await ensureProfile(signInData.user.id, phone, name);
    return signInData.user;
  }

  // Otherwise sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { phone, name: name ?? null } },
  });
  if (signUpError) throw signUpError;
  if (!signUpData.user) throw new Error("لم نتمكن من إنشاء الحساب");

  // Sign in (in case session wasn't returned)
  if (!signUpData.session) {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error) throw retry.error;
  }
  await ensureProfile(signUpData.user.id, phone, name);
  return signUpData.user;
}

async function ensureProfile(userId: string, phone: string, name?: string) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!existing) {
    await supabase.from("profiles").insert({ id: userId, phone, name: name ?? null });
  } else if (name) {
    await supabase.from("profiles").update({ name }).eq("id", userId);
  }
}

export async function getUserRole(userId: string): Promise<"customer" | "merchant" | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return (data?.role as "customer" | "merchant" | null) ?? null;
}

export async function setUserRole(_userId: string, role: "customer" | "merchant") {
  const { error } = await supabase.rpc("assign_my_role", { _role: role });
  if (error && !/already assigned/i.test(error.message)) throw error;
}

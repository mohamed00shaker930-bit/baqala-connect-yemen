import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Store as StoreIcon, Phone, ShoppingBasket, Copy, Check } from "lucide-react";
import {
  generateOtp, verifyOtp, normalizePhone, clearOtp,
  signInOrSignUpWithPhone, getUserRole,
} from "@/lib/auth-helpers";
import { isCurrentUserAdmin } from "@/lib/admin";

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("لم نتمكن من نسخ الرمز");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-medium text-white hover:bg-white/30 active:bg-white/40 transition-colors min-h-[28px] touch-manipulation"
      aria-label={copied ? "تم النسخ" : "نسخ الرمز"}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "تم النسخ" : "نسخ"}
    </button>
  );
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = () => {
    if (!phoneInput.trim()) { toast.error("الرجاء إدخال رقم الجوال"); return; }
    const p = normalizePhone(phoneInput);
    setPhone(p);
    const code = generateOtp(p);
    toast.success(`رمز التحقق (تجريبي): ${code}`, { duration: 8000, description: "أدخله في الخانة التالية" });
    setStep("otp");
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    if (!verifyOtp(phone, otp)) { toast.error("الرمز غير صحيح أو منتهي"); return; }
    setLoading(true);
    try {
      const user = await signInOrSignUpWithPhone(phone, name || undefined);
      clearOtp();
      toast.dismiss();
      toast.success("تم تسجيل الدخول", { duration: 1500 });
      if (await isCurrentUserAdmin()) { navigate({ to: "/admin" }); return; }
      const role = await getUserRole(user.id);
      if (!role) navigate({ to: "/choose-role" });
      else if (role === "merchant") navigate({ to: "/merchant" });
      else navigate({ to: "/home" });
    } catch (e: any) {
      toast.error(e?.message || "فشل تسجيل الدخول");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-accent/30 to-background">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-3">
            <ShoppingBasket className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">وصل</h1>
          <p className="text-sm text-muted-foreground mt-1">بقالة الحي في جوالك</p>
        </div>

        {step === "phone" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم (اختياري)</Label>
              <Input placeholder="اسمك" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> رقم الجوال</Label>
              <Input
                inputMode="tel" dir="ltr"
                placeholder="7XXXXXXXX"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
              <p className="text-xs text-muted-foreground">سيتم إرسال رمز تحقق (تجريبي يظهر على الشاشة الآن).</p>
            </div>
            <Button onClick={sendOtp} className="w-full h-12 text-base">إرسال الرمز</Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-center">أرسلنا رمزاً لـ <span dir="ltr" className="font-bold">{phone}</span></p>
            <div className="flex justify-center" dir="ltr">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verify} disabled={otp.length !== 6 || loading} className="w-full h-12 text-base">
              {loading ? "جاري التحقق..." : "تأكيد"}
            </Button>
            <Button variant="ghost" onClick={() => { setStep("phone"); setOtp(""); }} className="w-full">
              تغيير الرقم
            </Button>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <StoreIcon className="inline w-3 h-3 ml-1" /> عميل أو تاجر؟ ستختار دورك بعد التسجيل.
        </div>
      </Card>
    </div>
  );
}

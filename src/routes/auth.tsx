import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Store as StoreIcon, Phone, ShoppingBasket } from "lucide-react";
import {
  generateOtp, verifyOtp, normalizePhone, clearOtp,
  signInOrSignUpWithPhone, getUserRole,
} from "@/lib/auth-helpers";

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
    toast.success(`رمز التحقق (تجريبي): ${code}`, { duration: 12000, description: "أدخله في الخانة التالية" });
    setStep("otp");
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    if (!verifyOtp(phone, otp)) { toast.error("الرمز غير صحيح أو منتهي"); return; }
    setLoading(true);
    try {
      const user = await signInOrSignUpWithPhone(phone, name || undefined);
      clearOtp();
      const role = await getUserRole(user.id);
      toast.success("تم تسجيل الدخول");
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
          <h1 className="text-2xl font-bold">بقالتي</h1>
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

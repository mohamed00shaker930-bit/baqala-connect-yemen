import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isValidYemeniPhone, phoneToEmail } from "@/lib/auth";

type BusinessCategory = { id: string; name_ar: string };

export function RegisterForm({ kind }: { kind: "customer" | "merchant" }) {
  const isMerchant = kind === "merchant";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isMerchant) return;
    (async () => {
      const { data } = await supabase
        .from("business_categories")
        .select("id,name_ar")
        .eq("is_active", true)
        .order("sort_order");
      setCategories((data as BusinessCategory[]) ?? []);
    })();
  }, [isMerchant]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "هذا الحقل مطلوب.";
    if (!phone.trim()) e.phone = "هذا الحقل مطلوب.";
    else if (!isValidYemeniPhone(phone.trim())) e.phone = "الرقم غير صحيح.";
    if (!city.trim()) e.city = "هذا الحقل مطلوب.";
    if (!district.trim()) e.district = "هذا الحقل مطلوب.";
    if (!address.trim()) e.address = "هذا الحقل مطلوب.";
    if (password.length < 6 || password.length > 50) e.password = "كلمة المرور من 6 إلى 50 حرفاً.";
    if (confirm !== password) e.confirm = "كلمتا المرور غير متطابقتين";
    if (isMerchant) {
      if (!categoryId) e.categoryId = "هذا الحقل مطلوب.";
      if (!businessName.trim()) e.businessName = "هذا الحقل مطلوب.";
    }
    return e;
  }, [name, phone, city, district, address, password, confirm, isMerchant, categoryId, businessName]);

  const valid = Object.keys(errors).length === 0;

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        user_type: kind,
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
      };
      if (isMerchant) {
        data.business_name = businessName.trim();
        data.business_category_id = categoryId;
      }
      const { error } = await supabase.auth.signUp({
        email: phoneToEmail(phone.trim()),
        password,
        options: { data },
      });
      if (error) {
        if (/already registered|already been registered|user already/i.test(error.message)) {
          toast.error("رقم الجوال مستخدم مسبقاً.");
        } else {
          toast.error(error.message || "تعذر إنشاء الحساب");
        }
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
    } catch (e: any) {
      toast.error(e?.message || "تعذر إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-accent/30 to-background">
        <Card className="w-full max-w-md p-6 space-y-5 text-center">
          <CheckCircle2 className="w-14 h-14 mx-auto text-primary" />
          <p className="font-bold">تم إرسال طلب فتح الحساب بنجاح. سيتم إشعارك بعد مراجعة الإدارة.</p>
          <Button asChild className="w-full h-12"><Link to="/auth">العودة لتسجيل الدخول</Link></Button>
        </Card>
      </div>
    );
  }

  const field = (key: string, label: string, node: React.ReactNode) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {node}
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-b from-accent/30 to-background">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">{isMerchant ? "تسجيل تاجر" : "تسجيل مستهلك"}</h1>
          <p className="text-xs text-muted-foreground mt-1">املأ البيانات لإرسال طلب فتح حساب</p>
        </div>

        {isMerchant && field("categoryId", "نوع النشاط",
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="اختر نوع النشاط" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {isMerchant && field("businessName", "اسم النشاط",
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        )}

        {field("name", "الاسم الرباعي", <Input value={name} onChange={(e) => setName(e.target.value)} />)}
        {field("phone", "رقم الجوال",
          <Input inputMode="tel" dir="ltr" maxLength={9} placeholder="7XXXXXXXX" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
        )}
        {field("city", "المدينة", <Input value={city} onChange={(e) => setCity(e.target.value)} />)}
        {field("district", "المديرية", <Input value={district} onChange={(e) => setDistrict(e.target.value)} />)}
        {field("address", "العنوان", <Input value={address} onChange={(e) => setAddress(e.target.value)} />)}
        {field("password", "كلمة المرور",
          <PasswordInput dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        {field("confirm", "تأكيد كلمة المرور",
          <PasswordInput dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        )}

        <Button onClick={submit} disabled={!valid || loading} className="w-full h-12 text-base">
          {loading ? "جاري الإرسال..." : "إرسال طلب فتح حساب"}
        </Button>
        <div className="text-center">
          <Link to="/auth" className="text-sm text-primary underline">العودة لتسجيل الدخول</Link>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ERR: Record<string, string> = {
  invalid_phone: "رقم الجوال غير صحيح (٩ إلى ١٥ رقمًا)",
  weak_password: "كلمة المرور يجب ألا تقل عن ٦ أحرف",
  name_required: "الاسم مطلوب",
  business_required: "اسم النشاط مطلوب للتاجر",
  phone_taken: "يوجد حساب مسجّل بهذا الرقم مسبقًا",
  forbidden: "لا تملك صلاحية إنشاء المستخدمين",
  create_failed: "تعذّر إنشاء الحساب",
  profile_failed: "تعذّر حفظ بيانات الحساب",
  auth_failed: "انتهت الجلسة، أعد تسجيل الدخول",
  server_error: "حدث خطأ في الخادم",
};

export function CreateUserDialog({ onCreated }: { onCreated?: () => void }) {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userType, setUserType] = useState("customer");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    let m = true;
    (async () => {
      const { data } = await (supabase as any).rpc("my_permissions", {});
      if (!m) return;
      setAllowed(!!data && (data.super === true || (Array.isArray(data.perms) && data.perms.includes("users.create"))));
    })();
    return () => { m = false; };
  }, []);

  if (!allowed) return null;

  const reset = () => { setPhone(""); setPassword(""); setName(""); setBusinessName(""); setCity(""); setDistrict(""); setAddress(""); setUserType("customer"); };

  const submit = async () => {
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    if (!/^\d{9,15}$/.test(phone.replace(/\D/g, ""))) { toast.error("رقم الجوال غير صحيح"); return; }
    if (password.length < 6) { toast.error("كلمة المرور قصيرة"); return; }
    if (userType === "merchant" && !businessName.trim()) { toast.error("اسم النشاط مطلوب"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { phone, password, name: name.trim(), user_type: userType, business_name: businessName.trim() || null, city: city.trim() || null, district: district.trim() || null, address: address.trim() || null },
    });
    setBusy(false);
    if (error) { toast.error("تعذّر الاتصال بالخادم"); return; }
    const res = data as { ok?: boolean; error?: string };
    if (res?.error) { toast.error(ERR[res.error] || "تعذّر إنشاء المستخدم"); return; }
    toast.success("تم إنشاء المستخدم بنجاح");
    reset(); setOpen(false); onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><UserPlus className="w-4 h-4" /> إضافة مستخدم</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
          <DialogDescription>أنشئ حساب عميل أو تاجر مفعّلًا مباشرة.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">نوع الحساب</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">عميل</SelectItem>
                <SelectItem value="merchant">تاجر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          {userType === "merchant" && <div className="space-y-1"><Label className="text-xs">اسم النشاط</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>}
          <div className="space-y-1"><Label className="text-xs">رقم الجوال</Label><Input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XXXXXXXX" /></div>
          <div className="space-y-1"><Label className="text-xs">كلمة المرور</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="٦ أحرف على الأقل" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">المدينة</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">المديرية</Label><Input value={district} onChange={(e) => setDistrict(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">العنوان</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

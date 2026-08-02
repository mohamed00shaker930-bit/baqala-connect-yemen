import { fetchMyStore } from "@/lib/my-store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MerchantShell } from "@/components/MerchantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPicker } from "@/components/MapPicker";
import { MapPin, KeyRound } from "lucide-react";
import type { LatLng } from "@/lib/geo";

export const Route = createFileRoute("/merchant/settings")({
  ssr: false,
  component: MerchantSettings,
});

function MerchantSettings() {
  const qc = useQueryClient();
  const { data: store } = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore });
  const [form, setForm] = useState({ name: "", area: "", delivery_info: "", phone: "", is_open: true });
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name, area: store.area || "", delivery_info: store.delivery_info || "",
        phone: store.phone || "", is_open: store.is_open,
      });
      if (store.lat != null && store.lng != null) {
        setCoords({ lat: Number(store.lat), lng: Number(store.lng) });
      }
    }
  }, [store]);

  const save = async () => {
    if (!store) return;
    const payload: any = { ...form };
    if (coords) { payload.lat = coords.lat; payload.lng = coords.lng; }
    const { error } = await supabase.from("stores").update(payload).eq("id", store.id);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); qc.invalidateQueries(); }
  };

  return (
    <MerchantShell title="إعدادات المتجر">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between p-3 bg-accent/30 rounded">
          <Label className="font-bold">المتجر مفتوح للطلبات</Label>
          <Switch checked={form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} />
        </div>
        <div><Label>اسم المتجر</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>الحي / المنطقة</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
        <div><Label>رقم الجوال</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>معلومات التوصيل / الرسوم</Label><Textarea rows={3} value={form.delivery_info} onChange={(e) => setForm({ ...form, delivery_info: e.target.value })} /></div>
        <div>
          <Label>موقع المتجر على الخريطة</Label>
          <Button type="button" variant="outline" className="w-full mt-1" onClick={() => setPickerOpen(true)}>
            <MapPin className="w-4 h-4 ml-1" />
            {coords ? `محدد: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "اختر موقع متجرك"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-1">يساعد العملاء على رؤية الأقرب وترتيب المتاجر بناءً على موقعهم.</p>
        </div>
        <Button onClick={save} className="w-full h-12">حفظ</Button>
      </Card>

      <Card className="p-4 mt-4">
        <h3 className="font-bold flex items-center gap-2 mb-3"><KeyRound className="w-4 h-4 text-primary" /> الحساب</h3>
        <Button asChild variant="outline" className="w-full">
          <Link to="/change-password">تغيير كلمة المرور</Link>
        </Button>
      </Card>

      <MapPicker open={pickerOpen} onOpenChange={setPickerOpen} initial={coords} onPick={setCoords} title="موقع متجرك" />
    </MerchantShell>
  );
}

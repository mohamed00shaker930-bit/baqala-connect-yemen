import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/broadcast")({ component: Page });

function Page() {
  const [segment, setSegment] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("املأ العنوان والنص"); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("admin_broadcast_notification", {
      _segment: segment, _title: title, _body: body, _link: link || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`تم الإرسال إلى ${data ?? 0} مستخدم`);
    setTitle(""); setBody(""); setLink("");
  };

  return (
    <AdminShell title="إشعار جماعي">
      <Card className="p-4 space-y-3">
        <div>
          <Label>الفئة المستهدفة</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {[["all", "الكل"], ["customers", "العملاء"], ["merchants", "التجار"]].map(([v, l]) => (
              <Button key={v} type="button" size="sm" variant={segment === v ? "default" : "outline"} onClick={() => setSegment(v)}>{l}</Button>
            ))}
          </div>
        </div>
        <div>
          <Label>العنوان</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عرض جديد!" />
        </div>
        <div>
          <Label>النص</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="تفاصيل الإشعار..." rows={4} />
        </div>
        <div>
          <Label>رابط (اختياري)</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/home" />
        </div>
        <Button onClick={send} disabled={busy} className="w-full">{busy ? "جارٍ الإرسال..." : "إرسال الإشعار"}</Button>
      </Card>
    </AdminShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { LoginSessionsList } from "@/components/admin/LoginSessionsList";
import { AppUsageList } from "@/components/admin/AppUsageList";
import { UserPicker, type PickedUser } from "@/components/admin/UserPicker";
import { TABLE_LABELS_AR } from "@/lib/audit-dict";
import { X } from "lucide-react";


export const Route = createFileRoute("/admin/audit")({ component: Page });

const ACTIONS = [
  { v: "INSERT", l: "إضافة" },
  { v: "UPDATE", l: "تعديل" },
  { v: "DELETE", l: "حذف" },
];

const ROLE_GROUPS = [
  { v: "customer", l: "عميل" },
  { v: "merchant", l: "تاجر" },
  { v: "staff", l: "الإدارة" },
  { v: "system", l: "النظام" },
] as const;


const SESSION_FILTERS = [
  { v: "all", l: "الكل" },
  { v: "active", l: "نشطة" },
  { v: "ended", l: "منتهية" },
] as const;

const USAGE_FILTERS = [
  { v: "all", l: "الكل" },
  { v: "open", l: "مفتوح الآن" },
  { v: "closed", l: "مغلق" },
] as const;

function Page() {
  const [roleGroup, setRoleGroup] = useState<string>("all");
  const [pickedUser, setPickedUser] = useState<PickedUser | null>(null);
  const [action, setAction] = useState<string>("all");
  const [tableName, setTableName] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [sessionStatus, setSessionStatus] = useState<"all" | "active" | "ended">("all");
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionUser, setSessionUser] = useState<PickedUser | null>(null);

  const [usageStatus, setUsageStatus] = useState<"all" | "open" | "closed">("all");
  const [usageTotal, setUsageTotal] = useState(0);
  const [usageUser, setUsageUser] = useState<PickedUser | null>(null);

  const pickerKind: "customer" | "merchant" | "staff" | null =
    roleGroup === "customer" || roleGroup === "merchant" || roleGroup === "staff"
      ? (roleGroup as any)
      : null;
  const pickerDisabled = roleGroup === "system";

  const filter = useMemo(() => ({
    userName: null,
    userId: pickedUser?.user_id ?? null,
    roleGroup: roleGroup === "all" ? null : (roleGroup as any),
    action: action === "all" ? null : action,
    tableName: tableName === "all" ? null : tableName,
    from: from ? new Date(from).toISOString() : null,
    to: to ? new Date(to + "T23:59:59").toISOString() : null,
  }), [pickedUser, roleGroup, action, tableName, from, to]);

  const clear = () => {
    setRoleGroup("all"); setPickedUser(null);
    setAction("all"); setTableName("all");
    setFrom(""); setTo("");
  };


  const tableOptions = Object.entries(TABLE_LABELS_AR).sort((a, b) => a[1].localeCompare(b[1], "ar"));

  return (
    <AdminShell title="سجل العمليات">
      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="audit" className="text-xs">سجل العمليات</TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs">تسجيلات الدخول والخروج</TabsTrigger>
          <TabsTrigger value="usage" className="text-xs">فتح وإغلاق التطبيق</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card className="p-3 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">نوع النشاط</Label>
                <Select
                  value={roleGroup}
                  onValueChange={(v) => { setRoleGroup(v); setPickedUser(null); }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {ROLE_GROUPS.map((g) => <SelectItem key={g.v} value={g.v}>{g.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">تحديد مستخدم</Label>
                <div className="mt-1">
                  <UserPicker
                    value={pickedUser}
                    onChange={setPickedUser}
                    kind={pickerKind}
                    disabled={pickerDisabled}
                    placeholder={pickerDisabled ? "لا ينطبق على عمليات النظام" : "ابحث بالاسم أو رقم الجوال"}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">العملية</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل العمليات</SelectItem>
                    {ACTIONS.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الجدول</Label>
                <Select value={tableName} onValueChange={setTableName}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">كل الجداول</SelectItem>
                    {tableOptions.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <Label className="text-xs">من</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">إلى</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={clear}>
                <X className="w-4 h-4 ms-1" /> إعادة تعيين
              </Button>
            </div>
          </Card>


          <AuditLogList filter={filter} pageSize={50} showUser />
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="p-3 mb-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {SESSION_FILTERS.map((f) => (
                <Button
                  key={f.v}
                  size="sm"
                  variant={sessionStatus === f.v ? "default" : "outline"}
                  onClick={() => setSessionStatus(f.v)}
                >
                  {f.l}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ms-auto">{sessionTotal} جلسة</span>
            </div>
            <div>
              <Label className="text-xs">تحديد مستخدم</Label>
              <div className="mt-1"><UserPicker value={sessionUser} onChange={setSessionUser} /></div>
            </div>
          </Card>
          <LoginSessionsList
            userId={sessionUser?.user_id ?? null}
            status={sessionStatus === "all" ? null : sessionStatus}
            pageSize={50}
            showUser
            onTotal={setSessionTotal}
          />
        </TabsContent>

        <TabsContent value="usage">
          <Card className="p-3 mb-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {USAGE_FILTERS.map((f) => (
                <Button
                  key={f.v}
                  size="sm"
                  variant={usageStatus === f.v ? "default" : "outline"}
                  onClick={() => setUsageStatus(f.v)}
                >
                  {f.l}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ms-auto">{usageTotal} سجل</span>
            </div>
            <div>
              <Label className="text-xs">تحديد مستخدم</Label>
              <div className="mt-1"><UserPicker value={usageUser} onChange={setUsageUser} /></div>
            </div>
          </Card>
          <AppUsageList
            userId={usageUser?.user_id ?? null}
            status={usageStatus === "all" ? null : usageStatus}
            pageSize={50}
            showUser
            onTotal={setUsageTotal}
          />
        </TabsContent>

      </Tabs>
    </AdminShell>
  );
}

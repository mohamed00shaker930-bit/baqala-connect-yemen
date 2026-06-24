## الخطة النهائية

### 1) ربط المديونية بطلب فعلي يوافق عليه العميل
- حذف زر "طلب مديونية" من `merchant.credit` (يبقى زر "تسجيل دفعة" فقط).
- في `merchant.pos` عند اختيار "آجل":
  - حقل **بحث عن العميل بالاسم** (RPC جديدة `search_customers_by_name(q text)` security definer ترجع `id, name, phone` فقط للنتائج المطابقة، حد أقصى 10 نتائج، بحد أدنى حرفين).
  - زر **"+ عميل جديد"** يفتح Dialog يطلب الاسم ورقم الجوال (إلزامي، تحقق E.164 يمني):
    - يُنشأ سجل في `pending_customers` (جدول جديد: `id, name, phone, store_id, created_by, claimed_by_user_id, created_at`) — لأن العميل لم يسجل بعد في التطبيق.
    - عند تسجيل عميل جديد في التطبيق بنفس رقم الجوال، تربط الديون المعلقة تلقائياً (trigger على `profiles` insert يبحث في `pending_customers` بنفس الرقم).
  - عند الحفظ مع عميل مسجل: يُنشأ `order` بحالة `pending_customer_approval`, `credit_status='pending'` + `order_items` + `credit_transactions` بحالة `pending` (الـ trigger الحالي `apply_credit_tx` لا يحدّث الرصيد إلا بعد `approved`).
  - مع عميل غير مسجل (pending_customer): يُنشأ سجل في جدول `pending_credit_orders` يحتوي تفاصيل الطلب، يتحول لـ order فعلي عند تسجيل العميل وموافقته.
- في `credit.tsx` و `orders.tsx` لدى العميل: قسم "طلبات بانتظار موافقتك" يعرض المنتجات والمبلغ + زر **موافقة** / **رفض**.
  - موافقة: `update credit_transactions set status='approved'` + `update orders set credit_status='approved', status='delivered'`.
  - رفض: الحالتان `rejected` ولا يتأثر الرصيد.

### 2) قفل التطبيق برمز PIN + تذكر العميل
- إعداد PIN في `profile.tsx`: **6 أرقام** (أكثر أماناً، مع ترك الباب مفتوحاً لإضافة بصمة WebAuthn لاحقاً).
- التخزين: hash (SHA-256 + salt عشوائي 16 بايت) في `localStorage`: `app_pin_hash`, `app_pin_salt`, `app_lock_enabled`.
- `LockScreen.tsx`: لوحة أرقام عربية شبيهة بواتساب، تُعرض عند فتح التطبيق إذا كان القفل مفعّلاً والجلسة قائمة. خيار "نسيت الرمز" → تسجيل خروج.
- "تذكرني" في `auth.tsx`: مُفعّل افتراضياً (الحالي `persistSession: true`). إذا أُلغي، نستخدم `sessionStorage` لهذه الجلسة فقط.
- إعادة قفل تلقائي بعد 5 دقائق خمول (قابل للتعطيل في الإعدادات).
- ملاحظة: WebAuthn/بصمة لاحقاً عبر `navigator.credentials` — نتركها كمرحلة ثانية.

### 3) إصلاح ماسح الباركود
في `src/components/BarcodeScanner.tsx`:
- استدعاء صريح لـ `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })`.
- تعيين `video.srcObject = stream` و `await video.play()` صراحة.
- تمرير الـ video element للقارئ بعد بدء التشغيل.
- عرض رسالة خطأ عربية واضحة مع زر "إعادة المحاولة" عند فشل الإذن.
- إيقاف جميع المسارات (`stream.getTracks().forEach(t => t.stop())`) عند الإغلاق.
- التأكد من `playsInline muted autoplay` على عنصر video (لـ iOS).

### الملفات
**Migration:**
- جدول `pending_customers` + `pending_credit_orders` + RLS + GRANTs
- RPC `search_customers_by_name(q)` 
- trigger على `profiles` لربط `pending_customers` بنفس الجوال
- سياسة تسمح للعميل صاحب `credit_transactions.account_id` بتحديث `status` من `pending` إلى `approved/rejected`

**Frontend:**
- `src/components/BarcodeScanner.tsx` (إصلاح الكاميرا)
- `src/components/LockScreen.tsx` (جديد)
- `src/components/CustomerPicker.tsx` (جديد — بحث + إضافة عميل جديد)
- `src/routes/merchant.pos.tsx` (اختيار العميل + آجل معلّق)
- `src/routes/merchant.credit.tsx` (حذف طلب المديونية)
- `src/routes/credit.tsx` و `src/routes/orders.tsx` (موافقة/رفض)
- `src/routes/auth.tsx` (تذكرني)
- `src/routes/profile.tsx` (إعداد PIN 6 أرقام)
- `src/routes/__root.tsx` (تركيب LockScreen + idle timer)

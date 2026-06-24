const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ShadingType, HeadingLevel } = require("docx");
const fs = require("fs");

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function headerCell(text, fill = "2E7D32") {
  return new TableCell({
    borders: cellBorders,
    width: { size: 1200, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20, rightToLeft: true })],
    })],
  });
}

function bodyCell(text, width = 3000) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: text || " ", font: "Arial", size: 18, rightToLeft: true })],
    })],
  });
}

function numberedCell(num) {
  return new TableCell({
    borders: cellBorders,
    width: { size: 600, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: String(num), bold: true, font: "Arial", size: 18, rightToLeft: true })],
    })],
  });
}

const sections = [
  { title: "1) المصادقة وتسجيل الدخول", items: [
    ["1", "تسجيل برقم جوال + OTP", "إدخال الاسم والرقم ← إرسال ← إدخال الرمز الظاهر", "الدخول وتوجيه لاختيار الدور"],
    ["2", "اختيار الدور (عميل)", "الضغط على \"عميل\"", "التوجيه لشاشة /home"],
    ["3", "اختيار الدور (تاجر)", "الضغط على \"تاجر\"", "التوجيه لشاشة /merchant"],
    ["4", "منع تغيير الدور", "محاولة استدعاء assign_my_role بدور آخر", "رسالة \"role already assigned\""],
    ["5", "تسجيل الخروج", "من الإعدادات ← خروج", "الرجوع لشاشة /auth"],
  ]},
  { title: "2) قفل التطبيق (PIN)", items: [
    ["6", "تعيين رمز PIN (6 أرقام)", "الإعدادات ← تعيين الرمز", "حفظ الرمز وتفعيل القفل"],
    ["7", "شاشة القفل عند فتح التطبيق", "إعادة فتح التطبيق", "ظهور شاشة الـ PIN"],
    ["8", "فتح القفل برمز صحيح", "إدخال الرمز الصحيح", "الدخول للتطبيق"],
    ["9", "إدخال رمز خاطئ", "إدخال رمز غير صحيح", "اهتزاز + مسح الحقول"],
    ["10", "القفل التلقائي بعد 5 دقائق خمول", "ترك التطبيق دون نشاط", "شاشة القفل تظهر"],
    ["11", "القفل عند إخفاء التطبيق", "تبديل التطبيق ثم العودة", "شاشة القفل تظهر"],
    ["12", "\"نسيت الرمز؟\"", "الضغط على الرابط + تأكيد", "تسجيل خروج وحذف الرمز"],
    ["13", "تغيير الرمز", "الإعدادات ← تغيير", "حفظ الرمز الجديد"],
    ["14", "إزالة الرمز", "الإعدادات ← إزالة", "تعطيل القفل"],
  ]},
  { title: "3) رحلة العميل", items: [
    ["15", "تصفح المتاجر", "فتح /home", "عرض قائمة المتاجر القريبة"],
    ["16", "عرض تفاصيل متجر", "الضغط على متجر", "عرض المنتجات والتقييم"],
    ["17", "البحث عن منتج", "استخدام شريط البحث", "نتائج مطابقة"],
    ["18", "إضافة منتج للسلة", "زر \"إضافة\"", "زيادة عدّاد السلة"],
    ["19", "تعديل الكميات في السلة", "+ / - في السلة", "تحديث المجموع"],
    ["20", "إتمام طلب نقدي", "السلة ← تأكيد ← نقدي", "إنشاء الطلب وعرضه في /orders"],
    ["21", "طلب منتج خاص (غير موجود)", "زر \"طلب خاص\" + إدخال الاسم", "إرسال طلب للتاجر"],
    ["22", "عرض حالات الطلب", "شاشة /orders", "حالات: قيد المراجعة/مؤكد/مُسلَّم"],
    ["23", "تقييم المتجر بعد التسليم", "بعد طلب مُسلَّم", "حفظ التقييم وتحديث نجوم المتجر"],
    ["24", "عرض دفتر الأجل", "شاشة /credit", "إجمالي المديونية + الحسابات"],
    ["25", "قبول طلب مديونية معلّق", "شاشة /credit ← قبول", "تحديث الرصيد + حالة الطلب \"مُسلَّم\""],
    ["26", "رفض طلب مديونية معلّق", "شاشة /credit ← رفض", "لا يتأثر الرصيد + حالة \"ملغي\""],
  ]},
  { title: "4) رحلة التاجر — المنتجات والكتالوج", items: [
    ["27", "إضافة منتج يدوياً", "المنتجات ← + ← يدوي", "حفظ المنتج وظهوره في القائمة"],
    ["28", "إضافة منتج واحد من المكتبة", "المكتبة ← اختيار منتج", "إضافته لمنتجات المتجر"],
    ["29", "تحديد الكل في المكتبة", "المكتبة ← \"تحديد الكل\" ← إضافة", "إضافة كل المنتجات المعروضة دفعة واحدة"],
    ["30", "إلغاء تحديد الكل", "بعد تحديد الكل ← إلغاء", "إلغاء جميع التحديدات"],
    ["31", "فتح ماسح الباركود", "أيقونة الباركود", "فتح الكاميرا الخلفية"],
    ["32", "منح إذن الكاميرا", "السماح عند الطلب", "عرض البث المباشر"],
    ["33", "رفض إذن الكاميرا", "الرفض", "رسالة عربية واضحة + زر إعادة"],
    ["34", "مسح باركود فعلي", "توجيه الكاميرا لباركود", "تعبئة الحقل تلقائياً + اهتزاز"],
    ["35", "إغلاق الماسح يوقف الكاميرا", "إغلاق الديالوج", "إيقاف ضوء الكاميرا"],
    ["36", "إنشاء فئة جديدة", "إضافة فئة", "حفظها وظهورها في القائمة"],
    ["37", "تعديل/حذف منتج", "من قائمة المنتجات", "تحديث/حذف فوري"],
  ]},
  { title: "5) رحلة التاجر — نقطة البيع (POS)", items: [
    ["38", "بيع نقدي عادي", "إضافة منتجات ← نقدي ← حفظ", "إنشاء طلب بحالة \"مُسلَّم\""],
    ["39", "منع البيع الآجل بدون عميل", "اختيار \"آجل\" + محاولة الحفظ", "رسالة \"اختر العميل\""],
    ["40", "بحث عن عميل بالاسم", "كتابة حرفين+ في حقل البحث", "ظهور نتائج (حد أقصى 10)"],
    ["41", "اختيار عميل موجود", "الضغط على نتيجة", "تعبئة بيانات العميل"],
    ["42", "إضافة عميل جديد (غير مسجل)", "زر \"+ عميل جديد\" ← اسم + جوال", "حفظه في pending_customers"],
    ["43", "حفظ بيع آجل لعميل موجود", "إكمال الحفظ", "إنشاء طلب بحالة pending_customer_approval + معاملة معلقة"],
    ["44", "حفظ بيع آجل لعميل معلّق", "عميل جديد ثم حفظ", "إنشاء سجل في pending_credit_orders"],
    ["45", "ربط مديونية تلقائي عند التسجيل", "تسجيل العميل بنفس رقم الجوال", "تظهر المديونية في حسابه"],
    ["46", "وصول طلب الموافقة للعميل", "فتح حساب العميل", "يراها في /credit كـ \"بانتظار موافقتك\""],
    ["47", "مسح باركود داخل POS", "أيقونة الباركود في POS", "إضافة المنتج للسلة"],
  ]},
  { title: "6) رحلة التاجر — الطلبات والمديونية والإعدادات", items: [
    ["48", "استقبال طلب جديد", "شاشة /merchant/orders", "ظهور الطلب فوراً"],
    ["49", "تأكيد الطلب", "زر تأكيد", "تغيير الحالة + إشعار للعميل"],
    ["50", "تسليم الطلب", "زر تسليم", "تغيير الحالة لـ \"مُسلَّم\""],
    ["51", "رفض/إلغاء طلب", "زر إلغاء", "تغيير الحالة"],
    ["52", "عرض حسابات الأجل", "/merchant/credit", "قائمة العملاء + الأرصدة"],
    ["53", "تسجيل دفعة (تحصيل)", "زر تحصيل + المبلغ", "تقليل الرصيد فوراً"],
    ["54", "عدم وجود زر \"إضافة مديونية يدوية\"", "فحص الشاشة", "يجب ألا يكون موجوداً (المديونية تُنشأ فقط من POS)"],
    ["55", "الموافقة على طلب منتج خاص", "شاشة الطلبات الخاصة", "تحويلها لطلب عادي"],
    ["56", "عرض التقارير", "/merchant/reports", "إحصائيات المبيعات والأجل"],
    ["57", "تعديل بيانات المتجر", "/merchant/settings", "حفظ الاسم/الموقع/الساعات"],
  ]},
  { title: "7) الأمان (اختبار تقني — اختياري)", items: [
    ["58", "منع رفع الدور يدوياً", "محاولة INSERT مباشر على user_roles", "فشل بسبب RLS"],
    ["59", "منع موافقة عميل على مديونية شخص آخر", "استدعاء customer_respond_credit بمعرّف غير مملوك", "خطأ \"not allowed\""],
    ["60", "حماية كلمات المرور المسرّبة (HIBP)", "محاولة كلمة شائعة", "رفض من Supabase Auth"],
    ["61", "عدم تنفيذ دوال definer من anon", "محاولة استدعاء RPC بدون توكن", "فشل التصريح"],
  ]},
];

const docChildren = [
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "جدول اختبار شامل — تطبيق بقالتي", bold: true, font: "Arial", size: 36, rightToLeft: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: "املأ عمودي الحالة والملاحظات أثناء الاختبار. استخدم ✅ للنجاح و❌ للفشل و⚠️ لمشكلة جزئية.", font: "Arial", size: 20, rightToLeft: true, color: "666666" })],
    spacing: { after: 300 },
  }),
];

for (const section of sections) {
  docChildren.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: section.title, bold: true, font: "Arial", size: 26, color: "2E7D32", rightToLeft: true })],
  }));

  const rows = [
    new TableRow({
      children: [
        headerCell("#", "2E7D32"),
        headerCell("الميزة", "2E7D32"),
        headerCell("خطوات الاختبار", "388E3C"),
        headerCell("النتيجة المتوقعة", "388E3C"),
        headerCell("الحالة", "FFA000"),
        headerCell("الملاحظات", "FFA000"),
      ],
    }),
    ...section.items.map((item) => new TableRow({
      children: [
        numberedCell(item[0]),
        bodyCell(item[1], 2400),
        bodyCell(item[2], 3800),
        bodyCell(item[3], 3800),
        bodyCell("", 1200),
        bodyCell("", 2400),
      ],
    })),
  ];

  docChildren.push(new Table({
    width: { size: 14400, type: WidthType.DXA },
    columnWidths: [600, 2400, 3800, 3800, 1200, 2400],
    rows,
  }));
}

docChildren.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  alignment: AlignmentType.RIGHT,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text: "ملاحظات عامة بعد الاختبار", bold: true, font: "Arial", size: 26, color: "2E7D32", rightToLeft: true })],
}));

docChildren.push(new Paragraph({
  alignment: AlignmentType.RIGHT,
  children: [new TextRun({ text: "اكتب هنا أي ملاحظات شاملة، أو ميزات مفقودة، أو تحسينات مقترحة:", font: "Arial", size: 20, rightToLeft: true, color: "666666" })],
}));

for (let i = 0; i < 5; i++) {
  docChildren.push(new Paragraph({
    children: [new TextRun({ text: "________________________________________________________________________", font: "Arial", size: 20, color: "CCCCCC" })],
    spacing: { after: 200 },
  }));
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 20, rightToLeft: true },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 15840, height: 12240, orientation: "landscape" },
        margin: { top: 720, right: 720, bottom: 720, left: 720 },
      },
    },
    children: docChildren,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/mnt/documents/test-checklist.docx", buffer);
  console.log("DOCX created successfully at /mnt/documents/test-checklist.docx");
});

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  normalizePhone,
  phoneToEmail,
  phoneToPassword,
  generateOtp,
  verifyOtp,
  clearOtp,
} from "@/lib/auth-helpers";

describe("تسجيل الدخول — توحيد رقم الجوال اليمني", () => {
  it("يضيف مفتاح اليمن للرقم المحلي المكوّن من 9 أرقام", () => {
    expect(normalizePhone("771234567")).toBe("+967771234567");
  });

  it("يحذف الصفر البادئ ويضيف المفتاح", () => {
    expect(normalizePhone("0771234567")).toBe("+967771234567");
  });

  it("يقبل الرقم الدولي كما هو", () => {
    expect(normalizePhone("967771234567")).toBe("+967771234567");
    expect(normalizePhone("+967 77 123 4567")).toBe("+967771234567");
  });

  it("يحوّل بادئة 00967 إلى +967", () => {
    expect(normalizePhone("00967771234567")).toBe("+967771234567");
  });

  it("يتجاهل المسافات والشرطات والأقواس", () => {
    expect(normalizePhone("(077) 123-45 67")).toBe("+967771234567");
  });

  it("يعطي نفس النتيجة لكل الصيغ المكافئة", () => {
    const forms = ["771234567", "0771234567", "967771234567", "+967771234567", "00967771234567"];
    const out = new Set(forms.map(normalizePhone));
    expect(out.size).toBe(1);
  });
});

describe("تسجيل الدخول — الهوية المشتقة من الرقم", () => {
  it("البريد المشتق ثابت ولا يحتوي رموزاً", () => {
    expect(phoneToEmail("+967771234567")).toBe("967771234567@baqalati.app");
  });

  it("كل الصيغ المكافئة تنتج نفس البريد", () => {
    const a = phoneToEmail(normalizePhone("771234567"));
    const b = phoneToEmail(normalizePhone("00967771234567"));
    expect(a).toBe(b);
  });

  it("أرقام مختلفة تنتج بريداً وكلمة مرور مختلفين", () => {
    expect(phoneToEmail("+967771234567")).not.toBe(phoneToEmail("+967779999999"));
    expect(phoneToPassword("+967771234567")).not.toBe(phoneToPassword("+967779999999"));
  });
});

describe("تسجيل الدخول — رمز التحقق (OTP)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("يولّد رمزاً من 6 أرقام", () => {
    const code = generateOtp("+967771234567");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("يقبل الرمز الصحيح لنفس الرقم", () => {
    const code = generateOtp("+967771234567");
    expect(verifyOtp("+967771234567", code)).toBe(true);
  });

  it("يرفض رمزاً خاطئاً", () => {
    const code = generateOtp("+967771234567");
    const wrong = code === "000000" ? "111111" : "000000";
    expect(verifyOtp("+967771234567", wrong)).toBe(false);
  });

  it("يرفض الرمز الصحيح إذا استُخدم لرقم آخر", () => {
    const code = generateOtp("+967771234567");
    expect(verifyOtp("+967779999999", code)).toBe(false);
  });

  it("يرفض الرمز بعد انتهاء 10 دقائق", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const code = generateOtp("+967771234567");
    vi.setSystemTime(new Date("2026-01-01T10:09:00Z"));
    expect(verifyOtp("+967771234567", code)).toBe(true);
    vi.setSystemTime(new Date("2026-01-01T10:10:01Z"));
    expect(verifyOtp("+967771234567", code)).toBe(false);
  });

  it("يرفض التحقق بلا رمز مُصدَر", () => {
    expect(verifyOtp("+967771234567", "123456")).toBe(false);
  });

  it("clearOtp يبطل الرمز فوراً", () => {
    const code = generateOtp("+967771234567");
    clearOtp();
    expect(verifyOtp("+967771234567", code)).toBe(false);
  });

  it("لا ينهار أمام تخزين تالف", () => {
    sessionStorage.setItem("baqalati_pending_otp", "{broken");
    expect(() => verifyOtp("+967771234567", "123456")).not.toThrow();
    expect(verifyOtp("+967771234567", "123456")).toBe(false);
  });
});

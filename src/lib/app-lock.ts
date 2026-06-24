// PIN-based app lock — 6 digits, SHA-256 + per-device salt in localStorage.
const HASH_KEY = "app_pin_hash";
const SALT_KEY = "app_pin_salt";
const ENABLED_KEY = "app_lock_enabled";
const LOCKED_KEY = "app_locked";
export const PIN_LENGTH = 6;

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return toHex(buf);
}

function randomSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

export function isPinSet() {
  if (typeof localStorage === "undefined") return false;
  return !!localStorage.getItem(HASH_KEY);
}

export function isLockEnabled() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "1" && isPinSet();
}

export function setLockEnabled(on: boolean) {
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
}

export async function setPin(pin: string) {
  if (pin.length !== PIN_LENGTH) throw new Error(`الرمز ${PIN_LENGTH} أرقام`);
  const salt = randomSalt();
  const hash = await sha256(salt + pin);
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(HASH_KEY, hash);
  localStorage.setItem(ENABLED_KEY, "1");
}

export async function verifyPin(pin: string) {
  const salt = localStorage.getItem(SALT_KEY);
  const hash = localStorage.getItem(HASH_KEY);
  if (!salt || !hash) return false;
  const calc = await sha256(salt + pin);
  return calc === hash;
}

export function clearPin() {
  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(SALT_KEY);
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(LOCKED_KEY);
}

export function markLocked() {
  localStorage.setItem(LOCKED_KEY, "1");
}
export function markUnlocked() {
  localStorage.removeItem(LOCKED_KEY);
}
export function isLockedNow() {
  return localStorage.getItem(LOCKED_KEY) === "1";
}

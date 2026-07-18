// تتبّع فتح/إغلاق التطبيق لكل مستخدم. Idempotent + آمن (كل شيء داخل try/catch).
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" ? (process as any).env?.SUPABASE_URL : "");
const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" ? (process as any).env?.SUPABASE_PUBLISHABLE_KEY : "");

let initialized = false;
let currentId: string | null = null;
let accessToken: string | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

function stopPing() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    try {
      if (!currentId) return;
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      (supabase as any).rpc("app_session_ping", { p_id: currentId }).then(() => {}, () => {});
    } catch {}
  }, 60_000);
}

async function openSession() {
  try {
    if (currentId) return;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const { data, error } = await (supabase as any).rpc("app_session_open", { p_user_agent: ua });
    if (error) return;
    if (data) {
      currentId = data as string;
      startPing();
    }
  } catch {}
}

function closeSession() {
  try {
    const id = currentId;
    currentId = null;
    stopPing();
    if (!id) return;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
    };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    try {
      fetch(`${SUPABASE_URL}/rest/v1/rpc/app_session_close`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p_id: id }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  } catch {}
}

export function initAppUsageTracking() {
  try {
    if (initialized) return;
    if (typeof window === "undefined") return;
    initialized = true;

    supabase.auth.getSession().then(({ data }) => {
      try {
        accessToken = data.session?.access_token ?? null;
        if (data.session) openSession();
      } catch {}
    }, () => {});

    supabase.auth.onAuthStateChange((event, session) => {
      try {
        accessToken = session?.access_token ?? null;
        if (event === "SIGNED_OUT") {
          closeSession();
          return;
        }
        if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session) {
          openSession();
        }
      } catch {}
    });

    document.addEventListener("visibilitychange", () => {
      try {
        if (document.visibilityState === "hidden") {
          closeSession();
        } else if (document.visibilityState === "visible") {
          openSession();
        }
      } catch {}
    });

    window.addEventListener("pagehide", () => {
      try { closeSession(); } catch {}
    });
  } catch {}
}

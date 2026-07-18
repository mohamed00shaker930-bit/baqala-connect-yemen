// Browser-only Supabase network fallback.
// If a direct request to VITE_SUPABASE_URL fails with a network error
// (TypeError / "Failed to fetch"), retry via same-origin /api/sb/* proxy.
// After first success, remember the preference and route future calls
// directly through the proxy. Recheck the direct path every ~5 minutes.

if (typeof window !== "undefined" && !(window as any).__wasl_sb_fallback_installed) {
  (window as any).__wasl_sb_fallback_installed = true;

  const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const LS_KEY = "wasl_sb_proxy";
  const RECHECK_MS = 5 * 60 * 1000;

  if (SUPABASE_URL) {
    let supabaseOrigin = "";
    try {
      supabaseOrigin = new URL(SUPABASE_URL).origin;
    } catch {
      /* noop */
    }

    if (supabaseOrigin) {
      let useProxy = false;
      try {
        useProxy = localStorage.getItem(LS_KEY) === "1";
      } catch {
        /* noop */
      }
      let lastRecheck = 0;

      const toProxyUrl = (u: URL) =>
        `${window.location.origin}/api/sb${u.pathname}${u.search}`;

      const parseUrl = (input: RequestInfo | URL): URL | null => {
        try {
          if (typeof input === "string") return new URL(input, window.location.href);
          if (input instanceof URL) return input;
          if (input instanceof Request) return new URL(input.url);
        } catch {
          /* noop */
        }
        return null;
      };

      const isSupabaseHttp = (u: URL) =>
        u.origin === supabaseOrigin &&
        (u.protocol === "http:" || u.protocol === "https:");

      const setUseProxy = (v: boolean) => {
        useProxy = v;
        try {
          if (v) localStorage.setItem(LS_KEY, "1");
          else localStorage.removeItem(LS_KEY);
        } catch {
          /* noop */
        }
      };

      const originalFetch = window.fetch.bind(window);

      const rewriteInit = (input: RequestInfo | URL, init?: RequestInit) => {
        // Preserve method/headers/body when we redirect. When input is a
        // Request, we clone by passing it in as-is against the new URL.
        if (input instanceof Request) {
          return { req: input.clone(), init };
        }
        return { req: null as Request | null, init };
      };

      const proxyFetch = async (
        input: RequestInfo | URL,
        init: RequestInit | undefined,
        url: URL,
      ) => {
        const proxyUrl = toProxyUrl(url);
        if (input instanceof Request) {
          const cloned = input.clone();
          return originalFetch(
            new Request(proxyUrl, {
              method: cloned.method,
              headers: cloned.headers,
              body:
                cloned.method === "GET" || cloned.method === "HEAD"
                  ? undefined
                  : await cloned.blob(),
              credentials: cloned.credentials,
              cache: cloned.cache,
              redirect: cloned.redirect,
              referrer: cloned.referrer,
              integrity: cloned.integrity,
              mode: "cors",
            }),
          );
        }
        return originalFetch(proxyUrl, init);
      };

      window.fetch = async function patchedFetch(
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> {
        const url = parseUrl(input);
        if (!url || !isSupabaseHttp(url)) {
          return originalFetch(input as any, init);
        }

        // Periodic recheck: try direct path even if proxy pref is on.
        if (useProxy && Date.now() - lastRecheck > RECHECK_MS) {
          lastRecheck = Date.now();
          try {
            const probe = await originalFetch(`${supabaseOrigin}/auth/v1/health`, {
              method: "GET",
              cache: "no-store",
            });
            if (probe.ok || probe.status < 500) setUseProxy(false);
          } catch {
            /* keep proxy pref */
          }
        }

        if (useProxy) {
          try {
            return await proxyFetch(input, init, url);
          } catch (err) {
            // proxy failed too — fall through to direct attempt below
            try {
              return await originalFetch(input as any, init);
            } catch {
              throw err;
            }
          }
        }

        try {
          return await originalFetch(input as any, init);
        } catch (err) {
          if (err instanceof TypeError) {
            try {
              const resp = await proxyFetch(input, init, url);
              setUseProxy(true);
              return resp;
            } catch {
              throw err;
            }
          }
          throw err;
        }
      };
    }
  }
}

export {};

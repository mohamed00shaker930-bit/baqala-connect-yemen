// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        filename: "sw.js",
        injectRegister: null,
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        workbox: {
          cleanupOutdatedCaches: true,
          // ملاحظة: لا نستخدم navigateFallback هنا لأن التطبيق SSR — الصفحة "/" ليست ملفاً
          // ثابتاً ضمن precache، وتوجيه الاحتياط إليها كان يُسقط الـ Service Worker بالكامل.
          // بدلاً من ذلك: NetworkFirst للتنقل ← آخر نسخة مخزّنة ← صفحة offline.html الثابتة.
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "baqalati-pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
                precacheFallback: { fallbackURL: "/offline.html" },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                ["script", "style", "worker", "font", "image"].includes(request.destination) &&
                url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: {
                cacheName: "baqalati-assets",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});

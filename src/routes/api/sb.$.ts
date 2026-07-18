import { createFileRoute } from "@tanstack/react-router";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

const FORWARD_REQ_HEADERS = [
  "apikey",
  "authorization",
  "content-type",
  "prefer",
  "range",
  "x-client-info",
  "accept-profile",
  "content-profile",
  "x-upsert",
  "accept",
  "accept-language",
  "if-match",
  "if-none-match",
  "if-modified-since",
];

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const base = process.env.SUPABASE_URL;
  if (!base) return new Response("SUPABASE_URL not configured", { status: 500 });

  const subpath = params._splat ?? "";
  const url = new URL(request.url);
  const target = `${base.replace(/\/$/, "")}/${subpath}${url.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQ_HEADERS) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD", "OPTIONS"].includes(method);

  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error — required by undici/workerd when streaming a request body
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
  });

  const respHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    respHeaders.set(key, value);
  });
  respHeaders.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export const Route = createFileRoute("/api/sb/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
      HEAD: proxy,
      OPTIONS: proxy,
    },
  },
});

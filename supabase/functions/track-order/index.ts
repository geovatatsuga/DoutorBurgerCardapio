import { createClient } from "npm:@supabase/supabase-js@2";
import { parseTrackingInput, phoneDigits } from "./validation.ts";

const allowedOrigins = new Set([
  "https://doutor-burger-cardapio.vercel.app",
  "http://localhost:5173", "http://127.0.0.1:5173",
  "http://localhost:5175", "http://127.0.0.1:5175",
  "http://localhost:4173", "http://127.0.0.1:4173",
  "http://localhost:4182", "http://127.0.0.1:4182",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function json(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function getSecretKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return null;
  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0] || null;
  } catch {
    return null;
  }
}

async function readLimitedBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("body too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function hashClientIp(ip: string, secret: string) {
  const bytes = new TextEncoder().encode(`${secret}:order-tracking:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origem não autorizada." }, 403, origin);
  if (Number(request.headers.get("content-length") || 0) > 512) return json({ error: "Consulta inválida." }, 400, origin);

  let input: Record<string, unknown>;
  try {
    const body = await readLimitedBody(request, 512);
    input = JSON.parse(body);
  } catch {
    return json({ error: "Consulta inválida." }, 400, origin);
  }

  const credentials = parseTrackingInput(input);
  if (!credentials) {
    return json({ error: "Informe o número do pedido e o celular com DDD." }, 400, origin);
  }
  const { orderNumber, phone } = credentials;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secret = getSecretKey();
  if (!ip || !supabaseUrl || !secret) return json({ error: "Consulta temporariamente indisponível." }, 503, origin);

  const admin = createClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const clientHash = await hashClientIp(ip, secret);
  const { data: allowed, error: quotaError } = await admin.rpc("consume_order_tracking_quota", { p_client_hash: clientHash });
  if (quotaError) {
    console.error("Order tracking quota unavailable:", quotaError.message);
    return json({ error: "Consulta temporariamente indisponível." }, 503, origin);
  }
  if (!allowed) return json({ error: "Muitas consultas. Aguarde alguns minutos." }, 429, origin);

  const { data: order, error } = await admin.from("orders")
    .select("order_number,customer_phone,status,total_cents,payment_method,updated_at,payments(status)")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) {
    console.error("Order tracking lookup failed:", error.message);
    return json({ error: "Consulta temporariamente indisponível." }, 503, origin);
  }
  if (!order || phoneDigits(order.customer_phone || "") !== phone) {
    return json({ error: "Pedido não encontrado para este número e celular." }, 404, origin);
  }

  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  return json({
    order_number: order.order_number,
    status: order.status,
    total_cents: order.total_cents,
    payment_method: order.payment_method,
    payment_status: payment?.status || "pending",
    updated_at: order.updated_at,
  }, 200, origin);
});

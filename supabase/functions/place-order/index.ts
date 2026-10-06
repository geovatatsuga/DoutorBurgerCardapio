import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://doutor-burger-cardapio.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:4182",
  "http://127.0.0.1:4182",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function json(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

async function readLimitedBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty body");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RangeError("body too large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

async function hashClientIp(ip: string, secret: string) {
  const bytes = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origem não autorizada." }, 403, origin);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) return json({ error: "Pedido muito grande." }, 413, origin);

  let payload: Record<string, unknown>;
  try {
    const rawBody = await readLimitedBody(request, 16_384);
    payload = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof RangeError) return json({ error: "Pedido muito grande." }, 413, origin);
    return json({ error: "Formato de pedido inválido." }, 400, origin);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "Formato de pedido inválido." }, 400, origin);
  }

  const items = payload.p_items;
  if (!isUuid(payload.p_store_id) || !isUuid(payload.p_request_key) || !Array.isArray(items) || items.length < 1 || items.length > 20) {
    return json({ error: "Pedido inválido." }, 400, origin);
  }
  if (typeof payload.p_customer_name !== "string" || payload.p_customer_name.trim().length < 3 || payload.p_customer_name.length > 100) {
    return json({ error: "Confira o nome informado." }, 400, origin);
  }
  if (typeof payload.p_customer_phone !== "string" || payload.p_customer_phone.length > 40) {
    return json({ error: "Confira o telefone informado." }, 400, origin);
  }
  if (!new Set(["delivery", "pickup"]).has(String(payload.p_fulfillment))) {
    return json({ error: "Forma de recebimento inválida." }, 400, origin);
  }
  if (!new Set(["pix", "credit_card", "debit_card", "cash"]).has(String(payload.p_payment_method))) {
    return json({ error: "Forma de pagamento inválida." }, 400, origin);
  }
  let totalQuantity = 0;
  for (const item of items) {
    if (!item || typeof item !== "object" || !isUuid((item as Record<string, unknown>).product_id)) {
      return json({ error: "Produto inválido no pedido." }, 400, origin);
    }
    const row = item as Record<string, unknown>;
    if (!Number.isInteger(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > 20) {
      return json({ error: "A quantidade por produto deve ficar entre 1 e 20." }, 400, origin);
    }
    totalQuantity += Number(row.quantity);
    if (totalQuantity > 40) return json({ error: "O pedido excede o limite de 40 unidades." }, 400, origin);
    if (row.notes != null && (typeof row.notes !== "string" || row.notes.length > 240)) {
      return json({ error: "Observação do item muito longa." }, 400, origin);
    }
    if (row.modifier_option_ids != null && (!Array.isArray(row.modifier_option_ids) || row.modifier_option_ids.length > 12 || !row.modifier_option_ids.every(isUuid))) {
      return json({ error: "Adicionais inválidos." }, 400, origin);
    }
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return json({ error: "Não foi possível validar a origem do pedido. Tente novamente." }, 503, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase server credentials for place-order function.");
    return json({ error: "O sistema de pedidos está temporariamente indisponível." }, 503, origin);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientHash = await hashClientIp(ip, serviceKey);
  const { data: allowed, error: quotaError } = await admin.rpc("consume_public_order_quota", {
    p_store_id: payload.p_store_id,
    p_client_hash: clientHash,
  });
  if (quotaError) {
    console.error("Order quota check failed:", quotaError.message);
    return json({ error: "O sistema de pedidos está temporariamente indisponível." }, 503, origin);
  }
  if (!allowed) return json({ error: "Muitos pedidos deste endereço. Aguarde alguns minutos e tente novamente." }, 429, origin);

  const { data: orderId, error } = await admin.rpc("place_order", {
    p_store_id: payload.p_store_id,
    p_fulfillment: payload.p_fulfillment,
    p_customer_name: payload.p_customer_name.trim(),
    p_customer_phone: payload.p_customer_phone.trim(),
    p_delivery_address: payload.p_delivery_address ?? null,
    p_payment_method: payload.p_payment_method,
    p_items: items,
    p_notes: typeof payload.p_notes === "string" ? payload.p_notes.slice(0, 500) : null,
    p_request_key: payload.p_request_key,
  });
  if (error) {
    console.warn("Order rejected by database validation:", error.code || "unknown");
    return json({ error: "Não foi possível criar o pedido. Confira os itens, adicionais e endereço." }, 400, origin);
  }

  const { data: savedOrder, error: readError } = await admin
    .from("orders")
    .select("id,store_id,request_key,order_number,subtotal_cents,delivery_fee_cents,total_cents")
    .eq("id", orderId)
    .eq("store_id", payload.p_store_id)
    .eq("request_key", payload.p_request_key)
    .single();
  if (readError || !savedOrder || !Number.isSafeInteger(savedOrder.total_cents) || savedOrder.total_cents < 0) {
    console.error("Could not read authoritative order total after creation:", readError?.message || "invalid total");
    return json({ error: "Pedido registrado, mas não foi possível confirmar o valor. Tente novamente com o mesmo pedido." }, 503, origin);
  }

  let pix: { pix_key: string; pix_merchant_name: string } | null = null;
  if (payload.p_payment_method === "pix") {
    const { data: settings, error: settingsError } = await admin
      .from("store_payment_settings")
      .select("pix_key,pix_merchant_name,pix_enabled")
      .eq("store_id", payload.p_store_id)
      .maybeSingle();
    if (settingsError) {
      console.error("Could not read store payment settings:", settingsError.message);
      return json({ error: "Pedido registrado, mas não foi possível confirmar o Pix. Tente novamente com o mesmo pedido." }, 503, origin);
    }
    if (settings?.pix_enabled) {
      pix = { pix_key: settings.pix_key, pix_merchant_name: settings.pix_merchant_name };
    }
  }

  return json({
    order_id: savedOrder.id,
    order_number: savedOrder.order_number,
    subtotal_cents: savedOrder.subtotal_cents,
    delivery_fee_cents: savedOrder.delivery_fee_cents,
    total_cents: savedOrder.total_cents,
    ...(pix || {}),
  }, 201, origin);
});

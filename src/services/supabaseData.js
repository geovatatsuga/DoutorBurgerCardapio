import { isSupabaseConfigured, supabase } from "../lib/supabase";

export const STORE_ID = "11111111-1111-4111-8111-111111111111";

const statusFromDb = {
  received: "Recebido",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  dispatched: "Saiu para entrega",
  completed: "Entregue",
  cancelled: "Cancelado",
};

const statusToDb = Object.fromEntries(Object.entries(statusFromDb).map(([key, value]) => [value, key]));

const paymentToDb = {
  Pix: "pix",
  "Cartao de Credito": "credit_card",
  "Cartao de Debito": "debit_card",
  "Cartao de Credito": "credit_card",
  "Cartao de Debito": "debit_card",
  Dinheiro: "cash",
  "Pago pelo App (iFood)": "ifood",
};

function centsToMoney(cents) {
  return (cents || 0) / 100;
}

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase nao configurado.");
  }
  return supabase;
}

export function mapProduct(row) {
  return {
    id: row.id,
    category: row.categories?.name || "Burgers",
    name: row.name,
    description: row.description,
    price: centsToMoney(row.price_cents),
    image: row.image_path || "/assets/new-direction/doutor-burger.webp",
    active: row.is_active,
    isFavorite: row.is_favorite,
    isCombo: row.is_combo,
  };
}

export function mapOrder(row) {
  const payment = row.payments?.[0]?.method || row.payment_method;
  return {
    id: row.id,
    orderNumber: row.order_number,
    displayId: row.order_number ? `#${row.order_number}` : `#${String(row.id).slice(0, 4).toUpperCase()}`,
    name: row.customer_name,
    phone: row.customer_phone,
    address: row.fulfillment === "pickup" ? "Retirada no Balcao" : row.delivery_address?.street || row.delivery_address?.address || "",
    complement: row.delivery_address?.complement || "",
    payment: payment === "pix" ? "Pix" : payment === "cash" ? "Dinheiro" : payment === "ifood" ? "Pago pelo App (iFood)" : "Cartao",
    items: (row.order_items || []).map((item) => ({
      name: item.product_name,
      qty: item.quantity,
      price: centsToMoney(item.unit_price_cents),
      notes: item.notes || "",
    })),
    subtotal: centsToMoney(row.subtotal_cents),
    deliveryFee: centsToMoney(row.delivery_fee_cents),
    total: centsToMoney(row.total_cents),
    status: statusFromDb[row.status] || row.status,
    time: new Date(row.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    origin: row.source === "ifood" ? "iFood" : "Cardapio",
  };
}

export async function loadPublicMenu() {
  const client = requireSupabase();

  const [{ data: store, error: storeError }, { data: categories, error: categoriesError }, { data: products, error: productsError }] =
    await Promise.all([
      client.from("stores").select("*").eq("id", STORE_ID).single(),
      client.from("categories").select("*").eq("store_id", STORE_ID).eq("is_active", true).order("sort_order"),
      client
        .from("products")
        .select("*, categories(name)")
        .eq("store_id", STORE_ID)
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  if (storeError) throw storeError;
  if (categoriesError) throw categoriesError;
  if (productsError) throw productsError;

  return {
    storeSettings: {
      name: store.name,
      phone: store.phone || "",
      minOrder: centsToMoney(store.min_order_cents),
      deliveryTime: store.delivery_time_label,
      deliveryFee: centsToMoney(store.delivery_fee_cents),
      address: store.address || "",
      openDays: [0, 2, 3, 4, 5, 6],
      openHour: "18:00",
      closeHour: "23:30",
    },
    categories: categories.map((category) => category.name),
    products: products.map(mapProduct),
  };
}

export async function loadMemberships() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("store_memberships")
    .select("store_id, role, is_active")
    .eq("store_id", STORE_ID)
    .eq("is_active", true);
  if (error) throw error;
  return data || [];
}

export async function loadAdminOrders() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("orders")
    .select("*, payments(method,status), order_items(product_name, quantity, unit_price_cents, notes)")
    .eq("store_id", STORE_ID)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map(mapOrder);
}

export async function loadOwnOrders() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("orders")
    .select("*, payments(method,status), order_items(product_name, quantity, unit_price_cents, notes)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []).map(mapOrder);
}

export async function placeOrder({ receiveMode, customerName, customerPhone, address, complement, paymentMethod, cart, notes }) {
  const client = requireSupabase();
  const items = cart.map((item) => ({
    product_id: item.id,
    quantity: item.qty,
    notes: item.notes || null,
    modifier_option_ids: item.modifierOptionIds || [],
  }));

  const deliveryAddress =
    receiveMode === "Entrega"
      ? {
          street: address,
          complement: complement || null,
        }
      : null;

  const { data, error } = await client.rpc("place_order", {
    p_store_id: STORE_ID,
    p_fulfillment: receiveMode === "Entrega" ? "delivery" : "pickup",
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_delivery_address: deliveryAddress,
    p_payment_method: paymentToDb[paymentMethod] || "pix",
    p_items: items,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function transitionOrderStatus(orderId, nextStatus, reason) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("transition_order_status", {
    p_order_id: orderId,
    p_new_status: statusToDb[nextStatus] || nextStatus,
    p_reason: reason || null,
  });
  if (error) throw error;
  return mapOrder(data);
}

export async function saveProduct(product) {
  const client = requireSupabase();
  const payload = {
    name: product.name,
    description: product.description,
    price_cents: moneyToCents(product.price),
    image_path: product.image || "/assets/new-direction/doutor-burger.webp",
    is_active: product.active,
    store_id: STORE_ID,
  };

  if (product.categoryId) payload.category_id = product.categoryId;

  if (product.id && !String(product.id).startsWith("p_") && product.id !== "new") {
    const { data, error } = await client.from("products").update(payload).eq("id", product.id).select("*, categories(name)").single();
    if (error) throw error;
    return mapProduct(data);
  }

  const { data: category, error: categoryError } = await client
    .from("categories")
    .select("id")
    .eq("store_id", STORE_ID)
    .eq("name", product.category)
    .single();
  if (categoryError) throw categoryError;

  const { data, error } = await client
    .from("products")
    .insert({ ...payload, category_id: category.id })
    .select("*, categories(name)")
    .single();
  if (error) throw error;
  return mapProduct(data);
}

export async function deleteProductRemote(productId) {
  const client = requireSupabase();
  const { error } = await client.from("products").update({ is_active: false }).eq("id", productId);
  if (error) throw error;
}

export async function convertImageToWebP(file, quality = 0.85, maxDimension = 1200) {
  if (!file || !file.type?.startsWith("image/")) {
    return file;
  }
  if (file.type === "image/webp" && file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const webpFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".webp",
              { type: "image/webp", lastModified: Date.now() }
            );
            resolve(webpFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadProductImage(rawFile) {
  const client = requireSupabase();
  if (!rawFile) throw new Error("Nenhum arquivo fornecido.");

  // Convert image to WEBP before uploading
  const file = await convertImageToWebP(rawFile);

  const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
  const filePath = `${fileName}`;

  let bucketName = "Images";
  let { error: uploadError } = await client.storage
    .from(bucketName)
    .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: "image/webp" });

  if (uploadError && (uploadError.message?.toLowerCase().includes("not found") || uploadError.error === "Bucket not found")) {
    bucketName = "product-images";
    const res = await client.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: "image/webp" });
    uploadError = res.error;
  }

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw uploadError;
  }

  const { data: publicUrlData } = client.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function fetchOrderStatusTimeline(orderId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_order_status_timeline", {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data || [];
}

export async function loadOrderHistory(filters = {}) {
  const client = requireSupabase();
  let query = client
    .from("orders")
    .select("*, payments(method,status), order_items(product_name, quantity, unit_price_cents, notes)")
    .eq("store_id", STORE_ID)
    .order("created_at", { ascending: false });

  if (filters.startDate) {
    query = query.gte("created_at", new Date(filters.startDate).toISOString());
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", statusToDb[filters.status] || filters.status);
  }
  if (filters.fulfillment && filters.fulfillment !== "all") {
    query = query.eq("fulfillment", filters.fulfillment);
  }

  const limit = filters.limit || 200;
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  let mapped = (data || []).map(mapOrder);

  if (filters.search) {
    const searchLower = filters.search.toLowerCase().trim();
    mapped = mapped.filter(
      (order) =>
        order.displayId.toLowerCase().includes(searchLower) ||
        order.name.toLowerCase().includes(searchLower) ||
        order.phone.includes(searchLower)
    );
  }

  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    mapped = mapped.filter((o) => o.payment === filters.paymentMethod);
  }

  if (filters.minTotal) {
    mapped = mapped.filter((o) => o.total >= Number(filters.minTotal));
  }

  if (filters.maxTotal) {
    mapped = mapped.filter((o) => o.total <= Number(filters.maxTotal));
  }

  return mapped;
}

export async function fetchClientOrder(searchTerm) {
  const client = requireSupabase();
  if (!searchTerm) return null;
  const term = String(searchTerm).trim().replace("#", "");

  let query = client
    .from("orders")
    .select("*, payments(method,status), order_items(product_name, quantity, unit_price_cents, notes)")
    .eq("store_id", STORE_ID)
    .order("created_at", { ascending: false });

  if (/^\d+$/.test(term) && term.length < 9) {
    query = query.eq("order_number", parseInt(term, 10));
  } else {
    const cleanPhone = term.replace(/\D/g, "");
    if (cleanPhone.length >= 8) {
      query = query.ilike("customer_phone", `%${cleanPhone}%`);
    } else {
      query = query.eq("id", term);
    }
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return mapOrder(data[0]);
}



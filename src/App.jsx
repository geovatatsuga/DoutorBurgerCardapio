import React, { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const STORE_SLUG = "burgerc";

// BroadcastChannel for real-time synchronization between browser tabs
const orderChannel = typeof window !== "undefined" ? new BroadcastChannel("doutor_burger_orders") : null;

// Sound synthesizer using Web Audio API
function playNotificationSound(type = "client") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === "ifood") {
      let time = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, time);
        gain1.gain.setValueAtTime(0.15, time);
        gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(time);
        osc1.stop(time + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, time + 0.18);
        gain2.gain.setValueAtTime(0.15, time + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(time + 0.18);
        osc2.stop(time + 0.3);

        time += 0.5;
      }
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.error("Audio error", e);
  }
}

// Check if store is open based on hours & days
function checkStoreOpen(settings) {
  // Permitir pedidos sempre em ambiente de teste/desenvolvimento local para facilitar validações do cliente
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "" || host.includes("vercel") || host.includes("gitpod") || host.includes("codesandbox")) {
      return true;
    }
  }

  const now = new Date();
  const day = now.getDay();
  
  if (!settings.openDays || !settings.openDays.includes(day)) {
    return false;
  }
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [oH, oM] = (settings.openHour || "18:00").split(":").map(Number);
  const [cH, cM] = (settings.closeHour || "23:59").split(":").map(Number);
  
  const openMinutes = oH * 60 + oM;
  const closeMinutes = cH * 60 + cM;
  
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  } else {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }
}

const categories = ["Burgers", "Combos", "Batatas", "Bebidas", "Sobremesas"];
const categoryIcons = {
  Burgers: "burger",
  Combos: "combo",
  Batatas: "fries",
  Bebidas: "drink",
  Sobremesas: "cake",
};

const initialProducts = [
  {
    id: "x-salada",
    category: "Burgers",
    name: "X-Salada",
    description: "Um classico completo com carne suculenta de 90 g, queijo prato derretido e salada fresca no pao brioche dourado. A maionese de ervas fecha o sabor com leveza e deixa cada mordida equilibrada.",
    price: 18,
    image: "/assets/products/x-salada-burgerc.webp",
    active: true,
    isFavorite: true,
  },
  {
    id: "cheeseburger",
    category: "Burgers",
    name: "Cheeseburger",
    description: "Direto ao ponto: blend bovino suculento de 90 g, cheddar bem derretido e maionese da casa no pao brioche. Simples, cremoso e feito para matar a vontade de burger de verdade.",
    price: 16,
    image: "/assets/products/cheeseburger-burgerc.webp",
    active: true,
  },
  {
    id: "x-bacon",
    category: "Burgers",
    name: "X-Bacon",
    description: "Blend bovino de 90 g com cheddar derretido, bacon em tiras crocante e cebola chapeada. A maionese de alho traz aquele sabor marcante que combina com cada camada.",
    price: 22,
    image: "/assets/products/x-bacon-burgerc.webp",
    active: true,
    isFavorite: true,
  },
  {
    id: "agridoce",
    category: "Burgers",
    name: "Agridoce",
    description: "Uma combinacao diferente e viciante: carne suculenta de 90 g, queijo coalho tostado e abacaxi caramelizado. A maionese de pimenta equilibra o doce, o salgado e uma picancia na medida.",
    price: 25,
    image: "/assets/products/agridoce-burgerc.webp",
    active: true,
  },
  {
    id: "duplo",
    category: "Burgers",
    name: "Duplo",
    description: "O mais pesado da casa: dois blends bovinos suculentos, duplo cheddar, bacon em cubos e cebola caramelizada no vinho. A maionese defumada com cebolinha deixa o Duplo intenso do inicio ao fim.",
    price: 30,
    image: "/assets/products/duplo-burgerc.webp",
    active: true,
    isFavorite: true,
  },
];

const productCardTags = {
  "X-Salada": ["Pao brioche", "Blend 90 g", "Queijo prato", "Salada fresca"],
  Cheeseburger: ["Pao brioche", "Blend 90 g", "Cheddar", "Maionese da casa"],
  "X-Bacon": ["Pao brioche", "Blend 90 g", "Cheddar", "Bacon crocante"],
  Agridoce: ["Pao brioche", "Blend 90 g", "Queijo coalho", "Abacaxi caramelizado"],
  Duplo: ["Pao brioche", "2 blends 90 g", "Duplo cheddar", "Bacon em cubos"],
};

const statusToDb = {
  Recebido: "received",
  Confirmado: "confirmed",
  "Em preparo": "preparing",
  Pronto: "ready",
  "Saiu para entrega": "dispatched",
  Entregue: "completed",
  Cancelado: "cancelled",
};

const statusFromDb = Object.fromEntries(Object.entries(statusToDb).map(([label, value]) => [value, label]));

const orderStatusFlow = {
  Recebido: ["Em preparo", "Cancelado"],
  Confirmado: ["Em preparo", "Cancelado"],
  "Em preparo": ["Pronto", "Cancelado"],
  Pronto: ["Saiu para entrega", "Entregue", "Cancelado"],
  "Saiu para entrega": ["Entregue", "Cancelado"],
  Entregue: [],
  Cancelado: [],
};

const orderStatusLabels = ["Recebido", "Confirmado", "Em preparo", "Pronto", "Saiu para entrega", "Entregue", "Cancelado"];

function canMoveOrderStatus(currentStatus, nextStatus) {
  return currentStatus === nextStatus || (orderStatusFlow[currentStatus] || []).includes(nextStatus);
}

function nextOrderStatuses(currentStatus) {
  return orderStatusLabels.filter((status) => canMoveOrderStatus(currentStatus, status));
}

function centsToMoney(cents) {
  return Number(cents || 0) / 100;
}

function mapProductFromDb(product) {
  return {
    id: product.id,
    category: product.categories?.name || "Burgers",
    name: product.name,
    description: product.description || "",
    price: centsToMoney(product.price_cents),
    image: product.image_path || "/assets/new-direction/doutor-burger.webp",
    active: product.is_active,
    dbId: product.id,
  };
}

function mapOrderFromDb(order) {
  return {
    id: `#${order.order_number}`,
    dbId: order.id,
    name: order.customer_name,
    phone: order.customer_phone,
    address: order.fulfillment === "delivery" ? (order.delivery_address?.street || order.delivery_address?.address || "") : "Retirada no Balcao",
    complement: order.delivery_address?.complement || "",
    payment: order.payment_method,
    items: (order.order_items || []).map((item) => ({
      name: item.product_name,
      qty: item.quantity,
      price: centsToMoney(item.unit_price_cents),
      notes: item.notes,
    })),
    subtotal: centsToMoney(order.subtotal_cents),
    deliveryFee: centsToMoney(order.delivery_fee_cents),
    total: centsToMoney(order.total_cents),
    status: statusFromDb[order.status] || "Recebido",
    time: new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    origin: order.source === "website" ? "Cardapio" : order.source,
  };
}

export default function App() {
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") || "client";
  });
  const [adminTab, setAdminTab] = useState("orders");
  const [view, setView] = useState("home"); // client view: home, cart, detail

  // Global State
  const [products, setProducts] = useState(() => {
    const local = localStorage.getItem("doutor_products");
    return local ? JSON.parse(local) : initialProducts;
  });
  const [menuCategories, setMenuCategories] = useState(categories.map((name, index) => ({
    id: name,
    name,
    icon: categoryIcons[name] || "burger",
    sort_order: (index + 1) * 10,
    is_active: true,
  })));
  const categoryNames = menuCategories.filter((category) => category.is_active !== false).map((category) => category.name);

  const [orders, setOrders] = useState([]);

  const [storeSettings, setStoreSettings] = useState(() => {
    const local = localStorage.getItem("doutor_settings");
    return local ? JSON.parse(local) : {
      name: "Doutor Burger",
      phone: "(83) 98765-4321",
      minOrder: 20,
      deliveryTime: "35-45 min",
      deliveryFee: 6.9,
      address: "Rua Clotilde Torres, 116-B, Casa - Alto do Mateus, Joao Pessoa - PB, CEP 58090-240",
      openDays: [0, 2, 3, 4, 5, 6],
      openHour: "18:00",
      closeHour: "23:30",
    };
  });

  const isStoreOpen = checkStoreOpen(storeSettings);

  // Client Cart & Detail State
  const [activeCategory, setActiveCategory] = useState("Burgers");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("doutor");
  const [cart, setCart] = useState([]);
  const [detailQty, setDetailQty] = useState(1);
  const [extras, setExtras] = useState([]);
  const [removedIngredients, setRemovedIngredients] = useState([]);
  const [meat, setMeat] = useState("Ao ponto");
  const [combo, setCombo] = useState(false);
  const [note, setNote] = useState("");
  const [receiveMode, setReceiveMode] = useState("Entrega");
  const [flow, setFlow] = useState(null);
  const [currentClientOrder, setCurrentClientOrder] = useState(null);

  // Client Checkout Fields
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutComplement, setCheckoutComplement] = useState("");
  const [checkoutPayment, setCheckoutPayment] = useState("Pix");
  const [checkoutChange, setCheckoutChange] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // Admin Dashboard State
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState(() => orders[0]?.id || "");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Product Add/Edit Form State
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormName, setProductFormName] = useState("");
  const [productFormCategory, setProductFormCategory] = useState("Burgers");
  const [productFormPrice, setProductFormPrice] = useState("");
  const [productFormDesc, setProductFormDesc] = useState("");
  const [productFormImage, setProductFormImage] = useState("");
  const [productFormActive, setProductFormActive] = useState(true);
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormIcon, setCategoryFormIcon] = useState("burger");
  const [modifierGroups, setModifierGroups] = useState([]);
  const [modifierGroupName, setModifierGroupName] = useState("");
  const [modifierOptionGroupId, setModifierOptionGroupId] = useState("");
  const [modifierOptionName, setModifierOptionName] = useState("");
  const [modifierOptionPrice, setModifierOptionPrice] = useState("");
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("kitchen");
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [zoneName, setZoneName] = useState("");
  const [zoneFee, setZoneFee] = useState("");
  const [zoneMinOrder, setZoneMinOrder] = useState("");

  // Cash Closing Modal
  const [showCashClose, setShowCashClose] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptType, setReceiptType] = useState("fiscal"); // "fiscal" or "cozinha"
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [supabaseNotice, setSupabaseNotice] = useState("");
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [currentStaffRole, setCurrentStaffRole] = useState(null);
  const [pendingOrderStatuses, setPendingOrderStatuses] = useState({});
  const [savingOrderId, setSavingOrderId] = useState("");

  // Persistence
  useEffect(() => {
    localStorage.setItem("doutor_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (isSupabaseConfigured) localStorage.removeItem("doutor_orders");
  }, []);

  useEffect(() => {
    localStorage.setItem("doutor_settings", JSON.stringify(storeSettings));
  }, [storeSettings]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authReady && !session && (page === "admin" || page === "kitchen")) {
      setPage("login");
    }
  }, [authReady, session, page]);

  useEffect(() => {
    if (!supabase) return;

    async function loadCatalog() {
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id,name,phone,address,min_order_cents,delivery_fee_cents,delivery_time_label,store_hours(day_of_week,opens_at,closes_at,is_open)")
        .eq("slug", STORE_SLUG)
        .maybeSingle();

      if (storeError) {
        setSupabaseNotice(storeError.message);
        return;
      }
      if (!store) return;

      setActiveStoreId(store.id);
      setStoreSettings((current) => ({
        ...current,
        name: store.name,
        phone: store.phone || current.phone,
        address: store.address || current.address,
        minOrder: centsToMoney(store.min_order_cents),
        deliveryFee: centsToMoney(store.delivery_fee_cents),
        deliveryTime: store.delivery_time_label || current.deliveryTime,
        openDays: (store.store_hours || []).filter((hour) => hour.is_open).map((hour) => hour.day_of_week),
        openHour: store.store_hours?.[0]?.opens_at?.slice(0, 5) || current.openHour,
        closeHour: store.store_hours?.[0]?.closes_at?.slice(0, 5) || current.closeHour,
      }));

      const { data: dbProducts, error: productError } = await supabase
        .from("products")
        .select("id,name,description,image_path,price_cents,is_active,sort_order,categories(name)")
        .eq("store_id", store.id)
        .order("sort_order", { ascending: true });

      if (productError) {
        setSupabaseNotice(productError.message);
        return;
      }
      if (dbProducts?.length) setProducts(dbProducts.map(mapProductFromDb));

      const { data: dbCategories } = await supabase
        .from("categories")
        .select("id,name,icon,sort_order,is_active")
        .eq("store_id", store.id)
        .order("sort_order", { ascending: true });
      if (dbCategories?.length) setMenuCategories(dbCategories);

      const { data: dbModifierGroups } = await supabase
        .from("modifier_groups")
        .select("id,name,min_select,max_select,is_required,sort_order,modifier_options(id,name,price_cents,is_active,sort_order)")
        .eq("store_id", store.id)
        .order("sort_order", { ascending: true });
      if (dbModifierGroups) setModifierGroups(dbModifierGroups);

      const { data: dbZones } = await supabase
        .from("delivery_zones")
        .select("id,name,delivery_fee_cents,min_order_cents,is_active")
        .eq("store_id", store.id)
        .order("name", { ascending: true });
      if (dbZones) setDeliveryZones(dbZones);
    }

    loadCatalog();
  }, []);

  useEffect(() => {
    if (!supabase || !session || !activeStoreId) return;

    async function loadCurrentMembership() {
      const { data, error } = await supabase
        .from("store_memberships")
        .select("role")
        .eq("store_id", activeStoreId)
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setCurrentStaffRole(null);
        if (page === "admin" || page === "kitchen") setPage("login");
        return;
      }

      setCurrentStaffRole(data.role);
      if ((data.role === "kitchen" || data.role === "cashier") && adminTab !== "orders") {
        setAdminTab("orders");
      }
    }

    loadCurrentMembership();
  }, [session, activeStoreId, page, adminTab]);

  useEffect(() => {
    if (!supabase || !session || !activeStoreId) return;

    async function loadOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*,order_items(product_name,quantity,unit_price_cents,notes)")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false });

      if (error) {
        setSupabaseNotice(error.message);
        return;
      }
      setOrders((data || []).map(mapOrderFromDb));
    }

    async function loadStaff() {
      const { data } = await supabase
        .from("store_memberships")
        .select("id,user_id,role,is_active,profiles(full_name,phone)")
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: true });
      if (data) setStaffMembers(data);
    }

    loadOrders();
    loadStaff();

    const channel = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${activeStoreId}` }, loadOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, activeStoreId]);

  // Real-time synchronization via BroadcastChannel
  useEffect(() => {
    if (!orderChannel) return;

    const handleMessage = (event) => {
      const { type, order, orderId, status } = event.data;
      if (type === "NEW_ORDER") {
        setOrders((prev) => {
          if (prev.some((o) => o.id === order.id)) return prev;
          if (order.origin === "iFood") {
            playNotificationSound("ifood");
          } else {
            playNotificationSound("client");
          }
          return [order, ...prev];
        });
      } else if (type === "UPDATE_STATUS") {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        if (currentClientOrder && currentClientOrder.id === orderId) {
          setCurrentClientOrder((prev) => ({ ...prev, status }));
          playNotificationSound("client");
        }
      }
    };

    orderChannel.addEventListener("message", handleMessage);
    return () => {
      orderChannel.removeEventListener("message", handleMessage);
    };
  }, [currentClientOrder]);

  // Sync view status with body classes for styling compatibility
  useEffect(() => {
    if (view === "detail") {
      document.body.classList.add("detail-mode");
      document.body.classList.remove("cart-mode");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (view === "cart") {
      document.body.classList.add("cart-mode");
      document.body.classList.remove("detail-mode");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      document.body.classList.remove("detail-mode", "cart-mode");
    }
    return () => {
      document.body.classList.remove("detail-mode", "cart-mode");
    };
  }, [view]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (page === "client") {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", page);
    }
    window.history.pushState({}, "", url.toString());
  }, [page]);

  // Client totals logic
  const selectedProduct = products.find((product) => product.id === selectedId) ?? products[0];
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const currentFee = receiveMode === "Entrega" ? storeSettings.deliveryFee : 0;
  const total = subtotal ? subtotal + currentFee : 0;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const detailUnitPrice = selectedProduct ? (selectedProduct.price + extras.reduce((sum, item) => sum + item.price, 0) + (combo ? 11.9 : 0)) : 0;

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = product.category === activeCategory;
      const matchesSearch = !term || `${product.name} ${product.description}`.toLowerCase().includes(term);
      const isAvailable = product.active !== false;
      return matchesCategory && matchesSearch && isAvailable;
    });
  }, [activeCategory, search, products]);

  function openProduct(id) {
    const product = products.find((item) => item.id === id) ?? products[0];
    setSelectedId(product.id);
    setDetailQty(1);
    setExtras(product.id === "doutor" ? [{ name: "Bacon extra", price: 4 }] : []);
    setRemovedIngredients([]);
    setMeat("Ao ponto");
    setCombo(product.category === "Burgers");
    setNote("");
    setFlow(null);
    setView("detail");
  }

  function addQuick(id) {
    if (!isStoreOpen) return;
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const uniqueKey = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    setCart((items) => [...items, { key: uniqueKey, ...product, qty: 1, notes: "Adicionado rapido" }]);
    playNotificationSound("client");
  }

  function addSelectedProduct() {
    if (!isStoreOpen) {
      setView("home");
      return;
    }
    const isBurger = selectedProduct?.category === "Burgers";
    const semIngredientsText = removedIngredients.length > 0 ? `Sem: ${removedIngredients.join(", ")}` : "";
    const uniqueKey = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    setCart((items) => [
      ...items,
      {
        key: uniqueKey,
        id: selectedProduct.id,
        name: isBurger && combo ? `${selectedProduct.name} Combo` : selectedProduct.name,
        image: selectedProduct.image,
        price: detailUnitPrice,
        qty: detailQty,
        notes: [semIngredientsText, isBurger ? meat : "", ...extras.map((item) => item.name), note.trim()].filter(Boolean).join(" + "),
      },
    ]);
    setView("cart");
  }

  function updateQty(key, delta) {
    setCart((items) => items.map((item) => (item.key === key ? { ...item, qty: item.qty + delta } : item)).filter((item) => item.qty > 0));
  }

  function toggleExtra(name, price) {
    setExtras((items) => (items.some((item) => item.name === name) ? items.filter((item) => item.name !== name) : [...items, { name, price }]));
  }

  // Handle Client Checkout
  async function submitClientOrder() {
    if (!checkoutName.trim()) {
      setCheckoutError("Por favor, preencha o seu nome completo.");
      return;
    }
    if (!checkoutPhone.trim()) {
      setCheckoutError("Por favor, preencha o seu número de WhatsApp.");
      return;
    }
    if (receiveMode === "Entrega" && !checkoutAddress.trim()) {
      setCheckoutError("Por favor, preencha o seu endereço de entrega.");
      return;
    }

    setCheckoutError("");
    const orderId = "#" + Math.floor(1000 + Math.random() * 9000);
    const paymentMethod = checkoutPayment === "Dinheiro" && checkoutChange.trim()
      ? `Dinheiro (Troco para R$ ${checkoutChange})`
      : checkoutPayment;

    let newOrder = {
      id: orderId,
      name: checkoutName,
      phone: checkoutPhone,
      address: receiveMode === "Entrega" ? checkoutAddress : "Retirada no Balcão",
      complement: checkoutComplement,
      payment: paymentMethod,
      items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price, notes: item.notes })),
      subtotal,
      deliveryFee: receiveMode === "Entrega" ? currentFee : 0,
      total: receiveMode === "Entrega" ? total : subtotal,
      status: "Recebido",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      origin: "Cardápio",
    };

    if (supabase) {
      if (!activeStoreId) {
        setCheckoutError("Banco Supabase ainda nao carregado. Aplique as migrations e tente novamente.");
        return;
      }

      try {
        const { data: rpcOrderId, error } = await supabase.rpc("place_order", {
          p_store_id: activeStoreId,
          p_fulfillment: receiveMode === "Entrega" ? "delivery" : "pickup",
          p_customer_name: checkoutName.trim(),
          p_customer_phone: checkoutPhone.trim(),
          p_delivery_address: receiveMode === "Entrega" ? { street: checkoutAddress.trim(), complement: checkoutComplement.trim() || null } : null,
          p_payment_method: checkoutPayment === "Dinheiro" ? "cash" : checkoutPayment === "Pix" ? "pix" : "credit_card",
          p_items: cart.map((item) => ({
            product_id: item.dbId || item.id,
            quantity: item.qty,
            notes: item.notes || null,
          })),
          p_notes: checkoutPayment === "Dinheiro" && checkoutChange.trim() ? `Troco para R$ ${checkoutChange}` : null,
        });
        if (error) throw error;
        newOrder = { ...newOrder, id: `#${String(rpcOrderId).slice(0, 8)}`, dbId: rpcOrderId };
      } catch (error) {
        setCheckoutError(error.message || "Não foi possível criar o pedido.");
        return;
      }
    }

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    setCurrentClientOrder(newOrder);
    setCart([]);
    setFlow("success");
    playNotificationSound("client");

    // Broadcast new order to other tabs
    if (orderChannel) {
      orderChannel.postMessage({
        type: "NEW_ORDER",
        order: newOrder,
      });
    }

    // Format WhatsApp message
    const cleanPhone = storeSettings.phone.replace(/\D/g, "");
    const itemsText = newOrder.items
      .map(item => `• *${item.qty}x ${item.name}* (${money.format(item.price)})${item.notes ? `\n   └ Obs: _${item.notes}_` : ""}`)
      .join("\n");

    const message = 
`🍔 *Doutor Burger - Novo Pedido!* 🍔

*Pedido:* ${newOrder.id}
*Cliente:* ${newOrder.name}
*WhatsApp:* ${checkoutPhone}
*Modo:* ${receiveMode}
${receiveMode === "Entrega" ? `*Endereço:* ${newOrder.address}\n*Complemento:* ${newOrder.complement || "Não informado"}` : "*Local de Retirada:* Balcão"}
*Pagamento:* ${newOrder.payment}

*Itens:*
${itemsText}

*Subtotal:* ${money.format(newOrder.subtotal)}
*Taxa de Entrega:* ${money.format(newOrder.deliveryFee)}
*Total:* ${money.format(newOrder.total)}

_Pedido enviado via Cardápio Digital!_`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodedText}`;

    // Open WhatsApp URL
    window.open(whatsappUrl, "_blank");
  }

  // Admin Actions
  async function handleAdminLogin(e) {
    e.preventDefault();
    if (!supabase) {
      setLoginError("Supabase nao configurado. Defina as variaveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      setLoginError(error.message);
      return;
    }

    if (!activeStoreId) {
      setLoginError("Banco Supabase ainda nao carregado. Aguarde um instante e tente novamente.");
      await supabase.auth.signOut();
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("store_memberships")
      .select("role")
      .eq("store_id", activeStoreId)
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError || !membership) {
      setLoginError("Acesso restrito. Este usuario nao e um colaborador ativo desta loja.");
      await supabase.auth.signOut();
      return;
    }

    setCurrentStaffRole(membership.role);
    if (membership.role === "kitchen") setAdminTab("orders");
    if (membership.role === "cashier") setAdminTab("orders");
    setPage("admin");
    setLoginError("");
  }

  async function updateOrderStatus(id, newStatus, options = {}) {
    const target = orders.find((order) => order.id === id || order.dbId === id);
    if (!target) {
      alert("Pedido nao encontrado na lista atual.");
      return;
    }
    if (!canMoveOrderStatus(target.status, newStatus)) {
      alert(`Nao da para mudar de "${target.status}" para "${newStatus}". Siga a sequencia do pedido.`);
      return;
    }
    if (target.status === newStatus) {
      setPendingOrderStatuses((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      return;
    }
    if (!options.skipConfirm && !confirm(`Salvar mudanca do pedido ${target.id} para "${newStatus}"?`)) return;
    setSavingOrderId(target.id);
    if (supabase && target?.dbId) {
      const { error } = await supabase.rpc("transition_order_status", {
        p_order_id: target.dbId,
        p_new_status: statusToDb[newStatus],
        p_reason: options.reason || "Alterado no painel administrativo",
      });
      if (error) {
        setSavingOrderId("");
        alert(error.message);
        return;
      }
    }

    const updated = orders.map(order => (order.id === target.id || order.dbId === target.dbId ? { ...order, status: newStatus } : order));
    setOrders(updated);
    setPendingOrderStatuses((prev) => {
      const next = { ...prev };
      delete next[target.id];
      return next;
    });
    setSavingOrderId("");
    if (currentClientOrder && currentClientOrder.id === id) {
      setCurrentClientOrder(prev => ({ ...prev, status: newStatus }));
    }
    if (orderChannel) {
      orderChannel.postMessage({
        type: "UPDATE_STATUS",
        orderId: id,
        status: newStatus
      });
    }
  }

  function cancelOrder(id) {
    updateOrderStatus(id, "Cancelado");
  }

  async function saveStoreSettings() {
    if (!supabase || !activeStoreId) {
      alert("Supabase ainda nao carregado. Tente novamente em alguns segundos.");
      return;
    }

    const { error: storeError } = await supabase
      .from("stores")
      .update({
        name: storeSettings.name,
        phone: storeSettings.phone,
        min_order_cents: Math.round(Number(storeSettings.minOrder || 0) * 100),
      })
      .eq("id", activeStoreId);

    if (storeError) {
      alert(storeError.message);
      return;
    }

    const hoursPayload = Array.from({ length: 7 }, (_, day) => ({
      store_id: activeStoreId,
      day_of_week: day,
      opens_at: storeSettings.openHour || "18:00",
      closes_at: storeSettings.closeHour || "23:30",
      is_open: storeSettings.openDays.includes(day),
    }));

    const { error: hoursError } = await supabase
      .from("store_hours")
      .upsert(hoursPayload, { onConflict: "store_id,day_of_week" });

    if (hoursError) {
      alert(hoursError.message);
      return;
    }

    alert("Configuracoes da loja salvas.");
  }

  async function handleSignUp() {
    if (!supabase) {
      setLoginError("Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para cadastro.");
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: loginEmail,
      password: loginPassword,
      options: { data: { full_name: checkoutName, phone: checkoutPhone } },
    });
    setLoginError(error ? error.message : "Cadastro criado. Verifique seu e-mail se a confirmação estiver habilitada.");
  }

  async function handlePasswordRecovery() {
    if (!supabase) {
      setLoginError("Configure o Supabase para recuperar senha.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: window.location.origin,
    });
    setLoginError(error ? error.message : "Enviamos as instruções de recuperação para o e-mail informado.");
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setCurrentStaffRole(null);
    setPage("client");
  }

  function goToAdminOrders() {
    setAdminTab("orders");
    setPage("admin");
  }

  // Edit or Add Product Form Submission
  function openAddProduct() {
    setEditingProduct({ id: "new" });
    setProductFormName("");
    setProductFormCategory("Burgers");
    setProductFormPrice("");
    setProductFormDesc("");
    setProductFormImage("/assets/new-direction/doutor-burger.webp");
    setProductFormActive(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductFormName(product.name);
    setProductFormCategory(product.category);
    setProductFormPrice(product.price.toString());
    setProductFormDesc(product.description);
    setProductFormImage(product.image || "/assets/new-direction/doutor-burger.webp");
    setProductFormActive(product.active !== false);
  }

  async function saveProductForm(e) {
    e.preventDefault();
    const parsedPrice = parseFloat(productFormPrice) || 0;
    let categoryId = null;
    if (supabase && activeStoreId) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("store_id", activeStoreId)
        .eq("name", productFormCategory)
        .maybeSingle();
      categoryId = category?.id || null;
    }

    if (editingProduct.id === "new") {
      const newProduct = {
        id: "p_" + Date.now(),
        name: productFormName,
        category: productFormCategory,
        price: parsedPrice,
        description: productFormDesc,
        image: productFormImage || "/assets/new-direction/doutor-burger.webp",
        active: productFormActive,
      };
      if (supabase && activeStoreId) {
        const { data, error } = await supabase
          .from("products")
          .insert({
            store_id: activeStoreId,
            category_id: categoryId,
            name: productFormName,
            description: productFormDesc,
            image_path: productFormImage || "/assets/new-direction/doutor-burger.webp",
            price_cents: Math.round(parsedPrice * 100),
            is_active: productFormActive,
          })
          .select("id,name,description,image_path,price_cents,is_active,sort_order,categories(name)")
          .single();
        if (error) {
          alert(error.message);
          return;
        }
        setProducts(prev => [...prev, mapProductFromDb(data)]);
        setEditingProduct(null);
        return;
      }
      setProducts(prev => [...prev, newProduct]);
    } else {
      if (supabase && editingProduct.dbId) {
        const { error } = await supabase
          .from("products")
          .update({
            category_id: categoryId,
            name: productFormName,
            description: productFormDesc,
            image_path: productFormImage || "/assets/new-direction/doutor-burger.webp",
            price_cents: Math.round(parsedPrice * 100),
            is_active: productFormActive,
          })
          .eq("id", editingProduct.dbId);
        if (error) {
          alert(error.message);
          return;
        }
      }
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        name: productFormName,
        category: productFormCategory,
        price: parsedPrice,
        description: productFormDesc,
        image: productFormImage || p.image,
        active: productFormActive,
      } : p));
    }
    setEditingProduct(null);
  }

  async function deleteProduct(productId) {
    if (confirm("Tem certeza que deseja remover este produto?")) {
      const product = products.find((item) => item.id === productId);
      if (supabase && product?.dbId) {
        const { error } = await supabase.from("products").update({ is_active: false }).eq("id", product.dbId);
        if (error) {
          alert(error.message);
          return;
        }
      }
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  }

  async function saveCategoryForm(e) {
    e.preventDefault();
    if (!supabase || !activeStoreId || !categoryFormName.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .upsert({
        store_id: activeStoreId,
        name: categoryFormName.trim(),
        icon: categoryFormIcon,
        sort_order: (menuCategories.length + 1) * 10,
        is_active: true,
      }, { onConflict: "store_id,name" })
      .select("id,name,icon,sort_order,is_active")
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    setMenuCategories((prev) => [...prev.filter((cat) => cat.id !== data.id && cat.name !== data.name), data].sort((a, b) => a.sort_order - b.sort_order));
    setCategoryFormName("");
  }

  async function toggleCategory(category) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id)
      .select("id,name,icon,sort_order,is_active")
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    setMenuCategories((prev) => prev.map((cat) => (cat.id === data.id ? data : cat)));
  }

  async function saveModifierGroup(e) {
    e.preventDefault();
    if (!supabase || !activeStoreId || !modifierGroupName.trim()) return;
    const { data, error } = await supabase
      .from("modifier_groups")
      .insert({
        store_id: activeStoreId,
        name: modifierGroupName.trim(),
        min_select: 0,
        max_select: 6,
        is_required: false,
        sort_order: (modifierGroups.length + 1) * 10,
      })
      .select("id,name,min_select,max_select,is_required,sort_order,modifier_options(id,name,price_cents,is_active,sort_order)")
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    setModifierGroups((prev) => [...prev, { ...data, modifier_options: [] }]);
    setModifierGroupName("");
  }

  async function saveModifierOption(e) {
    e.preventDefault();
    if (!supabase || !modifierOptionGroupId || !modifierOptionName.trim()) return;
    const { data, error } = await supabase
      .from("modifier_options")
      .insert({
        group_id: modifierOptionGroupId,
        name: modifierOptionName.trim(),
        price_cents: Math.round(Number(modifierOptionPrice || 0) * 100),
        is_active: true,
      })
      .select("id,name,price_cents,is_active,sort_order")
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    setModifierGroups((prev) => prev.map((group) => (
      group.id === modifierOptionGroupId
        ? { ...group, modifier_options: [...(group.modifier_options || []), data] }
        : group
    )));
    setModifierOptionName("");
    setModifierOptionPrice("");
  }

  async function addStaffMember(e) {
    e.preventDefault();
    if (!supabase || !activeStoreId || !staffEmail.trim()) return;
    const { error } = await supabase.rpc("add_store_member_by_email", {
      p_store_id: activeStoreId,
      p_email: staffEmail.trim(),
      p_role: staffRole,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setStaffEmail("");
    const { data } = await supabase
      .from("store_memberships")
      .select("id,user_id,role,is_active,profiles(full_name,phone)")
      .eq("store_id", activeStoreId)
      .order("created_at", { ascending: true });
    if (data) setStaffMembers(data);
  }

  async function toggleStaffMember(member) {
    if (!supabase) return;
    const { error } = await supabase.rpc("set_store_member_active", {
      p_membership_id: member.id,
      p_is_active: !member.is_active,
    });
    if (error) {
      alert(error.message);
      return;
    }
    const { data } = await supabase
      .from("store_memberships")
      .select("id,user_id,role,is_active,profiles(full_name,phone)")
      .eq("store_id", activeStoreId)
      .order("created_at", { ascending: true });
    if (data) setStaffMembers(data);
  }

  async function saveDeliveryZone(e) {
    e.preventDefault();
    if (!supabase || !activeStoreId || !zoneName.trim()) return;
    const { data, error } = await supabase
      .from("delivery_zones")
      .upsert({
        store_id: activeStoreId,
        name: zoneName.trim(),
        delivery_fee_cents: Math.round(Number(zoneFee || 0) * 100),
        min_order_cents: Math.round(Number(zoneMinOrder || 0) * 100),
        is_active: true,
      }, { onConflict: "store_id,name" })
      .select("id,name,delivery_fee_cents,min_order_cents,is_active")
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    setDeliveryZones((prev) => [...prev.filter((zone) => zone.id !== data.id && zone.name !== data.name), data].sort((a, b) => a.name.localeCompare(b.name)));
    setZoneName("");
    setZoneFee("");
    setZoneMinOrder("");
  }

  const cashClosingText = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== "Cancelado");
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const countOrders = validOrders.length;

    const payments = { Pix: 0, "Cartão de Crédito": 0, "Cartão de Débito": 0, Dinheiro: 0, "Pago pelo App (iFood)": 0 };
    validOrders.forEach(o => {
      const payType = o.payment;
      if (payments[payType] !== undefined) {
        payments[payType] += o.total;
      } else {
        payments["Pix"] += o.total;
      }
    });

    return `*FECHAMENTO DE CAIXA - DOUTOR BURGER*\n` +
      `Data: ${new Date().toLocaleDateString("pt-BR")}\n` +
      `Total de Pedidos: ${countOrders}\n` +
      `Faturamento Total: ${money.format(totalRevenue)}\n` +
      `---------------------------\n` +
      `*DETALHE POR PAGAMENTO:*\n` +
      `- Pix: ${money.format(payments["Pix"])}\n` +
      `- Cartão de Crédito: ${money.format(payments["Cartão de Crédito"])}\n` +
      `- Cartão de Débito: ${money.format(payments["Cartão de Débito"])}\n` +
      `- Dinheiro: ${money.format(payments["Dinheiro"])}\n` +
      `- Pago pelo App (iFood): ${money.format(payments["Pago pelo App (iFood)"])}\n` +
      `---------------------------\n` +
      `Enviado via Central de Controle.`;
  }, [orders]);

  const selectedAdminOrder = orders.find(o => o.id === selectedAdminOrderId) || orders[0];
  const selectedPendingStatus = selectedAdminOrder ? (pendingOrderStatuses[selectedAdminOrder.id] || selectedAdminOrder.status) : "";
  const selectedStatusOptions = selectedAdminOrder ? nextOrderStatuses(selectedAdminOrder.status) : [];
  const hasPendingStatusChange = Boolean(selectedAdminOrder && selectedPendingStatus && selectedPendingStatus !== selectedAdminOrder.status);

  // RENDER SELECTION BY PAGE
  if (page === "login") {
    return (
      <main className="admin-login">
        <section className="login-card">
          <span className="brand-mark"><img src="/assets/brand/logo.png" alt="Doutor Burger Logo" width="64" height="64" decoding="async" /></span>
          <h1>Entrar como loja</h1>
          <p>Acesse pedidos, cardapio, horarios e mensagens do painel digital.</p>
          {loginError && <p style={{ color: "#ff8888", fontWeight: "bold" }}>{loginError}</p>}
          <form onSubmit={handleAdminLogin}>
            <label className="field">E-mail <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></label>
            <label className="field">Senha <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></label>
            <button className="primary-btn full" type="submit">Entrar no painel</button>
            <button className="outline-btn full" type="button" onClick={handlePasswordRecovery}>Recuperar senha</button>
          </form>
          {!isSupabaseConfigured && <p className="notice">Supabase ainda nao configurado. Usando dados locais de demonstracao.</p>}
          {supabaseNotice && <p style={{ color: "#ff8888", fontWeight: "bold" }}>{supabaseNotice}</p>}
          <button className="muted-link" onClick={() => setPage("client")} style={{ background: "none", border: 0, cursor: "pointer" }}>Voltar ao cardapio</button>
        </section>
      </main>
    );
  }

  if ((page === "admin" || page === "kitchen") && !authReady) {
    return (
      <main className="admin-login">
        <section>
          <span className="brand-mark"><img src="/assets/brand/logo.png" alt="Doutor Burger Logo" width="64" height="64" decoding="async" /></span>
          <h1>Carregando painel...</h1>
          <p>Conferindo sua sessao e permissao da loja.</p>
        </section>
      </main>
    );
  }

  if ((page === "admin" || page === "kitchen") && !session) return null;

  if ((page === "admin" || page === "kitchen") && !currentStaffRole) {
    return (
      <main className="admin-login">
        <section>
          <span className="brand-mark"><img src="/assets/brand/logo.png" alt="Doutor Burger Logo" width="64" height="64" decoding="async" /></span>
          <h1>Carregando permissao...</h1>
          <p>Buscando seu cargo na BurgerC.</p>
        </section>
      </main>
    );
  }

  if (page === "kitchen") {
    const activeKitchenOrders = orders.filter(o => ["Recebido", "Confirmado", "Em preparo"].includes(o.status));
    return (
      <main className="kitchen-view">
        <header className="kitchen-header">
          <div>
            <h1>Painel da Cozinha (KDS)</h1>
            <span style={{ color: "#66707c" }}>{activeKitchenOrders.length} pedido(s) em andamento</span>
          </div>
          <button className="outline-btn" style={{ background: "#1f252d", color: "#fff", borderColor: "#3a4659" }} onClick={goToAdminOrders}>
            Voltar ao Admin
          </button>
        </header>
        <section className="kitchen-grid">
          {activeKitchenOrders.map(order => (
            <article className="kitchen-card" key={order.id}>
              <div className={`kitchen-card-header ${order.origin === "iFood" ? "ifood-card-header" : ""}`}>
                <strong>{order.id} ({order.origin})</strong>
                <span>{order.time}</span>
              </div>
              <div className="kitchen-card-body">
                <div className="kitchen-items-list">
                  {order.items.map((item, idx) => (
                    <div className="kitchen-item-row" key={idx}>
                      <div className="kitchen-item-title">
                        <span><strong className="kitchen-item-qty">{item.qty}x</strong> {item.name}</span>
                      </div>
                      {item.notes && <div className="kitchen-item-notes">{item.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="kitchen-card-footer">
                {order.status === "Recebido" || order.status === "Confirmado" ? (
                  <button className="primary-btn full" style={{ minHeight: "42px" }} disabled={savingOrderId === order.id} onClick={() => updateOrderStatus(order.id, "Em preparo", { skipConfirm: true, reason: "Iniciado na tela da cozinha" })}>
                    {savingOrderId === order.id ? "Salvando..." : "Preparar"}
                  </button>
                ) : (
                  <button className="kds-btn-done full" disabled={savingOrderId === order.id} onClick={() => updateOrderStatus(order.id, "Pronto", { skipConfirm: true, reason: "Finalizado na tela da cozinha" })}>
                    {savingOrderId === order.id ? "Salvando..." : "Marcar como Pronto"}
                  </button>
                )}
              </div>
            </article>
          ))}
          {activeKitchenOrders.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 20px", color: "#66707c" }}>
              Nenhum pedido para preparar no momento.
            </div>
          )}
        </section>
      </main>
    );
  }

  if (page === "admin") {
    const metricNew = orders.filter(o => o.status === "Recebido").length;
    const metricPrep = orders.filter(o => o.status === "Em preparo").length;
    const metricRevenue = orders.filter(o => o.status === "Entregue").reduce((sum, o) => sum + o.total, 0);
    const canManageCatalog = ["owner", "admin", "manager"].includes(currentStaffRole);
    const canManageStaff = ["owner", "admin"].includes(currentStaffRole);
    const canManageSettings = ["owner", "admin", "manager"].includes(currentStaffRole);
    const canUseKitchen = ["owner", "admin", "manager", "kitchen"].includes(currentStaffRole);

    return (
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setPage("client"); }}>
            <span className="brand-mark"><img src="/assets/brand/logo.png" alt="Doutor Burger Logo" width="64" height="64" decoding="async" /></span>
            <span><strong>{storeSettings.name}</strong><small>Painel da loja</small></span>
          </a>
          <nav>
            <button className={adminTab === "orders" ? "is-active" : ""} onClick={() => setAdminTab("orders")}>Pedidos</button>
            {canManageCatalog && <button className={adminTab === "menu" ? "is-active" : ""} onClick={() => setAdminTab("menu")}>Cardapio</button>}
            {canManageCatalog && <button className={adminTab === "categories" ? "is-active" : ""} onClick={() => setAdminTab("categories")}>Categorias</button>}
            {canManageCatalog && <button className={adminTab === "modifiers" ? "is-active" : ""} onClick={() => setAdminTab("modifiers")}>Adicionais</button>}
            {canManageSettings && <button className={adminTab === "delivery" ? "is-active" : ""} onClick={() => setAdminTab("delivery")}>Entregas</button>}
            {canManageStaff && <button className={adminTab === "staff" ? "is-active" : ""} onClick={() => setAdminTab("staff")}>Equipe</button>}
            {canManageSettings && <button className={adminTab === "settings" ? "is-active" : ""} onClick={() => setAdminTab("settings")}>Configuracoes</button>}
            {canUseKitchen && <button onClick={() => setPage("kitchen")}>Tela de Cozinha (KDS)</button>}
            <button onClick={handleLogout} style={{ marginTop: "auto", background: "rgba(255, 100, 100, 0.1)", color: "#ff8888" }}>Sair do Painel</button>
          </nav>
        </aside>

        <section className="admin-content">
          <header className="admin-header">
            <div>
              <span className="eyebrow">Gestão de Vendas</span>
              <h1>Central de Controle</h1>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="primary-btn" onClick={() => setShowCashClose(true)} style={{ background: "var(--green)", boxShadow: "none", color: "#fff" }}>
                Fechar Caixa (Dia)
              </button>
              <a className="outline-btn" href="#" onClick={(e) => { e.preventDefault(); setPage("client"); }}>Ir para o cardápio</a>
            </div>
          </header>

          {adminTab === "orders" && (
            <section className="admin-tab">
              <div className="metric-grid">
                <article><span>Novos</span><strong>{metricNew}</strong></article>
                <article><span>Em preparo</span><strong>{metricPrep}</strong></article>
                <article><span>Faturamento Entregue</span><strong>{money.format(metricRevenue)}</strong></article>
                <article><span>Pedidos Hoje</span><strong>{orders.length}</strong></article>
              </div>

              <div className="orders-layout">
                <div className="order-list">
                  {orders.map(order => (
                    <article
                      key={order.id}
                      className={`order-ticket ${selectedAdminOrderId === order.id ? "is-active" : ""} ${order.origin === "iFood" ? "origin-ifood" : ""}`}
                      onClick={() => setSelectedAdminOrderId(order.id)}
                    >
                      <strong>{order.id}</strong>
                      <p>{order.name}</p>
                      <span>{order.time} - {order.origin}</span>
                      <strong>{money.format(order.total)}</strong>
                      <span className={`badge badge-${order.status.toLowerCase().replace(" ", "")}`}>
                        {order.status}
                      </span>
                    </article>
                  ))}
                </div>

                {selectedAdminOrder && (
                  <article className="order-detail">
                    <div className="panel-head">
                      <div>
                        <span className="eyebrow">{selectedAdminOrder.origin}</span>
                        <h2>Pedido {selectedAdminOrder.id}</h2>
                      </div>
                      <span className={`badge badge-${selectedAdminOrder.status.toLowerCase().replace(" ", "")}`}>
                        {selectedAdminOrder.status}
                      </span>
                    </div>

                    <div className="customer-card">
                      <strong>{selectedAdminOrder.name}</strong>
                      <span>WhatsApp: {selectedAdminOrder.phone}</span>
                      <span>Endereço: {selectedAdminOrder.address}</span>
                      {selectedAdminOrder.complement && <span>Complemento: {selectedAdminOrder.complement}</span>}
                    </div>

                    <div className="admin-items">
                      {selectedAdminOrder.items.map((item, idx) => (
                        <div key={idx} style={{ flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                            <span>{item.qty}x {item.name}</span>
                            <strong>{money.format(item.price * item.qty)}</strong>
                          </div>
                          {item.notes && <small style={{ color: "var(--muted)", fontStyle: "italic", marginLeft: "14px" }}>- {item.notes}</small>}
                        </div>
                      ))}
                      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "8px 0" }} />
                      <div><span>Subtotal</span><span>{money.format(selectedAdminOrder.subtotal)}</span></div>
                      <div><span>Taxa de Entrega</span><span>{money.format(selectedAdminOrder.deliveryFee)}</span></div>
                      <div className="total"><span>Total</span><span>{money.format(selectedAdminOrder.total)}</span></div>
                    </div>

                    <h3>Atualizar Status</h3>
                    <div className="status-actions">
                      {orderStatusLabels.map(st => {
                        const isAllowed = selectedStatusOptions.includes(st);
                        return (
                        <button
                          key={st}
                          type="button"
                          disabled={!isAllowed || savingOrderId === selectedAdminOrder.id}
                          className={selectedPendingStatus === st ? "is-active" : ""}
                          onClick={() => setPendingOrderStatuses((prev) => ({ ...prev, [selectedAdminOrder.id]: st }))}
                          title={!isAllowed ? `Nao permitido a partir de ${selectedAdminOrder.status}` : ""}
                        >
                          {st}
                        </button>
                        );
                      })}
                    </div>
                    {hasPendingStatusChange && (
                      <p style={{ margin: "8px 0 0", color: "var(--muted)", fontWeight: 700 }}>
                        Alteracao pendente: {selectedAdminOrder.status} para {selectedPendingStatus}
                      </p>
                    )}

                    <div className="admin-buttons">
                      <button
                        className="primary-btn"
                        type="button"
                        disabled={!hasPendingStatusChange || savingOrderId === selectedAdminOrder.id}
                        onClick={() => updateOrderStatus(selectedAdminOrder.id, selectedPendingStatus, { skipConfirm: true, reason: "Salvo no painel de pedidos" })}
                      >
                        {savingOrderId === selectedAdminOrder.id ? "Salvando..." : "Salvar atualizacao"}
                      </button>
                      <button className="outline-btn" onClick={() => setReceiptOrder(selectedAdminOrder)}>Imprimir Recibo</button>
                      <a
                        className="outline-btn"
                        href={`https://wa.me/55${selectedAdminOrder.phone.replace(/\D/g, "")}?text=Olá ${selectedAdminOrder.name}! Seu pedido ${selectedAdminOrder.id} foi atualizado para: ${selectedAdminOrder.status}.`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Enviar WhatsApp
                      </a>
                      {selectedAdminOrder.status !== "Cancelado" && (
                        <button className="danger-btn" onClick={() => cancelOrder(selectedAdminOrder.id)}>Cancelar Pedido</button>
                      )}
                    </div>
                  </article>
                )}
              </div>
            </section>
          )}

          {adminTab === "menu" && (
            <section className="admin-tab">
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <div><span className="eyebrow">Gerenciamento</span><h2>Cardápio Digital</h2></div>
                <button className="primary-btn" onClick={openAddProduct}>+ Novo Produto</button>
              </div>

              {editingProduct && (
                <form onSubmit={saveProductForm} className="settings-card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px", marginBottom: "20px" }}>
                  <h3>{editingProduct.id === "new" ? "Adicionar Novo Produto" : "Editar Produto"}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <label className="field">Nome do Produto
                      <input required value={productFormName} onChange={(e) => setProductFormName(e.target.value)} />
                    </label>
                    <label className="field">Categoria
                      <select className="field" value={productFormCategory} onChange={(e) => setProductFormCategory(e.target.value)} style={{ width: "100%", height: "52px", borderRadius: "16px", padding: "0 16px", background: "#fff", border: "1px solid var(--line)" }}>
                        {categoryNames.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </label>
                    <label className="field">Preço (R$)
                      <input required type="number" step="0.01" value={productFormPrice} onChange={(e) => setProductFormPrice(e.target.value)} />
                    </label>
                    <label className="field">Status
                      <select className="field" value={productFormActive ? "Ativo" : "Pausado"} onChange={(e) => setProductFormActive(e.target.value === "Ativo")} style={{ width: "100%", height: "52px", borderRadius: "16px", padding: "0 16px", background: "#fff", border: "1px solid var(--line)" }}>
                        <option value="Ativo">Disponível (Ativo)</option>
                        <option value="Pausado">Indisponível (Pausado)</option>
                      </select>
                    </label>
                  </div>
                  <label className="field" style={{ marginTop: "12px" }}>Descrição / Ingredientes
                    <textarea value={productFormDesc} onChange={(e) => setProductFormDesc(e.target.value)} style={{ width: "100%", minHeight: "80px", borderRadius: "16px", padding: "12px", border: "1px solid var(--line)" }} />
                  </label>
                  <label className="field" style={{ marginTop: "12px" }}>Imagem do produto
                    <input value={productFormImage} onChange={(e) => setProductFormImage(e.target.value)} placeholder="/assets/products/foto.webp ou URL da imagem" />
                  </label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                    <button className="primary-btn" type="submit">Salvar Produto</button>
                    <button className="outline-btn" type="button" onClick={() => setEditingProduct(null)}>Cancelar</button>
                  </div>
                </form>
              )}

              <div className="admin-table">
                <div className="table-row head">
                  <span>Produto</span>
                  <span>Categoria</span>
                  <span>Preço</span>
                  <span>Ações</span>
                </div>
                {products.map(product => (
                  <div className="table-row" key={product.id}>
                    <span>
                      {product.name}
                      {product.active === false && <span style={{ marginLeft: "8px", background: "#fee", color: "#c44", fontSize: "11px", padding: "3px 6px", borderRadius: "4px" }}>Pausado</span>}
                    </span>
                    <span>{product.category}</span>
                    <span>{money.format(product.price)}</span>
                    <span style={{ display: "flex", gap: "8px" }}>
                      <button className="outline-btn" style={{ minHeight: "34px", padding: "0 12px", borderRadius: "8px" }} onClick={() => openEditProduct(product)}>Editar</button>
                      <button className="outline-btn" style={{ minHeight: "34px", padding: "0 12px", borderRadius: "8px", borderColor: "#fcc", color: "#c44" }} onClick={() => deleteProduct(product.id)}>Excluir</button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminTab === "categories" && (
            <section className="admin-tab">
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <div><span className="eyebrow">Organização</span><h2>Categorias do cardápio</h2></div>
              </div>
              <form onSubmit={saveCategoryForm} className="settings-card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "12px", alignItems: "end" }}>
                  <label className="field">Nome
                    <input value={categoryFormName} onChange={(e) => setCategoryFormName(e.target.value)} placeholder="Ex: Bebidas" />
                  </label>
                  <label className="field">Ícone
                    <select value={categoryFormIcon} onChange={(e) => setCategoryFormIcon(e.target.value)} style={{ width: "100%", height: "52px", borderRadius: "16px", padding: "0 16px", background: "#fff", border: "1px solid var(--line)" }}>
                      {["burger", "combo", "fries", "drink", "cake"].map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                  </label>
                  <button className="primary-btn" type="submit">Salvar</button>
                </div>
              </form>
              <div className="admin-table">
                <div className="table-row head"><span>Categoria</span><span>Ícone</span><span>Status</span><span>Ações</span></div>
                {menuCategories.map((category) => (
                  <div className="table-row" key={category.id}>
                    <span>{category.name}</span>
                    <span>{category.icon}</span>
                    <span>{category.is_active ? "Ativa" : "Pausada"}</span>
                    <span><button className="outline-btn" onClick={() => toggleCategory(category)}>{category.is_active ? "Pausar" : "Ativar"}</button></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminTab === "modifiers" && (
            <section className="admin-tab">
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <div><span className="eyebrow">Personalização</span><h2>Adicionais e opções</h2></div>
              </div>
              <div className="settings-grid">
                <form onSubmit={saveModifierGroup} className="settings-card">
                  <h2>Novo grupo</h2>
                  <label className="field">Nome do grupo
                    <input value={modifierGroupName} onChange={(e) => setModifierGroupName(e.target.value)} placeholder="Ex: Extras" />
                  </label>
                  <button className="primary-btn full" type="submit">Criar grupo</button>
                </form>
                <form onSubmit={saveModifierOption} className="settings-card">
                  <h2>Nova opção</h2>
                  <label className="field">Grupo
                    <select value={modifierOptionGroupId} onChange={(e) => setModifierOptionGroupId(e.target.value)} style={{ width: "100%", height: "52px", borderRadius: "16px", padding: "0 16px", background: "#fff", border: "1px solid var(--line)" }}>
                      <option value="">Selecione</option>
                      {modifierGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                  <label className="field">Nome
                    <input value={modifierOptionName} onChange={(e) => setModifierOptionName(e.target.value)} placeholder="Ex: Bacon extra" />
                  </label>
                  <label className="field">Preço adicional
                    <input type="number" step="0.01" value={modifierOptionPrice} onChange={(e) => setModifierOptionPrice(e.target.value)} />
                  </label>
                  <button className="primary-btn full" type="submit">Criar opção</button>
                </form>
              </div>
              <div className="admin-table" style={{ marginTop: "20px" }}>
                <div className="table-row head"><span>Grupo</span><span>Opções</span><span>Seleção</span><span>Status</span></div>
                {modifierGroups.map((group) => (
                  <div className="table-row" key={group.id}>
                    <span>{group.name}</span>
                    <span>{(group.modifier_options || []).map((option) => `${option.name} (${money.format(centsToMoney(option.price_cents))})`).join(", ") || "Sem opções"}</span>
                    <span>{group.min_select} a {group.max_select}</span>
                    <span>{group.is_required ? "Obrigatório" : "Opcional"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminTab === "delivery" && (
            <section className="admin-tab">
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <div><span className="eyebrow">Entrega</span><h2>Áreas e taxas</h2></div>
              </div>
              <form onSubmit={saveDeliveryZone} className="settings-card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px auto", gap: "12px", alignItems: "end" }}>
                  <label className="field">Bairro / área
                    <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Ex: Alto do Mateus" />
                  </label>
                  <label className="field">Taxa
                    <input type="number" step="0.01" value={zoneFee} onChange={(e) => setZoneFee(e.target.value)} />
                  </label>
                  <label className="field">Pedido mínimo
                    <input type="number" step="0.01" value={zoneMinOrder} onChange={(e) => setZoneMinOrder(e.target.value)} />
                  </label>
                  <button className="primary-btn" type="submit">Salvar</button>
                </div>
              </form>
              <div className="admin-table">
                <div className="table-row head"><span>Área</span><span>Taxa</span><span>Mínimo</span><span>Status</span></div>
                {deliveryZones.map((zone) => (
                  <div className="table-row" key={zone.id}>
                    <span>{zone.name}</span>
                    <span>{money.format(centsToMoney(zone.delivery_fee_cents))}</span>
                    <span>{money.format(centsToMoney(zone.min_order_cents))}</span>
                    <span>{zone.is_active ? "Ativa" : "Pausada"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminTab === "staff" && (
            <section className="admin-tab">
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <div><span className="eyebrow">Acesso</span><h2>Equipe da loja</h2></div>
              </div>
              <form onSubmit={addStaffMember} className="settings-card" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "12px", alignItems: "end" }}>
                  <label className="field">E-mail já cadastrado
                    <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="funcionario@email.com" />
                  </label>
                  <label className="field">Função
                    <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)} style={{ width: "100%", height: "52px", borderRadius: "16px", padding: "0 16px", background: "#fff", border: "1px solid var(--line)" }}>
                      {["admin", "manager", "kitchen", "cashier"].map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                  <button className="primary-btn" type="submit">Adicionar</button>
                </div>
              </form>
              <div className="admin-table">
                <div className="table-row head"><span>Usuário</span><span>Função</span><span>Status</span><span>Ações</span></div>
                {staffMembers.map((member) => (
                  <div className="table-row" key={member.id}>
                    <span>{member.profiles?.full_name || member.user_id}</span>
                    <span>{member.role}</span>
                    <span>{member.is_active ? "Ativo" : "Inativo"}</span>
                    <span><button className="outline-btn" onClick={() => toggleStaffMember(member)}>{member.is_active ? "Desativar" : "Ativar"}</button></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminTab === "settings" && (
            <section className="admin-tab">
              <div className="settings-grid">
                <article className="settings-card">
                  <h2>Loja</h2>
                  <label className="field">Nome da Loja 
                    <input value={storeSettings.name} onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })} />
                  </label>
                  <label className="field">WhatsApp Comercial 
                    <input value={storeSettings.phone} onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })} />
                  </label>
                  <label className="field">Pedido Mínimo 
                    <input type="number" value={storeSettings.minOrder} onChange={(e) => setStoreSettings({ ...storeSettings, minOrder: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <button className="primary-btn full" type="button" onClick={saveStoreSettings}>Salvar configurações</button>
                </article>
                <article className="settings-card">
                  <h2>Horário de Funcionamento</h2>
                  <label className="field">Horário de Abertura (HH:MM)
                    <input type="time" value={storeSettings.openHour} onChange={(e) => setStoreSettings({ ...storeSettings, openHour: e.target.value })} />
                  </label>
                  <label className="field">Horário de Fechamento (HH:MM)
                    <input type="time" value={storeSettings.closeHour} onChange={(e) => setStoreSettings({ ...storeSettings, closeHour: e.target.value })} />
                  </label>
                  <div style={{ marginTop: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "8px" }}>Dias de Funcionamento</span>
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName, idx) => (
                      <label key={idx} style={{ display: "inline-flex", alignItems: "center", marginRight: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
                        <input
                          type="checkbox"
                          style={{ marginRight: "6px" }}
                          checked={storeSettings.openDays.includes(idx)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...storeSettings.openDays, idx]
                              : storeSettings.openDays.filter(d => d !== idx);
                            setStoreSettings({ ...storeSettings, openDays: updated });
                          }}
                        />
                        {dayName}
                      </label>
                    ))}
                  </div>
                  <button className="primary-btn full" type="button" style={{ marginTop: "18px" }} onClick={saveStoreSettings}>Salvar horários</button>
                </article>
              </div>
            </section>
          )}
        </section>

        {/* CASH CLOSING MODAL */}
        {showCashClose && (
          <div className="receipt-preview-modal">
            <div className="receipt-modal-content" style={{ maxWidth: "460px" }}>
              <h2>Fechamento de Caixa</h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>Aqui está o resumo operacional das vendas do dia.</p>
              <textarea
                readOnly
                value={cashClosingText}
                style={{ width: "100%", height: "240px", fontFamily: "monospace", fontSize: "12px", padding: "12px", border: "1px solid var(--line)", borderRadius: "12px", resize: "none" }}
              />
              <div className="receipt-modal-actions">
                <button
                  className="primary-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(cashClosingText);
                    alert("Resumo copiado para a área de transferência!");
                  }}
                >
                  Copiar Resumo
                </button>
                <button className="outline-btn" onClick={() => setShowCashClose(false)}>Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* PRINT RECEIPT MODAL PREVIEW */}
        {receiptOrder && (() => {
          const cleanId = receiptOrder.id.replace(/\D/g, "").padStart(4, "0");
          // deterministic suffix to prevent key from changing on re-renders
          const stableSeed = (receiptOrder.time || "12:00").replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
          const accessKey = `2526061234567800019065001000${cleanId}${stableSeed}`;
          const formattedAccessKey = accessKey.match(/.{1,4}/g).join(" ");
          
          return (
            <div className="receipt-preview-modal">
              <div className="receipt-modal-content">
                {/* Receipt Type Toggle (hidden on print) */}
                <div className="receipt-toggle no-print" style={{ display: "flex", gap: "8px", marginBottom: "16px", background: "#f1f3f5", padding: "4px", borderRadius: "10px" }}>
                  <button 
                    className={receiptType === "fiscal" ? "primary-btn" : "outline-btn"} 
                    onClick={() => setReceiptType("fiscal")}
                    style={{ flex: 1, padding: "8px 12px", fontSize: "12px", border: "none", margin: 0, borderRadius: "6px" }}
                  >
                    Via do Cliente
                  </button>
                  <button 
                    className={receiptType === "cozinha" ? "primary-btn" : "outline-btn"} 
                    onClick={() => setReceiptType("cozinha")}
                    style={{ flex: 1, padding: "8px 12px", fontSize: "12px", border: "none", margin: 0, borderRadius: "6px" }}
                  >
                    🍳 Via da Cozinha
                  </button>
                </div>

                {receiptType === "fiscal" ? (
                  /* COMPROVANTE DO CLIENTE - MEI */
                  <div className="thermal-receipt" id="printableReceipt">
                    <h2 style={{ fontSize: "15px", textAlign: "center", textTransform: "uppercase", margin: "0 0 4px 0" }}>DOUTOR BURGER</h2>
                    <p className="center" style={{ fontSize: "11px", margin: "2px 0" }}>CNPJ: 67.929.090/0001-70</p>
                    <p className="center" style={{ fontSize: "10px", margin: "2px 0" }}>MEI - Proprietario de lanchonete</p>
                    <p className="center" style={{ fontSize: "10px", margin: "2px 0" }}>CNAE 5611-2/03 - Lanchonetes e similares</p>
                    <p className="center" style={{ fontSize: "10px", margin: "2px 0" }}>Rua Clotilde Torres, 116-B, Casa</p>
                    <p className="center" style={{ fontSize: "10px", margin: "2px 0" }}>Alto do Mateus - Joao Pessoa/PB - CEP 58090-240</p>
                    <hr style={{ borderStyle: "dashed" }} />
                    <p className="center" style={{ fontSize: "11px", fontWeight: "bold", margin: "4px 0" }}>COMPROVANTE DE PEDIDO</p>
                    <p className="center" style={{ fontSize: "9px", margin: "2px 0" }}>Documento sem valor fiscal</p>
                    <hr style={{ borderStyle: "dashed" }} />

                    <p style={{ fontSize: "10px", margin: "2px 0" }}><strong>PEDIDO: {receiptOrder.id}</strong></p>
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>EMISSAO: {receiptOrder.time} - {receiptOrder.origin}</p>
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>CLIENTE: {receiptOrder.name}</p>
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>TELEFONE: {receiptOrder.phone}</p>
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>ENTREGA: {receiptOrder.address}{receiptOrder.complement ? ` - ${receiptOrder.complement}` : ""}</p>
                    <hr style={{ borderStyle: "dashed" }} />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 30px 48px 52px", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>
                      <span>Item</span>
                      <span style={{ textAlign: "right" }}>Qtd</span>
                      <span style={{ textAlign: "right" }}>V.Unit</span>
                      <span style={{ textAlign: "right" }}>Total</span>
                    </div>

                    {receiptOrder.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "11px", marginBottom: "4px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 30px 48px 52px" }}>
                          <span>{item.name}</span>
                          <span style={{ textAlign: "right" }}>{item.qty} UN</span>
                          <span style={{ textAlign: "right" }}>{money.format(item.price).replace("R$", "").trim()}</span>
                          <span style={{ textAlign: "right" }}>{money.format(item.price * item.qty).replace("R$", "").trim()}</span>
                        </div>
                        {item.notes && <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#555", fontStyle: "italic" }}>- {item.notes}</p>}
                      </div>
                    ))}

                    <hr style={{ borderStyle: "dashed" }} />
                    <div className="item-row" style={{ fontSize: "12px" }}><span>Qtd. Total de Itens</span><span>{receiptOrder.items.reduce((sum, i) => sum + i.qty, 0)}</span></div>
                    <div className="item-row" style={{ fontSize: "12px" }}><span>Subtotal</span><span>{money.format(receiptOrder.subtotal)}</span></div>
                    <div className="item-row" style={{ fontSize: "12px" }}><span>Taxa de Entrega</span><span>{money.format(receiptOrder.deliveryFee)}</span></div>
                    <div className="total-row" style={{ marginTop: "4px", fontSize: "14px" }}><span>VALOR A PAGAR</span><span>{money.format(receiptOrder.total)}</span></div>
                    <hr style={{ borderStyle: "dashed" }} />
                    <div className="item-row" style={{ fontSize: "12px" }}><span>Pagamento</span><span>{receiptOrder.payment}</span></div>
                    <hr style={{ borderStyle: "dashed" }} />
                    <p className="center" style={{ fontSize: "9px", lineHeight: "1.3", margin: "4px 0" }}>Para emissao de nota fiscal, solicite ao estabelecimento.</p>
                    <p className="center" style={{ fontSize: "10px" }}>Obrigado pela preferencia!</p>
                  </div>
                ) : (
                  /* VIA DE PRODUÇÃO / COZINHA (NÃO FISCAL) */
                  <div className="thermal-receipt" id="printableReceipt">
                    <h2 style={{ fontSize: "18px", textAlign: "center", textTransform: "uppercase", margin: "0 0 4px 0" }}>COZINHA / PRODUÇÃO</h2>
                    <p className="center" style={{ fontSize: "12px", fontWeight: "bold", margin: "2px 0", letterSpacing: "1px" }}>VIA DE PREPARO (NÃO FISCAL)</p>
                    <hr />
                    <p style={{ fontSize: "14px", margin: "6px 0" }}><strong>PEDIDO: {receiptOrder.id}</strong></p>
                    <p style={{ fontSize: "11px", margin: "2px 0" }}>Data/Hora: {receiptOrder.time} - {receiptOrder.origin}</p>
                    <hr />
                    <p style={{ fontSize: "12px", margin: "4px 0" }}><strong>CLIENTE:</strong> {receiptOrder.name}</p>
                    {receiptOrder.address && (
                      <p style={{ fontSize: "12px", margin: "4px 0" }}><strong>ENTREGA:</strong> {receiptOrder.address} {receiptOrder.complement ? `(${receiptOrder.complement})` : ""}</p>
                    )}
                    <hr />
                    
                    {/* Items List for Kitchen */}
                    {receiptOrder.items.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold" }}>
                          <span>[ {item.qty}x ] {item.name}</span>
                        </div>
                        {item.notes && (
                          <div style={{ margin: "6px 0 0 10px", padding: "6px", background: "#f8f9fa", borderRadius: "6px", fontSize: "12px", color: "#c94b3a", fontWeight: "bold", borderLeft: "3px solid #c94b3a" }}>
                            ⚠️ OBS: {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <hr />
                    <p style={{ fontSize: "11px", margin: "2px 0" }}>Pagamento: {receiptOrder.payment}</p>
                    <p style={{ fontSize: "11px", margin: "2px 0" }}>Origem: {receiptOrder.origin}</p>
                    <hr />
                    <p className="center" style={{ fontSize: "10px", color: "#777" }}>Doutor Burger - Cura sua Fome</p>
                  </div>
                )}

                <div className="receipt-modal-actions">
                  <button className="primary-btn" onClick={() => window.print()}>Imprimir</button>
                  <button className="outline-btn" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => setReceiptOrder(null)}>Fechar</button>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    );
  }

  // DEFAULT CLIENT PAGE
  return (
    <>
      <div className="app-shell">
        <Header count={count} onHome={() => setView("home")} onCart={() => setView("cart")} onDelivery={() => setFlow("delivery")} isStoreOpen={isStoreOpen} />
        <main className="customer-grid">
          {/* Closed notice block - compact */}
          {!isStoreOpen && (
            <div className="notice" style={{ background: "#fff", padding: "18px", marginBottom: "20px", borderColor: "var(--line)", textAlign: "center", borderLeft: "4px solid var(--danger)" }}>
              <h2 style={{ color: "var(--danger)", fontSize: "18px", fontWeight: "900", margin: "0 0 4px 0" }}>Estamos fora do horário de funcionamento</h2>
              <p style={{ color: "var(--muted)", fontWeight: "600", fontSize: "13px", margin: 0 }}>Você pode navegar pelo cardápio, mas os pedidos estão suspensos temporariamente até a abertura.</p>
            </div>
          )}

            <Catalog
              activeCategory={activeCategory}
              categories={categoryNames}
              filteredProducts={filteredProducts}
              products={products}
            search={search}
            setActiveCategory={setActiveCategory}
            setSearch={setSearch}
            openProduct={openProduct}
            addQuick={addQuick}
            isStoreOpen={isStoreOpen}
          />
          {view === "cart" && (
            <CartPanel
              cart={cart}
              subtotal={subtotal}
              total={total}
              receiveMode={receiveMode}
              setReceiveMode={setReceiveMode}
              updateQty={updateQty}
              onBack={() => setView("home")}
              onFinish={() => setFlow("delivery")}
              storeSettings={storeSettings}
            />
          )}
        </main>
        {view === "home" && count > 0 && (
          <button className="mobile-cart-bar" onClick={() => setView("cart")}>
            <span><Icon name="cart" /> {count} {count === 1 ? "item" : "itens"}</span>
            <strong>Ver carrinho · {money.format(subtotal)}</strong>
          </button>
        )}
        <BottomNav count={count} onCart={() => setView("cart")} onTrack={() => setFlow("track")} />
      </div>

      {view === "detail" && (
        <ProductDetail
          product={selectedProduct}
          qty={detailQty}
          setQty={setDetailQty}
          extras={extras}
          toggleExtra={toggleExtra}
          meat={meat}
          setMeat={setMeat}
          combo={combo}
          setCombo={setCombo}
          note={note}
          setNote={setNote}
          unitPrice={detailUnitPrice}
          onBack={() => setView("home")}
          onAdd={addSelectedProduct}
          removedIngredients={removedIngredients}
          setRemovedIngredients={setRemovedIngredients}
        />
      )}
      <FlowDrawer
        flow={flow}
        total={total}
        receiveMode={receiveMode}
        setReceiveMode={setReceiveMode}
        onClose={() => { setFlow(null); setCheckoutError(""); }}
        setFlow={setFlow}
        checkoutName={checkoutName}
        setCheckoutName={setCheckoutName}
        checkoutPhone={checkoutPhone}
        setCheckoutPhone={setCheckoutPhone}
        checkoutAddress={checkoutAddress}
        setCheckoutAddress={setCheckoutAddress}
        checkoutComplement={checkoutComplement}
        setCheckoutComplement={setCheckoutComplement}
        checkoutPayment={checkoutPayment}
        setCheckoutPayment={setCheckoutPayment}
        checkoutChange={checkoutChange}
        setCheckoutChange={setCheckoutChange}
        onSubmit={submitClientOrder}
        currentOrder={currentClientOrder}
        storeSettings={storeSettings}
        cart={cart}
        checkoutError={checkoutError}
        setCheckoutError={setCheckoutError}
      />
    </>
  );
}

function Header({ count, onHome, onCart, onDelivery, isStoreOpen }) {
  return (
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Doutor Burger inicio" onClick={(event) => { event.preventDefault(); onHome(); }}>
        <span className="brand-mark"><img src="/assets/brand/logo.png" alt="Doutor Burger Logo" width="64" height="64" decoding="async" /></span>
        <span><strong>Doutor Burger</strong><small>Cura sua fome</small></span>
      </a>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button className="location-pill" onClick={onDelivery}>
          <Icon name="pin" />
          <span>Auto do Mateus</span>
        </button>
        <span style={{
          background: isStoreOpen ? "#ecf8e8" : "#fee3e3",
          color: isStoreOpen ? "#27852c" : "#c94b3a",
          border: `1px solid ${isStoreOpen ? "#cceabd" : "#fcc"}`,
          borderRadius: "999px",
          padding: "4px 10px",
          fontSize: "11px",
          fontWeight: "800",
          whiteSpace: "nowrap"
        }}>
          {isStoreOpen ? "● Aberto" : "● Fechado"}
        </span>
      </div>
      <div className="top-actions">
        <button className="cart-top-btn" onClick={onCart}><Icon name="cart" /> Carrinho <span id="cartBadgeTop">{count}</span></button>
      </div>
    </header>
  );
}

function Catalog({ activeCategory, categories, filteredProducts, products, search, setActiveCategory, setSearch, openProduct, addQuick, isStoreOpen }) {
  const comboProducts = products.filter((product) => product.active && product.category === "Combos");
  return (
    <section className="catalog" id="inicio">
      <Hero />
      <Combos products={comboProducts} openProduct={openProduct} isStoreOpen={isStoreOpen} />
      <Favorites products={products} openProduct={openProduct} />
      <section className="section-block" id="cardapio">
        <div className="section-head">
          <div><span className="eyebrow">Cardapio completo</span><h2>Escolha o seu pedido</h2></div>
          <label className="search"><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar no cardapio..." /></label>
        </div>
        <div className="category-tabs">
          {categories.map((category) => (
            <button key={category} className={category === activeCategory ? "is-active" : ""} onClick={() => setActiveCategory(category)}>
              <Icon name={categoryIcons[category]} /> {category}
            </button>
          ))}
        </div>
        <div className="product-layout">
          <div className="menu-column">
            <div className="product-list">
              {filteredProducts.length ? filteredProducts.map((product) => (
                <ProductRow key={product.id} product={product} openProduct={openProduct} addQuick={addQuick} isStoreOpen={isStoreOpen} />
              )) : <div className="notice">Nenhum produto encontrado ou pausado.</div>}
            </div>
          </div>
          <WhyCard />
        </div>
      </section>
      <Footer />
    </section>
  );
}

function Hero() {
  return (
    <div className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Aberto agora - Entrega 35-45 min</span>
        <h1><span>Doutor</span><span>Burger</span></h1>
        <p>Burgers artesanais, combos e batatas para matar sua fome hoje em Joao Pessoa.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => document.querySelector("#cardapio")?.scrollIntoView({ behavior: "smooth" })}>Ver cardapio</button>
          <a className="hero-link" href="#ofertas">Ver ofertas</a>
        </div>
        <div className="hero-meta">
          <span><Icon name="clock" /><strong>Aberto agora</strong> Ate 23h</span>
          <span><Icon name="bike" /><strong>Entrega</strong> 35-45 min</span>
          <span><Icon name="bag" /><strong>Retirada</strong> 20-30 min</span>
          <span><Icon name="coin" /><strong>Taxa</strong> a partir de R$ 6,90</span>
        </div>
      </div>
      <img src="/assets/new-direction/doutor-burger.webp" alt="Doutor Burger em destaque" width="960" height="960" decoding="async" fetchPriority="high" />
    </div>
  );
}

function Favorites({ products, openProduct }) {
  const favorites = products.filter((product) => product.active && product.isFavorite).slice(0, 3);
  if (!favorites.length) return null;
  const labels = ["Mais pedido", "Favorito da casa", "Especial"];
  return (
    <section className="section-block favorites" id="mais-pedidos">
      <div className="section-head compact">
        <div><span className="eyebrow">Mais pedidos</span><h2>Os campeoes da casa</h2></div>
        <a className="see-all" href="#cardapio">Ver todos</a>
      </div>
      <div className="favorite-grid">
        {favorites.map((product, index) => {
          return (
            <article className="favorite-card" key={product.id} onClick={() => openProduct(product.id)} style={{ cursor: "pointer" }}>
              <img src={product.image} alt={product.name} width="960" height="960" loading="lazy" decoding="async" />
              <span style={{ zIndex: 1 }}>{labels[index]}</span>
              <h3>{product.name}</h3>
              <strong>{money.format(product.price)}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductRow({ product, openProduct, addQuick, isStoreOpen }) {
  const hasPresetTags = Boolean(productCardTags[product.name]);
  const descriptionItems = productCardTags[product.name] || product.description
    .split(",")
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean);
  const visibleIngredients = hasPresetTags ? descriptionItems : descriptionItems.slice(0, 3);
  const remainingIngredients = hasPresetTags ? 0 : descriptionItems.length - visibleIngredients.length;

  return (
    <article className="product-card" onClick={() => openProduct(product.id)} style={{ cursor: "pointer" }}>
      <img src={product.image} alt={product.name} width="960" height="960" loading="lazy" decoding="async" />
      <div>
        <h3>{product.name}</h3>
        <ul className="product-ingredients" aria-label="Principais ingredientes">
          {visibleIngredients.map((item) => <li key={item}>{item}</li>)}
          {remainingIngredients > 0 && <li className="more-ingredients">+{remainingIngredients} ingredientes</li>}
        </ul>
      </div>
      <strong>{money.format(product.price)}</strong>
      {isStoreOpen && (
        <button className="round-btn" onClick={(event) => { event.stopPropagation(); addQuick(product.id); }} aria-label={`Adicionar ${product.name} ao carrinho`}>+</button>
      )}
    </article>
  );
}

function WhyCard() {
  return (
    <aside className="why-card">
      <h3>Por que escolher <span>Doutor Burger?</span></h3>
      <div className="why-item"><span className="why-icon"><Icon name="leaf" /></span><div><strong>Ingredientes selecionados</strong><p>Escolhemos bons ingredientes para garantir sabor e qualidade.</p></div></div>
      <div className="why-item"><span className="why-icon"><Icon name="heart" /></span><div><strong>Feito com carinho</strong><p>Cada pedido e preparado com atencao do inicio ao fim.</p></div></div>
      <div className="why-item"><span className="why-icon"><Icon name="bike" /></span><div><strong>Entrega rapida</strong><p>Seu pedido chega quentinho para voce aproveitar mais.</p></div></div>
    </aside>
  );
}

function Combos({ products, openProduct, isStoreOpen }) {
  if (!products.length) return null;
  const labels = ["Mais pedido", "Combo especial", "Pronto para pedir"];
  return (
    <section className="section-block combo-section" id="combos">
      <div className="section-head compact">
        <div>
          <span className="eyebrow">Combos prontos</span>
          <h2>Escolha um combo e peca mais rapido</h2>
          <p>Combos completos com burger, batata e bebida para matar sua fome com praticidade e sabor.</p>
        </div>
      </div>
      <div className="combo-grid">
        {products.slice(0, 3).map((product, index) => {
          return (
            <article className="combo-card" key={product.id} onClick={() => openProduct(product.id)} style={{ cursor: "pointer" }}>
              <img src={product.image} alt={product.name} width="960" height="960" loading="lazy" decoding="async" />
              <span>{labels[index]}</span>
              <h3>{product.name}</h3>
              <ul className="combo-includes">
                {product.description.split(",").slice(0, 3).map((item) => <li key={item}>{item.trim()}</li>)}
              </ul>
              <strong>{money.format(product.price)}</strong>
              {isStoreOpen && <button className="combo-cta" onClick={(event) => { event.stopPropagation(); openProduct(product.id); }}>Ver combo</button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CartPanel({ cart, subtotal, total, receiveMode, setReceiveMode, updateQty, onBack, onFinish, storeSettings }) {
  return (
    <aside className="cart-panel is-open" id="cartPanel" aria-label="Carrinho">
      <div className="panel-card">
        <div className="panel-head">
          <div><span className="eyebrow">Seu pedido</span><h2>Seu carrinho</h2><p>Confira seus itens, ajuste as quantidades e finalize seu pedido.</p></div>
          <button className="outline-btn" onClick={onBack} type="button">Voltar ao cardapio</button>
        </div>
        <div className="cart-items">
          {cart.length ? cart.map((item) => (
            <article className="cart-item" key={item.key}>
              <img src={item.image} alt={item.name} width="960" height="960" loading="lazy" decoding="async" />
              <div>
                <strong>{item.name}</strong>
                <p>{item.notes || "Sem observacoes"}</p>
                <div className="cart-line">
                  <strong>{money.format(item.price * item.qty)}</strong>
                  <div className="stepper"><button onClick={() => updateQty(item.key, -1)}>-</button><strong>{item.qty}</strong><button onClick={() => updateQty(item.key, 1)}>+</button></div>
                </div>
              </div>
            </article>
          )) : <div className="notice">Seu carrinho esta vazio. Escolha um burger para comecar.</div>}
        </div>
        <div className="summary">
          <h3>Resumo do pedido</h3>
          <div><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
          {receiveMode === "Entrega" && (
            <div><span>Taxa de entrega</span><strong>{money.format(storeSettings.deliveryFee)}</strong></div>
          )}
          <div className="total"><span>Total</span><strong>{money.format(total)}</strong></div>
        </div>
        {cart.length > 0 && (
          <div className="cart-checkout" style={{ borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
            <button className="primary-btn full" onClick={onFinish}>Avançar para Entrega</button>
          </div>
        )}
      </div>
    </aside>
  );
}

function ProductDetail({
  product,
  qty,
  setQty,
  extras,
  toggleExtra,
  meat,
  setMeat,
  combo,
  setCombo,
  note,
  setNote,
  unitPrice,
  onBack,
  onAdd,
  removedIngredients,
  setRemovedIngredients,
}) {
  const extraOptions = [
    ["Bacon extra", 4],
    ["Cheddar extra", 3],
    ["Ovo", 3],
  ];

  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (product.category === "Bebidas") {
      return [product.image];
    }
    if (product.id === "doutor") {
      return [
        "/assets/new-direction/doutor-burger.webp",
        "/assets/new-direction/combo-doutor.webp",
        "/assets/new-direction/smash-cheddar.webp",
      ];
    } else if (product.id === "smash") {
      return [
        "/assets/new-direction/smash-cheddar.webp",
        "/assets/new-direction/combo-doutor.webp",
        "/assets/new-direction/doutor-burger.webp",
      ];
    } else {
      return [
        product.image,
        "/assets/new-direction/combo-doutor.webp",
        "/assets/new-direction/doutor-burger.webp",
      ];
    }
  }, [product]);

  const [activeImgIndex, setActiveImgIndex] = useState(0);

  useEffect(() => {
    setActiveImgIndex(0);
  }, [product]);

  const nextImage = (e) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const toggleRemovedIngredient = (name) => {
    setRemovedIngredients((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };
  const isBurger = product?.category === "Burgers";
  const extrasTotal = extras.reduce((sum, item) => sum + item.price, 0);
  const comboPrice = isBurger && combo ? 11.9 : 0;

  return (
    <div className="drawer is-open" id="productDrawer" aria-hidden="false">
      <section className={`drawer-card product-detail ${product?.category === "Bebidas" ? "drink-detail" : ""}`} role="dialog" aria-modal="true" aria-label="Detalhe do produto">
        <nav className="detail-breadcrumb" aria-label="Caminho">
          <button className="back-link" onClick={onBack} type="button">←</button>
          <span>Inicio</span>
          <span>Cardapio</span>
          <strong>{product ? product.name : ""}</strong>
        </nav>
        {product && (
          <>
            <div className="detail-gallery">
              <button className="detail-exit-btn" onClick={onBack} type="button">← Voltar ao cardapio</button>
              {galleryImages.length > 1 && (
                <>
                  <button className="gallery-nav-btn prev" onClick={prevImage} aria-label="Anterior">&lt;</button>
                  <button className="gallery-nav-btn next" onClick={nextImage} aria-label="Próximo">&gt;</button>
                </>
              )}
              <img className="detail-image" src={galleryImages[activeImgIndex] || product.image} alt={product.name} width="960" height="960" decoding="async" fetchPriority="high" />
              <div className="detail-thumbs">
                {galleryImages.map((img, idx) => (
                  <img
                    key={idx}
                    className={idx === activeImgIndex ? "is-active" : ""}
                    src={img}
                    alt={`${product.name} thumbnail ${idx}`}
                    onClick={() => setActiveImgIndex(idx)}
                  />
                ))}
              </div>
            </div>
            <div className="detail-copy">
              <div className="detail-head">
                <div className="detail-badges"><span>Mais pedido <Icon name="flame" /></span><span><Icon name="star" /> 4,8 (2.340)</span></div>
                <div className="title-row"><div><h2>{product.name}</h2><p>{product.description}</p></div><strong>{money.format(product.price)}</strong></div>
              </div>

              <div className="detail-section removal-section">
                <div className="detail-section-title">
                  <h3>Remover ingredientes</h3>
                  <p>Marque apenas o que você quer tirar do pedido.</p>
                </div>
                <div className="option-grid compact-options">
                  {["Cebola", "Tomate", "Picles"].map((ing) => {
                    const isRemoved = removedIngredients.includes(ing);
                    return (
                      <label key={ing} className={isRemoved ? "is-removed" : ""}>
                        <input type="checkbox" checked={isRemoved} onChange={() => toggleRemovedIngredient(ing)} />
                        <span>{ing}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="detail-section extras-section">
                <div className="detail-section-title">
                  <h3>Adicionais</h3>
                  <p>Complete com extras selecionados.</p>
                </div>
                <div className="option-grid extras-grid">
                  {extraOptions.map(([name, price]) => {
                    const isSelected = extras.some((item) => item.name === name);
                    return (
                      <label className={`check-row ${isSelected ? "is-selected" : ""}`} key={name}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleExtra(name, price)} />
                        <span>{name.replace(" extra", "")}</span>
                        <strong>+ {money.format(price)}</strong>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="detail-section meat-choice">
                <div className="detail-section-title">
                  <h3>Ponto da carne</h3>
                  <p>Escolha como prefere o burger.</p>
                </div>
                <div className="meat-options">
                  {["Ao ponto", "Bem passado"].map((mode) => {
                    const isSelected = meat === mode;
                    return (
                      <label key={mode} className={isSelected ? "is-selected" : ""}>
                        <input name="meat" type="radio" checked={isSelected} onChange={() => setMeat(mode)} />
                        {mode}
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className={`combo-row detail-combo-card ${combo ? "is-selected" : ""}`}>
                <input type="checkbox" checked={combo} onChange={(event) => setCombo(event.target.checked)} />
                <span><strong>Adicionar batata + bebida</strong><small>Refrigerante lata 350ml</small></span>
                <strong>+ R$ 11,90</strong>
              </label>
              <label className="note-box"><span>Observações</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder="Ex.: sem cebola, molho à parte..." /></label>
              <aside className="detail-order-summary">
                <h3>Resumo do pedido</h3>
                <div><span>Subtotal</span><strong>{money.format(product.price)}</strong></div>
                <div><span>Extras</span><strong>{money.format(extrasTotal)}</strong></div>
                <div><span>Combo</span><strong>{money.format(comboPrice)}</strong></div>
                <div className="detail-order-total"><span>Total</span><strong>{money.format(unitPrice * qty)}</strong></div>
                <div className="detail-summary-qty">
                  <span>Quantidade</span>
                  <div className="stepper"><button onClick={() => setQty(Math.max(1, qty - 1))}>-</button><strong>{qty}</strong><button onClick={() => setQty(qty + 1)}>+</button></div>
                </div>
                <button className="primary-btn full" onClick={onAdd}><Icon name="cart" /> Adicionar ao carrinho</button>
                <small>Compra segura e pedido preparado com carinho.</small>
              </aside>
              <div className="purchase-bar">
                <div className="qty-row"><div className="stepper"><button aria-label="Diminuir quantidade" onClick={() => setQty(Math.max(1, qty - 1))}>-</button><strong>{qty}</strong><button aria-label="Aumentar quantidade" onClick={() => setQty(qty + 1)}>+</button></div></div>
                <button className="primary-btn full" onClick={onAdd}><Icon name="cart" /> Adicionar ao carrinho - {money.format(unitPrice * qty)}</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Icon({ name }) {
  const icons = {
    pin: "M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    cart: "M6 6h15l-2 8H8L6 3H3m6 15a1.5 1.5 0 1 0 0 .1m9-.1a1.5 1.5 0 1 0 0 .1",
    store: "M4 10h16l-1-5H5l-1 5Zm2 0v10h12V10M8 14h4v6",
    burger: "M4 11c1-4 15-4 16 0M5 14h14M6 17h12M5 20h14",
    combo: "M5 4h6l1 8H6L5 4Zm10 3h5l-1 13h-3L15 7ZM4 16h8v4H4v-4Z",
    fries: "M7 8l1 12h8l1-12M8 8l1-5m3 5V3m3 5 1-5",
    drink: "M7 4h10l-1 17H8L7 4Zm2 4h6",
    cake: "M4 13h16v8H4v-8Zm2 0V9h12v4M8 9V6m4 3V6m4 3V6",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v5l4 2",
    bike: "M5 18a3 3 0 1 0 0-.1m14 .1a3 3 0 1 0 0-.1M5 18l4-8h4l3 8M9 10l3 8h4m-4-8h4",
    bag: "M6 8h12l-1 13H7L6 8Zm4 0a2 2 0 0 1 4 0",
    coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v10m3-7.5c0-1-1-1.5-3-1.5s-3 .6-3 1.8c0 3.2 6 1 6 4.2 0 1.2-1 2-3 2s-3-.6-3-1.6",
    leaf: "M20 4C11 4 5 9 5 17c0 2 1 3 2 4 7-2 11-7 13-17ZM7 21c1-6 5-10 11-13",
    heart: "M20 8c0 6-8 11-8 11S4 14 4 8a4 4 0 0 1 7-2 4 4 0 0 1 9 2Z",
    flame: "M12 22c4 0 7-3 7-7 0-3-2-5-4-7 .2 2-.8 3-2 4 .2-4-2-7-5-9 .5 4-3 6-3 11 0 5 3 8 7 8Z",
    star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  };
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={icons[name] ?? icons.burger} />
    </svg>
  );
}

function FlowDrawer({
  flow,
  total,
  receiveMode,
  setReceiveMode,
  onClose,
  setFlow,
  checkoutName,
  setCheckoutName,
  checkoutPhone,
  setCheckoutPhone,
  checkoutAddress,
  setCheckoutAddress,
  checkoutComplement,
  setCheckoutComplement,
  checkoutPayment,
  setCheckoutPayment,
  checkoutChange,
  setCheckoutChange,
  onSubmit,
  currentOrder,
  storeSettings,
  cart,
  checkoutError,
  setCheckoutError,
}) {
  const [checkoutStep, setCheckoutStep] = React.useState(1);

  React.useEffect(() => {
    if (flow === "delivery") {
      setCheckoutStep(1);
    } else if (flow === "checkout") {
      setCheckoutStep(2);
    }
  }, [flow]);

  if (!flow) return null;

  const showProgress = flow === "delivery" || flow === "checkout";

  return (
    <div className="drawer is-open" id="flowDrawer" aria-hidden="false">
      <div className="drawer-backdrop" onClick={onClose} />
      <section className="drawer-card flow-card" role="dialog" aria-modal="true" style={{ width: "min(520px, calc(100vw - 20px))", padding: "24px" }}>
        <button className="icon-btn close-btn" onClick={onClose} aria-label="Fechar" style={{ top: "16px", right: "16px", zIndex: 10 }}>x</button>

        {/* Progress indicator */}
        {showProgress && (
          <div className="checkout-progress" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", marginTop: "10px", position: "relative" }}>
            <div style={{ position: "absolute", top: "18px", left: "10%", right: "10%", height: "2px", background: "#e9ecef", zIndex: 1 }} />
            <div style={{ position: "absolute", top: "18px", left: "10%", width: `${(checkoutStep - 1) * 40}%`, height: "2px", background: "var(--accent)", zIndex: 2, transition: "width 0.3s ease" }} />
            
            <div style={{ zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setCheckoutStep(1)}
                disabled={checkoutStep < 1}
                style={{ cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", background: checkoutStep >= 1 ? "var(--accent)" : "#fff", border: `2px solid ${checkoutStep >= 1 ? "var(--accent)" : "#dee2e6"}`, color: checkoutStep >= 1 ? "#fff" : "#6c757d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", transition: "all 0.3s ease" }}
              >
                {checkoutStep > 1 ? "✓" : "1"}
              </button>
              <span style={{ fontSize: "10px", fontWeight: "800", marginTop: "6px", color: checkoutStep >= 1 ? "var(--accent-strong)" : "#6c757d" }}>Recebimento</span>
            </div>

            <div style={{ zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  if (receiveMode === "Entrega" && !checkoutAddress.trim()) return;
                  setCheckoutStep(2);
                }}
                disabled={checkoutStep < 2 && (receiveMode === "Entrega" && !checkoutAddress.trim())}
                style={{ cursor: checkoutStep >= 2 || (receiveMode === "Entrega" && checkoutAddress.trim()) ? "pointer" : "default", width: "36px", height: "36px", borderRadius: "50%", background: checkoutStep >= 2 ? "var(--accent)" : "#fff", border: `2px solid ${checkoutStep >= 2 ? "var(--accent)" : "#dee2e6"}`, color: checkoutStep >= 2 ? "#fff" : "#6c757d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", transition: "all 0.3s ease" }}
              >
                {checkoutStep > 2 ? "✓" : "2"}
              </button>
              <span style={{ fontSize: "10px", fontWeight: "800", marginTop: "6px", color: checkoutStep >= 2 ? "var(--accent-strong)" : "#6c757d" }}>Pagamento</span>
            </div>

            <div style={{ zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                type="button"
                disabled={true}
                style={{ width: "36px", height: "36px", borderRadius: "50%", background: checkoutStep >= 3 ? "var(--accent)" : "#fff", border: `2px solid ${checkoutStep >= 3 ? "var(--accent)" : "#dee2e6"}`, color: checkoutStep >= 3 ? "#fff" : "#6c757d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", transition: "all 0.3s ease" }}
              >
                3
              </button>
              <span style={{ fontSize: "10px", fontWeight: "800", marginTop: "6px", color: checkoutStep >= 3 ? "var(--accent-strong)" : "#6c757d" }}>Confirmação</span>
            </div>
          </div>
        )}

        {/* STEP 1: RECEBIMENTO */}
        {showProgress && checkoutStep === 1 && (
          <div className="flow-screen is-active">
            <span className="eyebrow" style={{ color: "var(--accent-strong)", fontWeight: "800", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>Passo 1 de 3</span>
            <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0 20px" }}>Como deseja receber o seu pedido?</h2>
            
            <div className="choice-list checkout-choice-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "20px 0" }}>
              <button 
                type="button"
                className={`choice ${receiveMode === "Entrega" ? "is-active" : ""}`} 
                onClick={() => { setReceiveMode("Entrega"); setCheckoutError(""); }}
                style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.2s ease" }}
              >
                <span style={{ fontSize: "28px" }}>🛵</span>
                <strong style={{ fontSize: "15px", fontWeight: "800" }}>Delivery</strong>
                <span style={{ fontSize: "11px", color: "#6c757d", textAlign: "center" }}>Entregamos no seu endereço</span>
              </button>
              <button 
                type="button"
                className={`choice ${receiveMode === "Retirada" ? "is-active" : ""}`} 
                onClick={() => { setReceiveMode("Retirada"); setCheckoutError(""); }}
                style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.2s ease" }}
              >
                <span style={{ fontSize: "28px" }}>🛍️</span>
                <strong style={{ fontSize: "15px", fontWeight: "800" }}>Retirada</strong>
                <span style={{ fontSize: "11px", color: "#6c757d", textAlign: "center" }}>Você retira no balcão (Grátis)</span>
              </button>
            </div>

            {receiveMode === "Entrega" && (
              <div className="delivery-fields" style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
                <label className="field" style={{ margin: 0 }}>
                  <span style={{ fontWeight: "800", fontSize: "12px", textTransform: "uppercase", color: "#495057", display: "flex", alignItems: "center", gap: "6px" }}>
                    📍 Endereço de entrega
                  </span>
                  <input 
                    value={checkoutAddress} 
                    onChange={(e) => { setCheckoutAddress(e.target.value); if (setCheckoutError) setCheckoutError(""); }} 
                    placeholder="Rua, número, bairro" 
                    style={{ width: "100%", height: "52px", borderRadius: "12px", border: "1px solid var(--line)", padding: "0 16px", fontSize: "14px" }}
                  />
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span style={{ fontWeight: "800", fontSize: "12px", textTransform: "uppercase", color: "#495057" }}>
                    🏢 Complemento / Referência (Apto, bloco, etc.)
                  </span>
                  <input 
                    value={checkoutComplement} 
                    onChange={(e) => setCheckoutComplement(e.target.value)} 
                    placeholder="Ex: Apto 101, bloco B, próximo ao mercado" 
                    style={{ width: "100%", height: "52px", borderRadius: "12px", border: "1px solid var(--line)", padding: "0 16px", fontSize: "14px" }}
                  />
                </label>
              </div>
            )}

            {checkoutError && (
              <div style={{ color: "#d93838", background: "#fdf3f3", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", marginTop: "14px", border: "1px solid #fbc" }}>
                ⚠️ {checkoutError}
              </div>
            )}

            <button 
              type="button"
              className="primary-btn full" 
              onClick={() => {
                if (receiveMode === "Entrega" && !checkoutAddress.trim()) {
                  setCheckoutError("Por favor, preencha o seu endereço de entrega.");
                  return;
                }
                setCheckoutError("");
                setCheckoutStep(2);
              }}
              style={{ marginTop: "24px", height: "52px", borderRadius: "12px", fontWeight: "bold" }}
            >
              Avançar para Pagamento
            </button>
          </div>
        )}

        {/* STEP 2: FORMA DE PAGAMENTO */}
        {showProgress && checkoutStep === 2 && (
          <div className="flow-screen is-active">
            <span className="eyebrow" style={{ color: "var(--accent-strong)", fontWeight: "800", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>Passo 2 de 3</span>
            <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0 20px" }}>Selecione a forma de pagamento</h2>

            <div className="payment-grid checkout-choice-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "20px 0" }}>
              {[
                { id: "Pix", label: "Pix", icon: "⚡", desc: "Aprovação instantânea" },
                { id: "Cartão de Crédito", label: "Crédito", icon: "💳", desc: "Pague pelo app/maquininha" },
                { id: "Cartão de Débito", label: "Débito", icon: "💳", desc: "Pague na entrega" },
                { id: "Dinheiro", label: "Dinheiro", icon: "💵", desc: "Pague na entrega" },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`choice ${checkoutPayment === method.id ? "is-active" : ""}`}
                  onClick={() => setCheckoutPayment(method.id)}
                  style={{ padding: "18px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all 0.2s ease", textAlign: "center" }}
                >
                  <span style={{ fontSize: "24px" }}>{method.icon}</span>
                  <strong style={{ fontSize: "14px", fontWeight: "800" }}>{method.label}</strong>
                  <span style={{ fontSize: "10px", color: "#6c757d", textAlign: "center" }}>{method.desc}</span>
                </button>
              ))}
            </div>

            {checkoutPayment === "Dinheiro" && (
              <div style={{ animation: "fadeIn 0.3s ease", marginTop: "10px" }}>
                <label className="field" style={{ margin: 0 }}>
                  <span style={{ fontWeight: "800", fontSize: "12px", textTransform: "uppercase", color: "#495057" }}>
                    💵 Precisa de troco para quanto?
                  </span>
                  <input 
                    type="text"
                    value={checkoutChange}
                    onChange={(e) => setCheckoutChange(e.target.value)}
                    placeholder="Ex: R$ 50 ou R$ 100 (deixe em branco se não precisar)" 
                    style={{ width: "100%", height: "52px", borderRadius: "12px", border: "1px solid var(--line)", padding: "0 16px", fontSize: "14px" }}
                  />
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button"
                className="outline-btn" 
                onClick={() => setCheckoutStep(1)}
                style={{ flex: 1, height: "52px", borderRadius: "12px", fontWeight: "bold" }}
              >
                Voltar
              </button>
              <button 
                type="button"
                className="primary-btn" 
                onClick={() => setCheckoutStep(3)}
                style={{ flex: 1.5, height: "52px", borderRadius: "12px", fontWeight: "bold" }}
              >
                Avançar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRMAÇÃO (NOME E WHATSAPP) */}
        {showProgress && checkoutStep === 3 && (
          <div className="flow-screen is-active">
            <span className="eyebrow" style={{ color: "var(--accent-strong)", fontWeight: "800", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>Passo 3 de 3</span>
            <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0 20px" }}>Confirmação dos seus dados</h2>

            {/* Resumo do Pedido / Checkout info */}
            <div className="checkout-summary" style={{ background: "#fdfaf5", padding: "16px", borderRadius: "16px", marginBottom: "20px", border: "1px solid #ead8bf" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "var(--accent-strong)", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resumo da Compra</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#495057" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Itens ({cart.reduce((sum, i) => sum + i.qty, 0)})</span>
                  <strong>{money.format(cart.reduce((sum, i) => sum + i.price * i.qty, 0))}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tipo de Recebimento</span>
                  <strong>{receiveMode}</strong>
                </div>
                {receiveMode === "Entrega" && (
                  <div style={{ fontSize: "12px", color: "#6c757d", borderLeft: "2px solid var(--accent)", paddingLeft: "8px", margin: "2px 0" }}>
                    <strong>Endereço:</strong> {checkoutAddress} {checkoutComplement ? `(${checkoutComplement})` : ""}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Forma de Pagamento</span>
                  <strong>{checkoutPayment === "Dinheiro" && checkoutChange.trim() ? `Dinheiro (Troco para ${checkoutChange})` : checkoutPayment}</strong>
                </div>
                <hr style={{ margin: "8px 0", borderStyle: "dashed", borderColor: "#ead8bf" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "900", color: "#1f2026" }}>
                  <span>Total</span>
                  <strong>{money.format(total)}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontWeight: "800", fontSize: "12px", textTransform: "uppercase", color: "#495057", display: "flex", alignItems: "center", gap: "6px" }}>
                  👤 Seu Nome Completo
                </span>
                <input 
                  value={checkoutName} 
                  onChange={(e) => { setCheckoutName(e.target.value); if (setCheckoutError) setCheckoutError(""); }} 
                  placeholder="Digite seu nome para o pedido"
                  style={{ width: "100%", height: "52px", borderRadius: "12px", border: "1px solid var(--line)", padding: "0 16px", fontSize: "14px" }}
                />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontWeight: "800", fontSize: "12px", textTransform: "uppercase", color: "#495057", display: "flex", alignItems: "center", gap: "6px" }}>
                  💬 Seu WhatsApp (com DDD)
                </span>
                <input 
                  value={checkoutPhone} 
                  onChange={(e) => { setCheckoutPhone(e.target.value); if (setCheckoutError) setCheckoutError(""); }} 
                  placeholder="Ex: (83) 98765-4321"
                  style={{ width: "100%", height: "52px", borderRadius: "12px", border: "1px solid var(--line)", padding: "0 16px", fontSize: "14px" }}
                />
              </label>
            </div>

            {checkoutError && (
              <div style={{ color: "#d93838", background: "#fdf3f3", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", marginTop: "14px", border: "1px solid #fbc" }}>
                ⚠️ {checkoutError}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button 
                type="button"
                className="outline-btn" 
                onClick={() => setCheckoutStep(2)}
                style={{ flex: 1, height: "52px", borderRadius: "12px", fontWeight: "bold" }}
              >
                Voltar
              </button>
              <button 
                type="button"
                className="primary-btn" 
                onClick={onSubmit}
                style={{ flex: 1.5, height: "52px", borderRadius: "12px", fontWeight: "bold", background: "linear-gradient(135deg, #34792f, #285e24)", border: "none", color: "#fff" }}
              >
                Finalizar e Confirmar
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS SCREEN */}
        {flow === "success" && currentOrder && (
          <div className="flow-screen is-active" style={{ textAlign: "center" }}>
            <div className="success-icon" style={{ background: "var(--green)", color: "#fff", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 16px" }}>✓</div>
            <h2>Pedido enviado!</h2>
            <p style={{ color: "#6c757d", fontSize: "14px", marginBottom: "20px" }}>Seu pedido foi recebido e já está no painel da loja.</p>
            <div className="order-number" style={{ background: "var(--bg)", padding: "14px", borderRadius: "14px", margin: "14px 0", fontWeight: "bold" }}>
              Pedido <strong>{currentOrder.id}</strong>
            </div>
            <button className="primary-btn full" onClick={() => setFlow("track")} style={{ height: "52px", borderRadius: "12px", fontWeight: "bold" }}>Acompanhar pedido</button>
          </div>
        )}

        {/* TRACK ORDER TIMELINE */}
        {flow === "track" && currentOrder && (
          <div className="flow-screen is-active">
            <span className="eyebrow" style={{ color: "var(--accent-strong)", fontWeight: "800", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>Pedido {currentOrder.id}</span>
            <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "4px 0 20px" }}>Acompanhar status</h2>
            <ol className="timeline" style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
              {["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Entregue"].map((step, index) => {
                const isDone = ["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Entregue"].indexOf(currentOrder.status) >= index;
                const isCurrent = currentOrder.status === step;
                return (
                  <li key={step} className={isCurrent ? "current" : isDone ? "done" : ""} style={{ display: "flex", gap: "16px", marginBottom: "16px", position: "relative" }}>
                    <span className="dot" style={{ width: "28px", height: "28px", borderRadius: "50%", background: isCurrent ? "var(--accent)" : isDone ? "#34792f" : "#e9ecef", color: isCurrent || isDone ? "#fff" : "#6c757d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px", zIndex: 2 }}>{index + 1}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "14px", color: isCurrent ? "var(--accent-strong)" : isDone ? "#1f2026" : "#868e96", fontWeight: "800" }}>{step}</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: isCurrent ? "#495057" : "#6c757d" }}>{isCurrent ? "Esta etapa está ocorrendo agora." : isDone ? "Etapa concluída." : "Aguardando etapas anteriores."}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button className="outline-btn full" onClick={onClose} style={{ marginTop: "20px", height: "52px", borderRadius: "12px", fontWeight: "bold" }}>Fechar</button>
          </div>
        )}
      </section>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="brand"><span className="brand-mark"><img src="/assets/brand/logo.png" alt="Doutor Burger Logo" /></span><span><strong>Doutor Burger</strong><small>Cura sua fome</small></span></div>
      <nav><a href="#inicio">Sobre nos</a><a href="https://wa.me/5583987654321" target="_blank" rel="noreferrer">WhatsApp</a><a href="#cardapio">Duvidas frequentes</a><a href="#ofertas">Promocoes</a></nav>
      <p>Pix - Cartao - Dinheiro</p>
    </footer>
  );
}

function BottomNav({ count, onCart, onTrack }) {
  return (
    <nav className="bottom-nav">
      <a href="#inicio" className="is-active">Inicio</a>
      <a href="#cardapio">Cardapio</a>
      <a href="#ofertas">Ofertas</a>
      <button onClick={onCart}>Carrinho <span id="cartBadge">{count}</span></button>
      <button onClick={onTrack}>Acompanhar</button>
    </nav>
  );
}

import React, { useEffect, useMemo, useState } from "react";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
    id: "doutor",
    category: "Burgers",
    name: "Doutor Burger",
    description: "Pao brioche, blend 180g, cheddar, bacon, alface, tomate e molho especial.",
    price: 34.9,
    image: "/assets/new-direction/doutor-burger.webp",
    active: true,
  },
  {
    id: "smash",
    category: "Burgers",
    name: "Smash Cheddar",
    description: "Dois smash burgers, cheddar cremoso, picles e cebola.",
    price: 28.9,
    image: "/assets/new-direction/smash-cheddar.webp",
    active: true,
  },
  {
    id: "combo-doutor",
    category: "Combos",
    name: "Combo Doutor",
    description: "Doutor Burger, batata crocante e refrigerante gelado.",
    price: 49.9,
    image: "/assets/new-direction/chicken-crispy.webp",
    active: true,
  },
];

const favoriteIds = ["doutor", "combo-doutor", "smash"];
const comboIds = ["combo-doutor"];

const mockOrders = [
  {
    id: "#5427",
    name: "Lucas Fernandes",
    phone: "(83) 98765-4321",
    address: "Rua Manoel Lopes de Carvalho, 123 - Auto do Mateus, Joao Pessoa - PB",
    complement: "Apto 302",
    payment: "Pix",
    items: [{ name: "Doutor Burger Combo", qty: 1, price: 46.8, notes: "Bem passado + Bacon extra" }],
    subtotal: 46.8,
    deliveryFee: 6.9,
    total: 53.7,
    status: "Em preparo",
    time: "09:48",
    origin: "Cardápio",
  },
];

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

  const [orders, setOrders] = useState(() => {
    const local = localStorage.getItem("doutor_orders");
    return local ? JSON.parse(local) : mockOrders;
  });

  const [storeSettings, setStoreSettings] = useState(() => {
    const local = localStorage.getItem("doutor_settings");
    return local ? JSON.parse(local) : {
      name: "Doutor Burger",
      phone: "(83) 98765-4321",
      minOrder: 20,
      deliveryTime: "35-45 min",
      deliveryFee: 6.9,
      address: "Auto do Mateus, Joao Pessoa - PB",
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
  const [meat, setMeat] = useState("Ao ponto");
  const [combo, setCombo] = useState(true);
  const [note, setNote] = useState("");
  const [receiveMode, setReceiveMode] = useState("Entrega");
  const [flow, setFlow] = useState(null);
  const [currentClientOrder, setCurrentClientOrder] = useState(null);

  // Client Checkout Fields
  const [checkoutName, setCheckoutName] = useState("Lucas Fernandes");
  const [checkoutPhone, setCheckoutPhone] = useState("(83) 98765-4321");
  const [checkoutAddress, setCheckoutAddress] = useState("Rua Manoel Lopes de Carvalho, 123 - Auto do Mateus");
  const [checkoutComplement, setCheckoutComplement] = useState("");
  const [checkoutPayment, setCheckoutPayment] = useState("Pix");

  // Admin Dashboard State
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState(() => orders[0]?.id || "");
  const [loginEmail, setLoginEmail] = useState("admin@doutorburger.com.br");
  const [loginPassword, setLoginPassword] = useState("123456");
  const [loginError, setLoginError] = useState("");

  // Product Add/Edit Form State
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormName, setProductFormName] = useState("");
  const [productFormCategory, setProductFormCategory] = useState("Burgers");
  const [productFormPrice, setProductFormPrice] = useState("");
  const [productFormDesc, setProductFormDesc] = useState("");
  const [productFormActive, setProductFormActive] = useState(true);

  // Cash Closing Modal
  const [showCashClose, setShowCashClose] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem("doutor_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("doutor_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("doutor_settings", JSON.stringify(storeSettings));
  }, [storeSettings]);

  // Sync orders
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const latestOrdersRaw = localStorage.getItem("doutor_orders");
      if (latestOrdersRaw) {
        const latestOrders = JSON.parse(latestOrdersRaw);
        if (latestOrders.length !== orders.length) {
          setOrders(latestOrders);
          playNotificationSound("client");
        }
      }
    }, 2500);
    return () => clearInterval(syncInterval);
  }, [orders]);

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
    if (!isStoreOpen) return;
    const product = products.find((item) => item.id === id) ?? products[0];
    setSelectedId(product.id);
    setDetailQty(1);
    setExtras(product.id === "doutor" ? [{ name: "Bacon extra", price: 4 }] : []);
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
    setCart((items) => [...items, { key: crypto.randomUUID(), ...product, qty: 1, notes: "Adicionado rapido" }]);
    playNotificationSound("client");
  }

  function addSelectedProduct() {
    setCart((items) => [
      ...items,
      {
        key: crypto.randomUUID(),
        id: selectedProduct.id,
        name: combo ? `${selectedProduct.name} Combo` : selectedProduct.name,
        image: selectedProduct.image,
        price: detailUnitPrice,
        qty: detailQty,
        notes: [meat, ...extras.map((item) => item.name), note.trim()].filter(Boolean).join(" + "),
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
  function submitClientOrder() {
    const orderId = "#" + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: orderId,
      name: checkoutName,
      phone: checkoutPhone,
      address: receiveMode === "Entrega" ? checkoutAddress : "Retirada no Balcão",
      complement: checkoutComplement,
      payment: checkoutPayment,
      items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price, notes: item.notes })),
      subtotal,
      deliveryFee: currentFee,
      total,
      status: "Recebido",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      origin: "Cardápio",
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    setCurrentClientOrder(newOrder);
    setCart([]);
    setFlow("success");
    playNotificationSound("client");
  }

  // Admin Actions
  function handleAdminLogin(e) {
    e.preventDefault();
    if (loginEmail === "admin@doutorburger.com.br" && loginPassword === "123456") {
      setPage("admin");
      setLoginError("");
    } else {
      setLoginError("E-mail ou senha incorretos.");
    }
  }

  function updateOrderStatus(id, newStatus) {
    const updated = orders.map(order => order.id === id ? { ...order, status: newStatus } : order);
    setOrders(updated);
    if (currentClientOrder && currentClientOrder.id === id) {
      setCurrentClientOrder(prev => ({ ...prev, status: newStatus }));
    }
  }

  function cancelOrder(id) {
    updateOrderStatus(id, "Cancelado");
  }

  function simulateIFoodOrder() {
    const ifoodBurgers = ["Doutor Burger Combo", "Smash Cheddar Duplo"];
    const names = ["Gabriel Silva", "Jéssica Carvalho"];
    const chosenBurger = ifoodBurgers[Math.floor(Math.random() * ifoodBurgers.length)];
    const items = [{ name: chosenBurger, qty: 1, price: 34.90, notes: "Sem cebola" }];

    const newIFoodOrder = {
      id: "#IFD" + Math.floor(1000 + Math.random() * 9000),
      name: names[Math.floor(Math.random() * names.length)],
      phone: "(83) 9" + Math.floor(10000000 + Math.random() * 90000000),
      address: "Av. Cabo Branco, 2400 - Cabo Branco",
      complement: "Apto 101",
      payment: "Pago pelo App (iFood)",
      items,
      subtotal: 34.90,
      deliveryFee: 6.90,
      total: 41.80,
      status: "Recebido",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      origin: "iFood",
    };

    setOrders(prev => [newIFoodOrder, ...prev]);
    setSelectedAdminOrderId(newIFoodOrder.id);
    playNotificationSound("ifood");
  }

  // Edit or Add Product Form Submission
  function openAddProduct() {
    setEditingProduct({ id: "new" });
    setProductFormName("");
    setProductFormCategory("Burgers");
    setProductFormPrice("");
    setProductFormDesc("");
    setProductFormActive(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductFormName(product.name);
    setProductFormCategory(product.category);
    setProductFormPrice(product.price.toString());
    setProductFormDesc(product.description);
    setProductFormActive(product.active !== false);
  }

  function saveProductForm(e) {
    e.preventDefault();
    const parsedPrice = parseFloat(productFormPrice) || 0;
    if (editingProduct.id === "new") {
      const newProduct = {
        id: "p_" + Date.now(),
        name: productFormName,
        category: productFormCategory,
        price: parsedPrice,
        description: productFormDesc,
        image: "/assets/new-direction/doutor-burger.webp",
        active: productFormActive,
      };
      setProducts(prev => [...prev, newProduct]);
    } else {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        name: productFormName,
        category: productFormCategory,
        price: parsedPrice,
        description: productFormDesc,
        active: productFormActive,
      } : p));
    }
    setEditingProduct(null);
  }

  function deleteProduct(productId) {
    if (confirm("Tem certeza que deseja remover este produto?")) {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
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

  // RENDER SELECTION BY PAGE
  if (page === "login") {
    return (
      <main className="admin-login">
        <section className="login-card">
          <span className="brand-mark">DB</span>
          <h1>Entrar como loja</h1>
          <p>Acesse pedidos, cardapio, horarios e mensagens do painel digital.</p>
          {loginError && <p style={{ color: "#ff8888", fontWeight: "bold" }}>{loginError}</p>}
          <form onSubmit={handleAdminLogin}>
            <label className="field">E-mail <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></label>
            <label className="field">Senha <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></label>
            <button className="primary-btn full" type="submit">Entrar no painel</button>
          </form>
          <button className="muted-link" onClick={() => setPage("client")} style={{ background: "none", border: 0, cursor: "pointer" }}>Voltar ao cardapio</button>
        </section>
      </main>
    );
  }

  if (page === "kitchen") {
    const activeKitchenOrders = orders.filter(o => o.status === "Recebido" || o.status === "Em preparo");
    return (
      <main className="kitchen-view">
        <header className="kitchen-header">
          <div>
            <h1>Painel da Cozinha (KDS)</h1>
            <span style={{ color: "#66707c" }}>{activeKitchenOrders.length} pedido(s) em andamento</span>
          </div>
          <button className="outline-btn" style={{ background: "#1f252d", color: "#fff", borderColor: "#3a4659" }} onClick={() => setPage("admin")}>
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
                {order.status === "Recebido" ? (
                  <button className="primary-btn full" style={{ minHeight: "42px" }} onClick={() => updateOrderStatus(order.id, "Em preparo")}>
                    Preparar
                  </button>
                ) : (
                  <button className="kds-btn-done full" onClick={() => updateOrderStatus(order.id, "Pronto")}>
                    Marcar como Pronto
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

    return (
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setPage("client"); }}>
            <span className="brand-mark">DB</span>
            <span><strong>{storeSettings.name}</strong><small>Painel da loja</small></span>
          </a>
          <nav>
            <button className={adminTab === "orders" ? "is-active" : ""} onClick={() => setAdminTab("orders")}>Pedidos</button>
            <button className={adminTab === "menu" ? "is-active" : ""} onClick={() => setAdminTab("menu")}>Cardápio</button>
            <button className={adminTab === "settings" ? "is-active" : ""} onClick={() => setAdminTab("settings")}>Configurações</button>
            <button onClick={() => setPage("kitchen")}>Tela de Cozinha (KDS)</button>
            <button onClick={() => setPage("client")} style={{ marginTop: "auto", background: "rgba(255, 100, 100, 0.1)", color: "#ff8888" }}>Sair do Painel</button>
          </nav>
        </aside>

        <section className="admin-content">
          <div className="ifood-simulator">
            <div className="ifood-simulator-title">
              <span className="ifood-logo-badge">iFood</span>
              <div>
                <h3>Simulador de Integração iFood</h3>
                <p>Receba pedidos de teste para visualizar o funcionamento igual ao Saipos.</p>
              </div>
            </div>
            <button onClick={simulateIFoodOrder}>+ Simular Novo Pedido</button>
          </div>

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
                      {["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Entregue"].map(st => (
                        <button
                          key={st}
                          className={selectedAdminOrder.status === st ? "is-active" : ""}
                          onClick={() => updateOrderStatus(selectedAdminOrder.id, st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="admin-buttons">
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
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
        {receiptOrder && (
          <div className="receipt-preview-modal">
            <div className="receipt-modal-content">
              <div className="thermal-receipt" id="printableReceipt">
                <h2>{storeSettings.name}</h2>
                <p className="center">Cura sua fome</p>
                <p className="center">WhatsApp: {storeSettings.phone}</p>
                <hr />
                <p><strong>PEDIDO: {receiptOrder.id}</strong></p>
                <p>Data/Hora: {receiptOrder.time} - {receiptOrder.origin}</p>
                <hr />
                <p><strong>CLIENTE:</strong> {receiptOrder.name}</p>
                <p>Contato: {receiptOrder.phone}</p>
                <p>Endereço: {receiptOrder.address}</p>
                {receiptOrder.complement && <p>Compl: {receiptOrder.complement}</p>}
                <hr />
                {receiptOrder.items.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: "6px" }}>
                    <div className="item-row">
                      <span className="item-desc">{item.qty}x {item.name}</span>
                      <span className="item-price">{money.format(item.price * item.qty)}</span>
                    </div>
                    {item.notes && <p style={{ margin: "2px 0 0 14px", fontSize: "11px", color: "#555" }}>- {item.notes}</p>}
                  </div>
                ))}
                <hr />
                <div className="item-row"><span>Subtotal</span><span>{money.format(receiptOrder.subtotal)}</span></div>
                <div className="item-row"><span>Taxa de Entrega</span><span>{money.format(receiptOrder.deliveryFee)}</span></div>
                <div className="total-row" style={{ marginTop: "6px" }}><span>TOTAL</span><span>{money.format(receiptOrder.total)}</span></div>
                <hr />
                <p><strong>PAGAMENTO:</strong> {receiptOrder.payment}</p>
                <hr />
                <p className="center" style={{ fontSize: "10px" }}>Obrigado pela preferência!</p>
              </div>
<div className="receipt-modal-actions">
                <button className="primary-btn" onClick={() => window.print()}>Imprimir</button>
                <button className="outline-btn" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => setReceiptOrder(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // DEFAULT CLIENT PAGE
  return (
    <>
      <div className="app-shell" style={{ opacity: isStoreOpen ? 1 : 0.9 }}>
        <Header count={count} onCart={() => setView("cart")} onDelivery={() => setFlow("delivery")} onAdminClick={() => setPage("login")} isStoreOpen={isStoreOpen} />
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
            filteredProducts={filteredProducts}
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
        />
      )}
      <FlowDrawer
        flow={flow}
        total={total}
        receiveMode={receiveMode}
        setReceiveMode={setReceiveMode}
        onClose={() => setFlow(null)}
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
        onSubmit={submitClientOrder}
        currentOrder={currentClientOrder}
        storeSettings={storeSettings}
      />
    </>
  );
}

function Header({ count, onCart, onDelivery, onAdminClick, isStoreOpen }) {
  return (
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Doutor Burger inicio">
        <span className="brand-mark">DB</span>
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
        <button className="admin-link" onClick={onAdminClick} style={{ cursor: "pointer", background: "none", alignItems: "center" }}>
          <Icon name="store" /> Entrar como loja
        </button>
      </div>
    </header>
  );
}

function Catalog({ activeCategory, filteredProducts, search, setActiveCategory, setSearch, openProduct, addQuick, isStoreOpen }) {
  return (
    <section className="catalog" id="inicio">
      <Hero />
      <Favorites openProduct={openProduct} isStoreOpen={isStoreOpen} />
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
                <ProductRow key={product.id} product={product} openProduct={openProduct} isStoreOpen={isStoreOpen} />
              )) : <div className="notice">Nenhum produto encontrado ou pausado.</div>}
            </div>
          </div>
          <WhyCard />
        </div>
      </section>
      <Combos openProduct={openProduct} addQuick={addQuick} isStoreOpen={isStoreOpen} />
      <Promos />
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
      <img src="/assets/new-direction/chicken-crispy.webp" alt="Combo Doutor Burger em destaque" />
    </div>
  );
}

function Favorites({ openProduct, isStoreOpen }) {
  const labels = ["Mais pedido", "Combo especial", "Cheddar duplo"];
  const favImages = [
    "/assets/new-direction/doutor-burger.webp",
    "/assets/new-direction/combo-doutor.webp",
    "/assets/new-direction/smash-cheddar.webp"
  ];
  return (
    <section className="section-block favorites" id="mais-pedidos">
      <div className="section-head compact">
        <div><span className="eyebrow">Mais pedidos</span><h2>Os campeoes da casa</h2></div>
        <a className="see-all" href="#cardapio">Ver todos</a>
      </div>
      <div className="favorite-grid">
        {favoriteIds.map((id, index) => {
          return (
            <article className={`favorite-card ${!isStoreOpen ? "is-disabled" : ""}`} key={id} onClick={() => isStoreOpen && openProduct(id)} style={{ opacity: isStoreOpen ? 1 : 0.6, cursor: isStoreOpen ? "pointer" : "not-allowed" }}>
              <img src={favImages[index]} alt={id} />
              <span style={{ zIndex: 1 }}>{labels[index]}</span>
              <h3>{id === "doutor" ? "Doutor Burger" : id === "smash" ? "Smash Cheddar" : "Combo Doutor"}</h3>
              <strong>{id === "doutor" ? "R$ 34,90" : id === "smash" ? "R$ 28,90" : "R$ 49,90"}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductRow({ product, openProduct, isStoreOpen }) {
  return (
    <article className="product-card" onClick={() => isStoreOpen && openProduct(product.id)} style={{ opacity: isStoreOpen ? 1 : 0.6, cursor: isStoreOpen ? "pointer" : "not-allowed" }}>
      <img src={product.image} alt={product.name} />
      <div><h3>{product.name}</h3><p>{product.description}</p></div>
      <strong>{money.format(product.price)}</strong>
      {isStoreOpen && (
        <button className="round-btn" onClick={(event) => { event.stopPropagation(); openProduct(product.id); }} aria-label={`Adicionar ${product.name}`}>+</button>
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

function Combos({ openProduct, addQuick, isStoreOpen }) {
  const labels = ["Mais pedido"];
  const comboImages = ["/assets/new-direction/combo-doutor.webp"];
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
        {comboIds.map((id, index) => {
          return (
            <article className="combo-card" key={id} onClick={() => isStoreOpen && openProduct(id)} style={{ opacity: isStoreOpen ? 1 : 0.6, cursor: isStoreOpen ? "pointer" : "not-allowed" }}>
              <img src={comboImages[index]} alt={id} />
              <span>{labels[index]}</span>
              <h3>{id.replace("-", " ")}</h3>
              <strong>{id === "combo-doutor" ? "R$ 49,90" : "R$ 44,90"}</strong>
              {isStoreOpen && (
                <button className="round-btn" onClick={(event) => { event.stopPropagation(); addQuick(id); }} aria-label={`Adicionar ${id}`}>+</button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Promos() {
  return (
    <section className="section-block promo-section" id="ofertas">
      <div className="section-head compact"><div><span className="eyebrow">Promocoes da semana</span><h2>Aproveite essas ofertas imperdiveis</h2></div></div>
      <div className="promo-grid">
        <article className="promo-card mini"><div><span className="promo-icon"><Icon name="bike" /></span><h3>Frete reduzido hoje</h3><p>Peca agora com frete especial para sua regiao.</p><button className="secondary-btn">Ver condicoes</button></div></article>
        <article className="promo-card"><div><span className="promo-icon"><Icon name="fries" /></span><h3>Leve batata por <strong>+R$ 9,90</strong></h3><p>Adicione batata media ao seu pedido.</p></div></article>
        <article className="promo-card dessert"><div><span className="promo-icon"><Icon name="cake" /></span><h3>Sobremesa por <strong>+R$ 7,90</strong></h3><p>Complete seu pedido com um doce irresistivel.</p></div></article>
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
              <img src={item.image} alt={item.name} />
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

function ProductDetail({ product, qty, setQty, extras, toggleExtra, meat, setMeat, combo, setCombo, note, setNote, unitPrice, onBack, onAdd }) {
  const extraOptions = [
    ["Bacon extra", 4],
    ["Cheddar extra", 3],
    ["Ovo", 3],
  ];
  return (
    <div className="drawer is-open" id="productDrawer" aria-hidden="false">
      <section className="drawer-card product-detail" role="dialog" aria-modal="true" aria-label="Detalhe do produto">
        <nav className="detail-breadcrumb" aria-label="Caminho">
          <button className="back-link" onClick={onBack} type="button">←</button>
          <span>Inicio</span>
          <span>Cardapio</span>
          <strong>{product ? product.name : ""}</strong>
        </nav>
        {product && (
          <>
            <div className="detail-gallery">
              <img className="detail-image" src={product.image} alt={product.name} />
              <div className="detail-thumbs">{[0, 1, 2, 3].map((item) => <img key={item} src={product.image} alt={product.name} />)}</div>
            </div>
            <div className="detail-copy">
              <div className="detail-head">
                <div className="detail-badges"><span>Mais pedido <Icon name="flame" /></span><span><Icon name="star" /> 4,8 (2.340)</span></div>
                <div className="title-row"><div><h2>{product.name}</h2><p>{product.description}</p></div><strong>{money.format(product.price)}</strong></div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">
                  <h3>Remover ingredientes</h3>
                  <p>Marque apenas o que voce quer tirar do pedido.</p>
                </div>
                <div className="option-grid compact-options"><label><input type="checkbox" /> Cebola</label><label><input type="checkbox" /> Tomate</label><label><input type="checkbox" /> Picles</label></div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">
                  <h3>Adicionais</h3>
                  <p>Complete com extras selecionados.</p>
                </div>
                <div className="option-grid extras-grid">
                  {extraOptions.map(([name, price]) => (
                    <label className="check-row" key={name}>
                      <input type="checkbox" checked={extras.some((item) => item.name === name)} onChange={() => toggleExtra(name, price)} />
                      <span>{name.replace(" extra", "")}</span>
                      <strong>+ {money.format(price)}</strong>
                    </label>
                  ))}
                </div>
              </div>

              <div className="detail-section meat-choice">
                <div className="detail-section-title">
                  <h3>Ponto da carne</h3>
                  <p>Escolha como prefere o burger.</p>
                </div>
                <div className="meat-options">
                  {["Ao ponto", "Bem passado"].map((mode) => <label key={mode}><input name="meat" type="radio" checked={meat === mode} onChange={() => setMeat(mode)} /> {mode}</label>)}
                </div>
              </div>

              <label className="combo-row detail-combo-card">
                <input type="checkbox" checked={combo} onChange={(event) => setCombo(event.target.checked)} />
                <span><strong>Adicionar batata + bebida</strong><small>Refrigerante lata 350ml</small></span>
                <strong>+ R$ 11,90</strong>
              </label>
              <label className="note-box"><span>Observacoes</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder="Ex.: sem cebola, molho a parte..." /></label>
              <div className="purchase-bar">
                <div className="qty-row"><div className="stepper"><button onClick={() => setQty(Math.max(1, qty - 1))}>-</button><strong>{qty}</strong><button onClick={() => setQty(qty + 1)}>+</button></div></div>
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
  onSubmit,
  currentOrder,
  storeSettings,
}) {
  if (!flow) return null;
  return (
    <div className="drawer is-open" id="flowDrawer" aria-hidden="false">
      <div className="drawer-backdrop" onClick={onClose} />
      <section className="drawer-card flow-card" role="dialog" aria-modal="true" style={{ width: "min(520px, calc(100vw - 20px))" }}>
        <button className="icon-btn close-btn" onClick={onClose} aria-label="Fechar">x</button>
        {flow === "delivery" && (
          <div className="flow-screen is-active">
            <span className="eyebrow">Recebimento</span><h2>Entrega ou retirada</h2>
            <div className="choice-list">{["Entrega", "Retirada"].map((mode) => <button key={mode} className={`choice ${receiveMode === mode ? "is-active" : ""}`} onClick={() => setReceiveMode(mode)}><strong>{mode}</strong><span>{mode === "Entrega" ? "Levamos ate voce" : "Retirar no balcao"}</span></button>)}</div>
            {receiveMode === "Entrega" && (
              <>
                <label className="field">Endereço de entrega <input value={checkoutAddress} onChange={(e) => setCheckoutAddress(e.target.value)} placeholder="Rua, número, bairro" /></label>
              </>
            )}
            <button className="primary-btn full" onClick={() => setFlow("checkout")}>Continuar</button>
          </div>
        )}
        {flow === "checkout" && (
          <div className="flow-screen is-active">
            <span className="eyebrow">Identificacao</span><h2>Seus dados</h2>
            <label className="field">Nome completo <input value={checkoutName} onChange={(e) => setCheckoutName(e.target.value)} /></label>
            <label className="field">WhatsApp <input value={checkoutPhone} onChange={(e) => setCheckoutPhone(e.target.value)} /></label>
            {receiveMode === "Entrega" && (
              <label className="field">Complemento / Referência <input value={checkoutComplement} onChange={(e) => setCheckoutComplement(e.target.value)} /></label>
            )}
            <label className="field">Forma de Pagamento
              <select className="field" value={checkoutPayment} onChange={(e) => setCheckoutPayment(e.target.value)} style={{ width: "100%", height: "52px", borderRadius: "16px", padding: "0 16px", background: "#fff", border: "1px solid var(--line)" }}>
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </label>
            <div className="mini-total">Total do pedido <strong>{money.format(total)}</strong></div>
            <button className="primary-btn full" onClick={onSubmit} style={{ marginTop: "14px" }}>Finalizar pedido</button>
          </div>
        )}
        {flow === "success" && currentOrder && (
          <div className="flow-screen is-active">
            <div className="success-icon" style={{ background: "var(--green)", color: "#fff", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 16px" }}>✓</div>
            <h2>Pedido enviado!</h2><p>Seu pedido foi recebido e já está no painel da loja.</p>
            <div className="order-number" style={{ background: "var(--bg)", padding: "14px", borderRadius: "14px", margin: "14px 0" }}>
              Pedido <strong>{currentOrder.id}</strong>
            </div>
            <button className="primary-btn full" onClick={() => setFlow("track")}>Acompanhar pedido</button>
          </div>
        )}
        {flow === "track" && currentOrder && (
          <div className="flow-screen is-active">
            <span className="eyebrow">Pedido {currentOrder.id}</span><h2>Acompanhar pedido</h2>
            <ol className="timeline">
              {["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Entregue"].map((step, index) => {
                const isDone = ["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Entregue"].indexOf(currentOrder.status) >= index;
                const isCurrent = currentOrder.status === step;
                return (
                  <li key={step} className={isCurrent ? "current" : isDone ? "done" : ""}>
                    <span className="dot">{index + 1}</span>
                    <div>
                      <strong>{step}</strong>
                      <p>{isCurrent ? "Esta etapa está ocorrendo agora." : isDone ? "Etapa concluída." : "Aguardando etapas anteriores."}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button className="outline-btn full" onClick={onClose} style={{ marginTop: "20px" }}>Fechar</button>
          </div>
        )}
      </section>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="brand"><span className="brand-mark">DB</span><span><strong>Doutor Burger</strong><small>Cura sua fome</small></span></div>
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

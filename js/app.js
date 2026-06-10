const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const products = [
  {
    id: "doutor",
    category: "Burgers",
    name: "Doutor Burger",
    description: "Pao brioche, blend 180g, cheddar, bacon, alface, tomate e molho especial.",
    price: 34.9,
    image: "assets/new-direction/doutor-burger.webp",
  },
  {
    id: "smash",
    category: "Burgers",
    name: "Smash Cheddar",
    description: "Dois smash burgers, cheddar cremoso, picles e cebola.",
    price: 28.9,
    image: "assets/new-direction/smash-cheddar.webp",
  },
  {
    id: "bbq",
    category: "Burgers",
    name: "BBQ Bacon",
    description: "Blend 180g, cheddar, bacon crocante e molho BBQ.",
    price: 32.9,
    image: "assets/products/bbq-bacon.webp",
  },
  {
    id: "chicken",
    category: "Burgers",
    name: "Chicken Crispy",
    description: "Frango crispy, alface, maionese da casa e pao brioche.",
    price: 27.9,
    image: "assets/new-direction/bbq-bacon.webp",
  },
  {
    id: "veggie",
    category: "Burgers",
    name: "Veggie Doctor",
    description: "Burger vegetal, cheddar, tomate, cebola roxa, alface e molho verde.",
    price: 26.9,
    image: "assets/products/veggie-burger.webp",
  },
  {
    id: "combo-doutor",
    category: "Combos",
    name: "Combo Doutor",
    description: "Doutor Burger, batata crocante e refrigerante gelado.",
    price: 49.9,
    image: "assets/new-direction/chicken-crispy.webp",
  },
  {
    id: "combo-smash",
    category: "Combos",
    name: "Combo Smash",
    description: "Smash Cheddar, batata rustica e bebida.",
    price: 44.9,
    image: "assets/new-direction/chicken-crispy.webp",
  },
  {
    id: "combo-casal",
    category: "Combos",
    name: "Combo Casal",
    description: "2 burgers, batata grande e 2 bebidas.",
    price: 89.9,
    image: "assets/new-direction/batata-cheddar-bacon.webp",
  },
  {
    id: "combo-familia",
    category: "Combos",
    name: "Combo Familia",
    description: "4 burgers, 2 batatas e 4 bebidas.",
    price: 169.9,
    image: "assets/new-direction/batata-cheddar-bacon.webp",
  },
  {
    id: "batata-rustica",
    category: "Batatas",
    name: "Batata Rustica",
    description: "Batata crocante 200g com sal da casa.",
    price: 12.9,
    image: "assets/new-direction/veggie-doctor.webp",
  },
  {
    id: "batata-cheddar",
    category: "Batatas",
    name: "Batata Cheddar Bacon",
    description: "Batata com cheddar cremoso e bacon.",
    price: 19.9,
    image: "assets/new-direction/veggie-doctor.webp",
  },
  {
    id: "coca",
    category: "Bebidas",
    name: "Refri Gelado 350ml",
    description: "Refrigerante escuro servido bem gelado.",
    price: 6,
    image: "assets/new-direction/combo-doutor.webp",
  },
  {
    id: "brownie",
    category: "Sobremesas",
    name: "Brownie Dr. Choco",
    description: "Brownie macio com calda de chocolate.",
    price: 14.9,
    image: "assets/new-direction/combo-doutor.webp",
  },
];

const categories = ["Burgers", "Combos", "Batatas", "Bebidas", "Sobremesas"];
const deliveryFee = 6.9;
let activeCategory = "Burgers";
let selectedProduct = products[0];
let detailQty = 1;
let cart = [
  {
    key: crypto.randomUUID(),
    id: "doutor",
    name: "Doutor Burger Combo",
    image: products[0].image,
    price: 46.8,
    qty: 1,
    notes: "Bem passado + Bacon extra",
  },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function renderCategories() {
  const html = categories
    .map((category) => `<button class="${category === activeCategory ? "is-active" : ""}" data-category="${category}">${category}</button>`)
    .join("");
  $("#categoryTabs").innerHTML = html;
  const rail = $("#categoryRail");
  if (rail) rail.innerHTML = html;
}

function renderProducts() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const visible = products.filter((product) => {
    const matchesCategory = product.category === activeCategory;
    const matchesSearch = !term || `${product.name} ${product.description}`.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  $("#productList").innerHTML = visible.length
    ? visible
        .map(
          (product) => `
        <article class="product-card" data-product="${product.id}">
          <img src="${product.image}" alt="${product.name}" />
          <div>
            <span class="card-badge">${product.category}</span>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
          </div>
          <strong>${money.format(product.price)}</strong>
          <button class="round-btn" data-add="${product.id}" aria-label="Adicionar ${product.name}">+</button>
        </article>
      `,
        )
        .join("")
    : `<div class="notice">Nenhum produto encontrado nesta busca.</div>`;
}

function renderCart() {
  const items = $("#cartItems");
  if (!cart.length) {
    items.innerHTML = `<div class="notice">Seu carrinho esta vazio. Escolha um burger para comecar.</div>`;
  } else {
    items.innerHTML = cart
      .map(
        (item) => `
      <article class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div>
          <strong>${item.name}</strong>
          <p>${item.notes || "Sem observacoes"}</p>
          <div class="cart-line">
            <strong>${money.format(item.price * item.qty)}</strong>
            <div class="stepper">
              <button data-cart-minus="${item.key}">-</button>
              <strong>${item.qty}</strong>
              <button data-cart-plus="${item.key}">+</button>
            </div>
          </div>
        </div>
      </article>
    `,
      )
      .join("");
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal ? subtotal + deliveryFee : 0;
  $("#subtotalText").textContent = money.format(subtotal);
  $("#feeText").textContent = subtotal ? money.format(deliveryFee) : money.format(0);
  $("#totalText").textContent = money.format(total);
  $("#checkoutTotal").textContent = money.format(total);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $("#cartBadge").textContent = count;
  const topBadge = $("#cartBadgeTop");
  if (topBadge) topBadge.textContent = count;
}

function openProduct(id) {
  selectedProduct = products.find((product) => product.id === id) || products[0];
  detailQty = 1;
  document.body.classList.remove("cart-mode");
  document.body.classList.add("detail-mode");
  $("#cartPanel").classList.remove("is-open");
  $("#detailQty").textContent = detailQty;
  $("#detailImage").src = selectedProduct.image;
  $("#detailImage").alt = selectedProduct.name;
  $$("#detailThumbs img").forEach((thumb) => {
    thumb.src = selectedProduct.image;
    thumb.alt = selectedProduct.name;
  });
  $("#detailName").textContent = selectedProduct.name;
  $("#detailDescription").textContent = selectedProduct.description;
  $("#detailPrice").textContent = money.format(selectedProduct.price);
  const summaryName = $("#detailSummaryName");
  const summaryPrice = $("#detailSummaryPrice");
  const summaryImage = $("#detailSummaryImage");
  if (summaryName) summaryName.textContent = selectedProduct.name;
  if (summaryPrice) summaryPrice.textContent = money.format(selectedProduct.price);
  if (summaryImage) {
    summaryImage.src = selectedProduct.image;
    summaryImage.alt = selectedProduct.name;
  }
  $("#itemNote").value = "";
  $("#comboToggle").checked = selectedProduct.category === "Burgers";
  $$("[data-extra]").forEach((input) => {
    input.checked = input.dataset.extra === "Bacon extra" && selectedProduct.id === "doutor";
  });
  $("#productDrawer").classList.add("is-open");
  $("#productDrawer").setAttribute("aria-hidden", "false");
  updateDetailButton();
}

function detailUnitPrice() {
  const extras = $$("[data-extra]:checked").reduce((sum, input) => sum + Number(input.dataset.extraPrice), 0);
  const combo = $("#comboToggle").checked ? 11.9 : 0;
  return selectedProduct.price + extras + combo;
}

function updateDetailButton() {
  $("#addDetailBtn").textContent = `Adicionar ao carrinho - ${money.format(detailUnitPrice() * detailQty)}`;
}

function addSelectedProduct() {
  const extras = $$("[data-extra]:checked").map((input) => input.dataset.extra);
  const meat = $("[name='meat']:checked").value;
  const combo = $("#comboToggle").checked;
  const note = $("#itemNote").value.trim();
  cart.push({
    key: crypto.randomUUID(),
    id: selectedProduct.id,
    name: combo ? `${selectedProduct.name} Combo` : selectedProduct.name,
    image: selectedProduct.image,
    price: detailUnitPrice(),
    qty: detailQty,
    notes: [meat, ...extras, note].filter(Boolean).join(" + "),
  });
  closeDrawers();
  renderCart();
}

function addQuick(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  cart.push({ key: crypto.randomUUID(), ...product, qty: 1, notes: "Adicionado rapido" });
  renderCart();
}

function closeDrawers() {
  document.body.classList.remove("detail-mode", "cart-mode");
  $$(".drawer").forEach((drawer) => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  });
  $("#cartPanel").classList.remove("is-open");
}

function openFlow(screen) {
  $("#flowDrawer").classList.add("is-open");
  $("#flowDrawer").setAttribute("aria-hidden", "false");
  $$(".flow-screen").forEach((item) => item.classList.toggle("is-active", item.dataset.screen === screen));
  renderTimeline();
}

function renderTimeline() {
  const steps = [
    ["done", "Recebido", "Seu pedido foi recebido com sucesso.", "09:41"],
    ["current", "Em preparo", "Estamos preparando seu pedido.", "09:48"],
    ["", "Pronto", "Seu pedido estara pronto para retirada ou despacho.", ""],
    ["", "Saiu para entrega", "A caminho do endereco.", ""],
    ["", "Entregue", "Pedido entregue com sucesso.", ""],
  ];
  $("#clientTimeline").innerHTML = steps
    .map(
      ([state, title, text, time], index) => `
    <li class="${state}">
      <span class="dot">${index + 1}</span>
      <div><strong>${title}</strong><p>${text}</p></div>
      <span>${time}</span>
    </li>`,
    )
    .join("");
}

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    activeCategory = categoryButton.dataset.category;
    renderCategories();
    renderProducts();
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    event.stopPropagation();
    openProduct(addButton.dataset.add);
  }

  const card = event.target.closest("[data-product]");
  if (card && !event.target.closest("button")) openProduct(card.dataset.product);

  const minus = event.target.closest("[data-cart-minus]");
  const plus = event.target.closest("[data-cart-plus]");
  if (minus || plus) {
    const key = (minus || plus).dataset.cartMinus || (minus || plus).dataset.cartPlus;
    cart = cart
      .map((item) => (item.key === key ? { ...item, qty: item.qty + (plus ? 1 : -1) } : item))
      .filter((item) => item.qty > 0);
    renderCart();
  }

  const quick = event.target.closest("[data-quick-add]");
  if (quick) addQuick(quick.dataset.quickAdd);

  const panel = event.target.closest("[data-open-panel]");
  if (panel) {
    const screen = panel.dataset.openPanel;
    if (screen === "cart") {
      document.body.classList.remove("detail-mode");
      document.body.classList.add("cart-mode");
      $("#productDrawer").classList.remove("is-open");
      $("#productDrawer").setAttribute("aria-hidden", "true");
      $("#cartPanel").classList.add("is-open");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    else openFlow(screen);
  }

  if (event.target.closest("[data-close-panel]")) closeDrawers();
  if (event.target.closest("[data-close-drawer]")) closeDrawers();
  if (event.target.closest("[data-close-flow]")) closeDrawers();
  if (event.target.closest("[data-detail-minus]")) {
    detailQty = Math.max(1, detailQty - 1);
    $("#detailQty").textContent = detailQty;
    updateDetailButton();
  }
  if (event.target.closest("[data-detail-plus]")) {
    detailQty += 1;
    $("#detailQty").textContent = detailQty;
    updateDetailButton();
  }
  if (event.target.closest("[data-scroll-menu]")) $("#cardapio").scrollIntoView({ behavior: "smooth" });

  const mode = event.target.closest("[data-mode]");
  if (mode) {
    $$("[data-mode]").forEach((item) => item.classList.toggle("is-active", item.dataset.mode === mode.dataset.mode));
  }

  const payment = event.target.closest("[data-payment]");
  if (payment) {
    $$("[data-payment]").forEach((item) => item.classList.toggle("is-active", item === payment));
  }
});

$("#searchInput").addEventListener("input", renderProducts);
$("#comboToggle").addEventListener("change", updateDetailButton);
$$("[data-extra]").forEach((input) => input.addEventListener("change", updateDetailButton));
$("#addDetailBtn").addEventListener("click", addSelectedProduct);
$$("[data-finish-order]").forEach((button) => button.addEventListener("click", () => openFlow("success")));

renderCategories();
renderProducts();
renderCart();
renderTimeline();

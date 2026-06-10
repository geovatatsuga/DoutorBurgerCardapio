const statuses = ["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Entregue"];
let currentStatus = "Em preparo";

const orders = [
  { id: "#5427", name: "Lucas Fernandes", total: "R$ 82,60", status: "Em preparo", time: "09:48" },
  { id: "#5428", name: "Marina Souza", total: "R$ 49,90", status: "Recebido", time: "09:52" },
  { id: "#5429", name: "Pedro Lima", total: "R$ 67,70", status: "Pronto", time: "10:04" },
  { id: "#5430", name: "Ana Paula", total: "R$ 31,90", status: "Saiu para entrega", time: "10:12" },
];

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

function renderOrders() {
  qs("#adminOrders").innerHTML = orders
    .map(
      (order, index) => `
    <article class="order-ticket ${index === 0 ? "is-active" : ""}">
      <strong>${order.id}</strong>
      <p>${order.name}</p>
      <span>${order.status} - ${order.time}</span>
      <strong>${order.total}</strong>
    </article>
  `,
    )
    .join("");
}

function renderStatuses() {
  qs("#statusActions").innerHTML = statuses
    .map((status) => `<button class="${status === currentStatus ? "is-active" : ""}" data-status="${status}">${status}</button>`)
    .join("");
}

qs("#loginBtn").addEventListener("click", () => {
  qs("#loginView").classList.add("is-hidden");
  qs("#adminView").classList.remove("is-hidden");
});

document.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-admin-tab]");
  if (tabButton) {
    const tab = tabButton.dataset.adminTab;
    qsa("[data-admin-tab]").forEach((button) => button.classList.toggle("is-active", button === tabButton));
    qsa(".admin-tab").forEach((section) => section.classList.toggle("is-hidden", section.dataset.tab !== tab));
  }

  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    currentStatus = statusButton.dataset.status;
    renderStatuses();
  }

  const ticket = event.target.closest(".order-ticket");
  if (ticket) {
    qsa(".order-ticket").forEach((item) => item.classList.toggle("is-active", item === ticket));
  }
});

renderOrders();
renderStatuses();

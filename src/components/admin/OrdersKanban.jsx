import React, { useEffect, useMemo, useState } from "react";
import CancelOrderModal from "./CancelOrderModal";
import OrderDetailsModal from "./OrderDetailsModal";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const KANBAN_COLUMNS = [
  { id: "received", title: "Novos", statusLabel: "Recebido", accentColor: "#3b82f6" },
  { id: "confirmed", title: "Confirmados", statusLabel: "Confirmado", accentColor: "#6366f1" },
  { id: "preparing", title: "Em preparo", statusLabel: "Em preparo", accentColor: "#f59e0b" },
  { id: "ready", title: "Prontos", statusLabel: "Pronto", accentColor: "#10b981" },
  { id: "dispatched", title: "Em entrega", statusLabel: "Saiu para entrega", accentColor: "#8b5cf6" },
  { id: "completed", title: "Finalizados", statusLabel: "Entregue", accentColor: "#64748b" },
];

function getDelayLevel(minutes) {
  if (minutes <= 10) return { level: "normal", label: "Normal", badgeClass: "delay-normal" };
  if (minutes <= 20) return { level: "attention", label: "Atenção", badgeClass: "delay-attention" };
  if (minutes <= 30) return { level: "delayed", label: "Atrasado", badgeClass: "delay-delayed" };
  return { level: "critical", label: "Crítico", badgeClass: "delay-critical" };
}

function calculateElapsedMinutes(timeStr, dateObj) {
  if (!timeStr && !dateObj) return 0;
  let created = dateObj ? new Date(dateObj) : null;
  if (!created || isNaN(created.getTime())) {
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      created = new Date();
      created.setHours(h || 0, m || 0, 0, 0);
    } else {
      return 0;
    }
  }
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

// Web Audio chime player with deduplication
const playedOrderAudioSet = new Set();
function playNewOrderSound(orderId) {
  if (playedOrderAudioSet.has(orderId)) return;
  playedOrderAudioSet.add(orderId);

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio error:", e);
  }
}

export default function OrdersKanban({
  orders = [],
  onUpdateStatus,
  onPrintReceipt,
  savingOrderId,
  delayThresholds = { attention: 10, delayed: 20, critical: 30 },
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"

  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Dynamic ticker for updating timers every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Check for new "Recebido" orders to trigger chime
  const newOrders = useMemo(
    () => orders.filter((o) => o.status === "Recebido"),
    [orders]
  );

  useEffect(() => {
    newOrders.forEach((o) => playNewOrderSound(o.id));
  }, [newOrders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status === "Cancelado") return false; // Cancelled are viewed in History or toggle

      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = order.name?.toLowerCase().includes(term);
        const matchesId = (order.displayId || order.id)?.toLowerCase().includes(term);
        const matchesPhone = order.phone?.includes(term);
        if (!matchesName && !matchesId && !matchesPhone) return false;
      }

      if (fulfillmentFilter !== "all") {
        const isDelivery = !order.address.includes("Balcao");
        if (fulfillmentFilter === "delivery" && !isDelivery) return false;
        if (fulfillmentFilter === "pickup" && isDelivery) return false;
      }

      if (paymentFilter !== "all") {
        if (paymentFilter === "pix" && order.payment !== "Pix") return false;
        if (paymentFilter === "cash" && order.payment !== "Dinheiro") return false;
        if (paymentFilter === "card" && !order.payment.includes("Cartao") && !order.payment.includes("Cart\u00e3o")) return false;
      }

      return true;
    });
  }, [orders, searchTerm, fulfillmentFilter, paymentFilter]);

  const handleCancelConfirm = (orderId, reason) => {
    onUpdateStatus(orderId, "Cancelado", { reason, skipConfirm: true });
    setOrderToCancel(null);
    if (selectedOrderForDetails?.id === orderId) {
      setSelectedOrderForDetails(null);
    }
  };

  const openWhatsapp = (order) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${order.name}! Seu pedido ${order.displayId || order.id} na Doutor Burger está com status: ${order.status}.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="orders-kanban-wrapper">
      {/* Top Alert Banner for New Orders */}
      {newOrders.length > 0 && (
        <div className="new-orders-alert-banner">
          <span className="bell-icon">🔔</span>
          <strong>{newOrders.length} novo(s) pedido(s) aguardando confirmação!</strong>
          <button
            className="btn-ack-alert"
            onClick={() => {
              const firstNew = newOrders[0];
              if (firstNew) onUpdateStatus(firstNew.id, "Confirmado", { skipConfirm: true });
            }}
          >
            Aceitar Primeiro (#{newOrders[0]?.orderNumber || newOrders[0]?.id})
          </button>
        </div>
      )}

      {/* Filter and View Bar */}
      <div className="kanban-filter-bar">
        <div className="filter-group search-group">
          <input
            type="text"
            placeholder="Buscar por #pedido, cliente ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Entrega:</label>
          <select value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value)} className="filter-select">
            <option value="all">Todas as opções</option>
            <option value="delivery">Somente Entrega</option>
            <option value="pickup">Somente Retirada</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Pagamento:</label>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="filter-select">
            <option value="all">Todos os tipos</option>
            <option value="pix">PIX</option>
            <option value="cash">Dinheiro</option>
            <option value="card">Cartão</option>
          </select>
        </div>

        <div className="view-mode-toggle">
          <button
            className={`btn-mode ${viewMode === "kanban" ? "active" : ""}`}
            onClick={() => setViewMode("kanban")}
            title="Visualização Kanban em Colunas"
          >
            📊 Colunas
          </button>
          <button
            className={`btn-mode ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="Visualização em Lista"
          >
            📋 Lista
          </button>
        </div>
      </div>

      {/* Main Kanban Board View */}
      {viewMode === "kanban" ? (
        <div className="kanban-board">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.statusLabel);

            return (
              <div key={col.id} className="kanban-column">
                <div className="column-header" style={{ borderTopColor: col.accentColor }}>
                  <div className="header-title">
                    <h3>{col.title}</h3>
                    <span className="count-badge">{colOrders.length}</span>
                  </div>
                </div>

                <div className="column-body">
                  {colOrders.length === 0 ? (
                    <div className="empty-column-state">Sem pedidos</div>
                  ) : (
                    colOrders.map((order) => {
                      const elapsed = calculateElapsedMinutes(order.time, order.createdAt || order.created_at);
                      const delay = getDelayLevel(elapsed);
                      const displayId = order.displayId || `#${order.orderNumber || order.id}`;
                      const isSaving = savingOrderId === order.id;

                      return (
                        <div key={order.id} className={`kanban-card ${delay.badgeClass} ${order.origin === "iFood" ? "card-ifood" : ""}`}>
                          {/* Card Header */}
                          <div className="card-top">
                            <span className="card-id">{displayId}</span>
                            <span className={`timer-badge ${delay.badgeClass}`}>
                              ⏱️ {elapsed} min
                            </span>
                          </div>

                          {/* Customer & Order Details */}
                          <div className="card-customer">
                            <strong>{order.name}</strong>
                            <small>{order.phone}</small>
                          </div>

                          <div className="card-meta-pills">
                            <span className="pill-type">
                              {order.address.includes("Balcao") ? "🛍️ Retirada" : "🛵 Entrega"}
                            </span>
                            <span className="pill-payment">💳 {order.payment}</span>
                            {order.origin === "iFood" && <span className="pill-ifood">iFood</span>}
                          </div>

                          <div className="card-items-summary">
                            <span>{(order.items || []).reduce((acc, i) => acc + (i.qty || 1), 0)} itens</span>
                            <strong className="card-total">{money.format(order.total)}</strong>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="card-quick-actions">
                            {col.statusLabel === "Recebido" && (
                              <button
                                className="btn-action primary"
                                onClick={() => onUpdateStatus(order.id, "Confirmado", { skipConfirm: true })}
                                disabled={isSaving}
                              >
                                {isSaving ? "..." : "Aceitar"}
                              </button>
                            )}

                            {(col.statusLabel === "Recebido" || col.statusLabel === "Confirmado") && (
                              <button
                                className="btn-action accent"
                                onClick={() => onUpdateStatus(order.id, "Em preparo", { skipConfirm: true })}
                                disabled={isSaving}
                              >
                                {isSaving ? "..." : "Preparar"}
                              </button>
                            )}

                            {col.statusLabel === "Em preparo" && (
                              <button
                                className="btn-action green"
                                onClick={() => onUpdateStatus(order.id, "Pronto", { skipConfirm: true })}
                                disabled={isSaving}
                              >
                                {isSaving ? "..." : "Pronto"}
                              </button>
                            )}

                            {col.statusLabel === "Pronto" && (
                              <button
                                className="btn-action purple"
                                onClick={() => onUpdateStatus(order.id, "Saiu para entrega", { skipConfirm: true })}
                                disabled={isSaving}
                              >
                                {isSaving ? "..." : "Despachar"}
                              </button>
                            )}

                            {(col.statusLabel === "Pronto" || col.statusLabel === "Saiu para entrega") && (
                              <button
                                className="btn-action success"
                                onClick={() => onUpdateStatus(order.id, "Entregue", { skipConfirm: true })}
                                disabled={isSaving}
                              >
                                {isSaving ? "..." : "Concluir"}
                              </button>
                            )}

                            <button
                              className="btn-action-icon"
                              onClick={() => setSelectedOrderForDetails(order)}
                              title="Ver Detalhes do Pedido"
                            >
                              🔍
                            </button>
                            <button
                              className="btn-action-icon"
                              onClick={() => onPrintReceipt(order)}
                              title="Imprimir Recibo"
                            >
                              🖨️
                            </button>
                            <button
                              className="btn-action-icon"
                              onClick={() => openWhatsapp(order)}
                              title="Enviar WhatsApp"
                            >
                              💬
                            </button>
                            <button
                              className="btn-action-icon danger"
                              onClick={() => setOrderToCancel(order)}
                              title="Cancelar Pedido"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alternative Table List View */
        <div className="orders-list-view">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Tempo</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Forma</th>
                <th>Modalidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const elapsed = calculateElapsedMinutes(order.time, order.createdAt);
                const delay = getDelayLevel(elapsed);
                const displayId = order.displayId || `#${order.orderNumber || order.id}`;

                return (
                  <tr key={order.id}>
                    <td><strong>{displayId}</strong></td>
                    <td><span className={`timer-badge ${delay.badgeClass}`}>{elapsed} min</span></td>
                    <td>{order.name}<br /><small className="text-muted">{order.phone}</small></td>
                    <td><strong>{money.format(order.total)}</strong></td>
                    <td>{order.payment}</td>
                    <td>{order.address.includes("Balcao") ? "Retirada" : "Entrega"}</td>
                    <td><span className={`badge badge-${order.status.toLowerCase().replace(/\s+/g, "")}`}>{order.status}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-table" onClick={() => setSelectedOrderForDetails(order)}>Detalhes</button>
                        <button className="btn-table" onClick={() => onPrintReceipt(order)}>Imprimir</button>
                        <button className="btn-table danger" onClick={() => setOrderToCancel(order)}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {selectedOrderForDetails && (
        <OrderDetailsModal
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
          onPrint={onPrintReceipt}
          onSendWhatsapp={openWhatsapp}
          onCancelClick={(ord) => setOrderToCancel(ord)}
        />
      )}

      {orderToCancel && (
        <CancelOrderModal
          order={orderToCancel}
          onClose={() => setOrderToCancel(null)}
          onConfirm={handleCancelConfirm}
          isSaving={savingOrderId === orderToCancel.id}
        />
      )}
    </div>
  );
}

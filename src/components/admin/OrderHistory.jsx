import React, { useEffect, useState } from "react";
import { loadOrderHistory } from "../../services/supabaseData";
import CancelOrderModal from "./CancelOrderModal";
import OrderDetailsModal from "./OrderDetailsModal";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function OrderHistory({ onPrintReceipt, onUpdateStatus, savingOrderId, onDuplicateOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filter states
  const [datePreset, setDatePreset] = useState("7days"); // "today", "yesterday", "7days", "30days", "custom"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Compute dates based on preset
  const computeDateRange = (preset) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (preset === "yesterday") {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (preset === "7days") {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (preset === "30days") {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (preset === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      return { start: startDate, end: endDate };
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const range = computeDateRange(datePreset);
      const data = await loadOrderHistory({
        startDate: range.start,
        endDate: range.end,
        status: statusFilter,
        fulfillment: fulfillmentFilter,
        paymentMethod: paymentFilter,
        search: searchTerm,
        minTotal,
        maxTotal,
        limit: 300,
      });
      setOrders(data);
    } catch (err) {
      console.error("Error loading order history:", err);
      setErrorMsg("Erro ao carregar histórico de pedidos: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [datePreset, startDate, endDate, statusFilter, fulfillmentFilter, paymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const exportToCSV = () => {
    if (orders.length === 0) {
      alert("Nenhum pedido para exportar.");
      return;
    }

    const headers = ["Pedido", "Data", "Hora", "Cliente", "Telefone", "Modalidade", "Pagamento", "Status", "Subtotal", "Taxa", "Total"];
    const rows = orders.map((o) => [
      o.displayId || o.id,
      o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "",
      o.time || "",
      `"${o.name || ""}"`,
      `"${o.phone || ""}"`,
      o.address?.includes("Balcao") ? "Retirada" : "Entrega",
      o.payment || "",
      o.status || "",
      o.subtotal || 0,
      o.deliveryFee || 0,
      o.total || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_pedidos_doutor_burger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelConfirm = async (orderId, reason) => {
    try {
      await onUpdateStatus(orderId, "Cancelado", { reason, skipConfirm: true });
      setOrderToCancel(null);
      fetchHistory();
    } catch (err) {
      alert("Erro ao cancelar: " + err.message);
    }
  };

  const openWhatsapp = (order) => {
    const cleanPhone = order.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${order.name}! Referente ao seu pedido ${order.displayId || order.id} na Doutor Burger:`);
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="order-history-container">
      {/* Header & Controls */}
      <div className="history-header">
        <div>
          <h2>Histórico Completo de Pedidos</h2>
          <p className="subtitle">Consulte pedidos antigos, auditores, linhas do tempo e exporte relatórios.</p>
        </div>
        <button className="primary-btn export-btn" onClick={exportToCSV} type="button">
          📥 Exportar CSV
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="history-filter-card">
        <form onSubmit={handleSearchSubmit} className="history-filter-form">
          <div className="filter-row">
            <div className="filter-item">
              <label>Período:</label>
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="filter-select">
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="month">Mês Atual</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {datePreset === "custom" && (
              <>
                <div className="filter-item">
                  <label>Data Início:</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="filter-input" />
                </div>
                <div className="filter-item">
                  <label>Data Fim:</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="filter-input" />
                </div>
              </>
            )}

            <div className="filter-item">
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                <option value="all">Todos os status</option>
                <option value="Recebido">Recebido</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Em preparo">Em preparo</option>
                <option value="Pronto">Pronto</option>
                <option value="Saiu para entrega">Saiu para entrega</option>
                <option value="Entregue">Entregue</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Modalidade:</label>
              <select value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value)} className="filter-select">
                <option value="all">Todas</option>
                <option value="delivery">Entrega</option>
                <option value="pickup">Retirada</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Pagamento:</label>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="filter-select">
                <option value="all">Todos</option>
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartao">Cartão</option>
              </select>
            </div>
          </div>

          <div className="filter-row" style={{ marginTop: "10px" }}>
            <div className="filter-item search-item">
              <input
                type="text"
                placeholder="Buscar por #pedido, cliente ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <button className="outline-btn" type="submit">
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="loading-container">
          <p>Carregando histórico de pedidos...</p>
        </div>
      ) : errorMsg ? (
        <div className="error-container">
          <p>{errorMsg}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-history-state">
          <p>Nenhum pedido encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Horário</th>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>Modalidade</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const displayId = order.displayId || `#${order.orderNumber || order.id}`;

                return (
                  <tr key={order.id}>
                    <td><strong>{displayId}</strong></td>
                    <td>{order.time}</td>
                    <td><strong>{order.name}</strong></td>
                    <td>{order.phone}</td>
                    <td>{order.address.includes("Balcao") ? "Retirada" : "Entrega"}</td>
                    <td>{order.payment}</td>
                    <td><strong>{money.format(order.total)}</strong></td>
                    <td>
                      <span className={`badge badge-${order.status.toLowerCase().replace(/\s+/g, "")}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-table" onClick={() => setSelectedOrderDetails(order)} title="Ver Detalhes & Auditoria">
                          👁️ Detalhes
                        </button>
                        <button className="btn-table" onClick={() => onPrintReceipt(order)} title="Imprimir Recibo">
                          🖨️ Imprimir
                        </button>
                        {onDuplicateOrder && (
                          <button className="btn-table" onClick={() => onDuplicateOrder(order)} title="Duplicar Pedido">
                            🔄 Duplicar
                          </button>
                        )}
                        <button className="btn-table" onClick={() => openWhatsapp(order)} title="Enviar WhatsApp">
                          💬 WhatsApp
                        </button>
                        {order.status !== "Cancelado" && (
                          <button className="btn-table danger" onClick={() => setOrderToCancel(order)} title="Cancelar Pedido">
                            ❌ Cancelar
                          </button>
                        )}
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
      {selectedOrderDetails && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          onClose={() => setSelectedOrderDetails(null)}
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

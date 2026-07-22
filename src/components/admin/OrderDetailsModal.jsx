import React, { useEffect, useState } from "react";
import { fetchOrderStatusTimeline } from "../../services/supabaseData";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function OrderDetailsModal({ order, onClose, onPrint, onSendWhatsapp, onCancelClick }) {
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    if (order && order.dbId) {
      setLoadingTimeline(true);
      fetchOrderStatusTimeline(order.dbId)
        .then((data) => setTimeline(data))
        .catch((err) => console.error("Error loading timeline:", err))
        .finally(() => setLoadingTimeline(false));
    }
  }, [order]);

  if (!order) return null;

  const displayId = order.displayId || `#${order.orderNumber || order.id}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{order.origin || "Cardápio"}</span>
            <h3>Detalhes do Pedido {displayId}</h3>
          </div>
          <button className="close-btn" onClick={onClose} type="button">&times;</button>
        </div>

        <div className="details-grid">
          <div className="details-section">
            <h4>Informações do Cliente</h4>
            <p><strong>Nome:</strong> {order.name}</p>
            <p><strong>Telefone:</strong> {order.phone}</p>
            <p><strong>Modalidade:</strong> {order.address.includes("Balcao") ? "Retirada no Balcão" : "Entrega"}</p>
            <p><strong>Endereço:</strong> {order.address}</p>
            {order.complement && <p><strong>Complemento:</strong> {order.complement}</p>}
            <p><strong>Forma de Pagamento:</strong> {order.payment}</p>
          </div>

          <div className="details-section">
            <h4>Itens do Pedido</h4>
            <div className="order-items-list">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="item-row">
                  <div className="item-main">
                    <span>{item.qty}x {item.name}</span>
                    <strong>{money.format(item.price * item.qty)}</strong>
                  </div>
                  {item.notes && <small className="item-notes">- {item.notes}</small>}
                </div>
              ))}
            </div>
            <div className="financial-totals">
              <div className="total-row"><span>Subtotal:</span> <span>{money.format(order.subtotal)}</span></div>
              <div className="total-row"><span>Taxa de Entrega:</span> <span>{money.format(order.deliveryFee)}</span></div>
              <div className="total-row grand-total"><span>Total:</span> <span>{money.format(order.total)}</span></div>
            </div>
          </div>
        </div>

        <div className="details-section timeline-section">
          <h4>Histórico e Linha do Tempo de Status</h4>
          {loadingTimeline ? (
            <p className="loading-text">Carregando histórico...</p>
          ) : timeline.length === 0 ? (
            <p className="empty-text">Nenhuma alteração registrada além da criação.</p>
          ) : (
            <ul className="timeline-list">
              {timeline.map((entry) => (
                <li key={entry.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-title">
                      <strong>{entry.to_status}</strong>
                      {entry.from_status && <span className="timeline-from"> (de {entry.from_status})</span>}
                    </div>
                    <div className="timeline-meta">
                      <span>Alterado por: {entry.changed_by_name || "Sistema"}</span> •{" "}
                      <span>{new Date(entry.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    {entry.reason && <p className="timeline-reason">Motivo/Nota: {entry.reason}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-actions">
          <button className="outline-btn" type="button" onClick={() => onPrint(order)}>
            Imprimir Recibo
          </button>
          {onSendWhatsapp && (
            <button className="outline-btn" type="button" onClick={() => onSendWhatsapp(order)}>
              Enviar WhatsApp
            </button>
          )}
          {order.status !== "Cancelado" && onCancelClick && (
            <button className="danger-btn" type="button" onClick={() => onCancelClick(order)}>
              Cancelar Pedido
            </button>
          )}
          <button className="primary-btn" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

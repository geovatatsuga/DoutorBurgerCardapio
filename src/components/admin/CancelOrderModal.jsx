import React, { useState } from "react";

const CANCELLATION_REASONS = [
  "Cliente desistiu",
  "Pagamento não confirmado",
  "Produto indisponível",
  "Endereço fora da área",
  "Pedido duplicado",
  "Erro no pedido",
  "Loja indisponível",
  "Outro",
];

export default function CancelOrderModal({ order, onClose, onConfirm, isSaving }) {
  const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
  const [notes, setNotes] = useState("");

  if (!order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = notes.trim() ? `${reason}: ${notes.trim()}` : reason;
    onConfirm(order.id, finalReason);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cancelar Pedido {order.displayId || order.id}</h3>
          <button className="close-btn" onClick={onClose} type="button">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-subtitle">
            Por favor, selecione o motivo do cancelamento. Esta ação será registrada no histórico de auditoria.
          </p>

          <div className="form-group">
            <label htmlFor="cancel-reason">Motivo do cancelamento *</label>
            <select
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              required
            >
              {CANCELLATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cancel-notes">Observação adicional (opcional)</label>
            <textarea
              id="cancel-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente informou via WhatsApp que precisou sair..."
              rows={3}
              className="form-control"
            />
          </div>

          <div className="modal-actions">
            <button className="outline-btn" type="button" onClick={onClose} disabled={isSaving}>
              Voltar
            </button>
            <button className="danger-btn" type="submit" disabled={isSaving}>
              {isSaving ? "Cancelando..." : "Confirmar Cancelamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React from "react";
import { createRoot } from "react-dom/client";
import "../css/styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center", maxWidth: "600px", margin: "40px auto" }}>
          <h2>Algo deu errado ao carregar a pagina</h2>
          <p style={{ color: "#666", fontSize: "14px" }}>
            {this.state.error?.message || "Ocorreu um erro inesperado."}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ padding: "12px 24px", background: "#d93838", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "16px" }}
          >
            Limpar cache e recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

function renderBootError(error) {
  console.error("Erro ao iniciar o cardapio:", error);
  root.render(
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Inter,system-ui,sans-serif", background: "#fffaf2", color: "#1f252d" }}>
      <section style={{ maxWidth: 560, background: "#fff", border: "1px solid #eadfce", borderRadius: 18, padding: 24, boxShadow: "0 18px 55px rgba(42,31,15,.12)" }}>
        <strong style={{ display: "block", color: "#df8b00", marginBottom: 8 }}>BurgerC</strong>
        <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>Nao foi possivel carregar o cardapio.</h1>
        <p style={{ margin: "0 0 16px", color: "#66707c" }}>Recarregue a pagina. Se continuar, envie esta mensagem de erro.</p>
        <pre style={{ whiteSpace: "pre-wrap", overflow: "auto", maxHeight: 220, background: "#1f252d", color: "#fff", padding: 14, borderRadius: 10 }}>{String(error?.stack || error?.message || error)}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, border: 0, borderRadius: 12, background: "#f2a20f", color: "#1f252d", fontWeight: 800, padding: "12px 16px", cursor: "pointer" }}>Recarregar</button>
      </section>
    </main>,
  );
}

rootElement.innerHTML = '<p style="padding:24px;font-family:Inter,system-ui,sans-serif">Carregando BurgerC...</p>';

import("./App.jsx")
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
  })
  .catch(renderBootError);

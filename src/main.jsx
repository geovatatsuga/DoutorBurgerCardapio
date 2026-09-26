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
  rootElement.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif;background:#fffaf2;color:#1f252d">
      <section style="max-width:560px;background:#fff;border:1px solid #eadfce;border-radius:18px;padding:24px;box-shadow:0 18px 55px rgba(42,31,15,.12)">
        <strong style="display:block;color:#df8b00;margin-bottom:8px">BurgerC</strong>
        <h1 style="font-size:26px;margin:0 0 10px">Nao foi possivel carregar o cardapio.</h1>
        <p style="margin:0 0 16px;color:#66707c">Recarregue a pagina. Se continuar, envie esta mensagem de erro.</p>
        <pre style="white-space:pre-wrap;overflow:auto;max-height:220px;background:#1f252d;color:#fff;padding:14px;border-radius:10px">${String(error?.stack || error?.message || error)}</pre>
        <button onclick="window.location.reload()" style="margin-top:16px;border:0;border-radius:12px;background:#f2a20f;color:#1f252d;font-weight:800;padding:12px 16px;cursor:pointer">Recarregar</button>
      </section>
    </main>
  `;
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

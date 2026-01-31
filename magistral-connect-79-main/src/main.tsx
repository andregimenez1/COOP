import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui;">
      <div>
        <h1 style="color: #ef4444; margin-bottom: 16px;">Erro: Elemento root não encontrado</h1>
        <p style="color: #6b7280;">O elemento #root não foi encontrado no HTML.</p>
      </div>
    </div>
  `;
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Erro ao renderizar aplicação:", error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui; background: #f9fafb;">
        <div style="max-width: 600px; background: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #ef4444; margin-bottom: 16px; font-size: 24px;">Erro ao Carregar Aplicação</h1>
          <p style="color: #6b7280; margin-bottom: 16px;">Ocorreu um erro ao inicializar a aplicação.</p>
          <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: left; overflow: auto; font-size: 12px; margin-bottom: 16px;">
            ${error instanceof Error ? error.toString() + '\n\n' + error.stack : String(error)}
          </pre>
          <button 
            onclick="window.location.reload()" 
            style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    `;
  }
}

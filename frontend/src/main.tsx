import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";

// Tema inicial: guardado no localStorage, com fallback para dark (predefinição).
try {
  const saved = localStorage.getItem("acadbot-theme");
  if (saved === "light") document.documentElement.classList.remove("dark");
} catch {
  /* armazenamento indisponível */
}

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root não encontrado no HTML.");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

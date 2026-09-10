import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// Bootstrap empaquetado (mismo origen, minificado y con hash de caché por
// Vite) en vez de un <link> a un CDN externo: evita un DNS+TLS extra en la
// ruta crítica de render.
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

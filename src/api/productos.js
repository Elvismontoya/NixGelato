import { apiGet, apiPost, apiPut, apiDelete, buildQuery } from "./client.js";

export const getProductos = () => apiGet("/api/productos");
export const crearProducto = (body) => apiPost("/api/productos", body);
export const actualizarProducto = (id, body) =>
  apiPut(`/api/productos/${id}`, body);
export const eliminarProducto = (id) => apiDelete(`/api/productos/${id}`);
export const getVentasProducto = (id, params) =>
  apiGet(`/api/productos/${id}/ventas${buildQuery(params)}`);

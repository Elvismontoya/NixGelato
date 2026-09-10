import { apiGet, apiPost, apiPut, apiDelete } from "./client.js";

export const getCategorias = () => apiGet("/api/categorias");
export const crearCategoria = (body) => apiPost("/api/categorias", body);
export const actualizarCategoria = (id, body) =>
  apiPut(`/api/categorias/${id}`, body);
export const eliminarCategoria = (id) => apiDelete(`/api/categorias/${id}`);

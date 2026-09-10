import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  buildQuery,
} from "./client.js";

export const getEmpleados = (params) =>
  apiGet(`/api/empleados${buildQuery(params)}`);
export const getRoles = () => apiGet("/api/empleados/roles/lista");
export const crearEmpleado = (body) => apiPost("/api/empleados", body);
export const actualizarEmpleado = (id, body) =>
  apiPut(`/api/empleados/${id}`, body);
export const cambiarPassword = (id, password) =>
  apiPatch(`/api/empleados/${id}/password`, { password });
export const desactivarEmpleado = (id) => apiDelete(`/api/empleados/${id}`);

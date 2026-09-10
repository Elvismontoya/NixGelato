import { apiGet, apiPost, buildQuery } from "./client.js";

export const getAuditoria = (params) =>
  apiGet(`/api/auditoria${buildQuery(params)}`);
export const getIngresosHoy = () => apiGet("/api/auditoria/ingresos-hoy");
export const registrarAuditoria = (body) => apiPost("/api/auditoria", body);

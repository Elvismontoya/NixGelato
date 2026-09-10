import { apiGet, apiPut } from "./client.js";

export const getConfig = () => apiGet("/api/config");
export const actualizarConfig = (body) => apiPut("/api/config", body);

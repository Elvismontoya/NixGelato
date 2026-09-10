import { apiGet, apiPost, buildQuery } from './client.js'

export const getEstadoCaja      = () => apiGet('/api/caja/estado')
export const getEstadoTodasCajas = () => apiGet('/api/caja/estado-todas')
export const getHistorialCaja   = (params) => apiGet(`/api/caja/historial${buildQuery(params)}`)
export const abrirCaja          = (body) => apiPost('/api/caja/apertura', body)
export const cerrarCaja         = (body) => apiPost('/api/caja/cierre', body)

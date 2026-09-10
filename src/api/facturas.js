import { apiGet, apiPost, buildQuery } from './client.js'

export const getFacturas        = (params) => apiGet(`/api/facturas${buildQuery(params)}`)
export const getFacturaDetalle  = (id) => apiGet(`/api/facturas/${id}/detalle`)
export const getMetodosPago     = () => apiGet('/api/facturas/metodos-pago')
export const getIngresosPorDia  = (params) => apiGet(`/api/facturas/ingresos-por-dia${buildQuery(params)}`)
export const registrarVenta     = (body) => apiPost('/api/facturas', body)
export const anularVenta        = (id, motivo) => apiPost(`/api/facturas/${id}/anular`, { motivo })

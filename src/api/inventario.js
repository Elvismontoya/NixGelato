import { apiGet, apiPut } from './client.js'

export const getInventario     = () => apiGet('/api/inventario')
export const getAlertasStock   = () => apiGet('/api/inventario/alertas')
export const getStockBajo      = () => apiGet('/api/inventario/bajos')
export const getStockAgotado   = () => apiGet('/api/inventario/agotados')
export const ajustarStock      = (id, body) => apiPut(`/api/inventario/${id}`, body)

// Clasificación de stock para la vista. Espejo de server/domain/inventario.js.
export function estadoStock(stockActual, stockMinimo) {
  if (stockActual <= 0) return 'agotado'
  if (stockActual <= stockMinimo) return 'bajo'
  return 'normal'
}

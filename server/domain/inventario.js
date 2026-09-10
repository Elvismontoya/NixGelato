// Reglas puras de estado de stock.

export function estadoStock({ stockActual, stockMinimo }) {
  if (stockActual <= 0) return "agotado";
  if (stockActual <= stockMinimo) return "bajo";
  return "normal";
}

export function esStockBajo({ stockActual, stockMinimo }) {
  return stockActual <= stockMinimo;
}

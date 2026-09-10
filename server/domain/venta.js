// Clasificación pura de los errores de negocio de la RPC registrar_venta.

const NEGOCIO = /^(SIN_PRODUCTOS|ITEM_INVALIDO|METODO_PAGO_INVALIDO|PRODUCTO_NO_DISPONIBLE|SIN_INVENTARIO|STOCK_INSUFICIENTE)/

// ¿El mensaje de la RAISE EXCEPTION es un error de negocio (400) y no un fallo técnico (500)?
export function esErrorNegocioVenta(pgMessage = '') {
  return NEGOCIO.test(pgMessage)
}

// Traduce el código crudo de la RPC a un mensaje legible para el cajero.
export function traducirErrorVenta(pgMessage = '') {
  if (pgMessage.startsWith('SIN_PRODUCTOS'))          return 'No hay productos en la venta.'
  if (pgMessage.startsWith('ITEM_INVALIDO'))          return 'Hay productos con datos inválidos.'
  if (pgMessage.startsWith('METODO_PAGO_INVALIDO'))   return 'El método de pago seleccionado no es válido.'
  if (pgMessage.startsWith('PRODUCTO_NO_DISPONIBLE')) return 'Uno de los productos ya no está disponible.'
  if (pgMessage.startsWith('SIN_INVENTARIO'))         return 'Uno de los productos no tiene inventario configurado.'
  if (pgMessage.startsWith('STOCK_INSUFICIENTE')) {
    const m = pgMessage.match(/STOCK_INSUFICIENTE:(.+?) disp (\d+) pedido (\d+)/)
    return m
      ? `Stock insuficiente para "${m[1].trim()}". Disponible: ${m[2]}, solicitado: ${m[3]}.`
      : 'Stock insuficiente para uno de los productos.'
  }
  return 'Error al registrar la venta.'
}

// Normaliza los items del pedido que llegan del cliente: sólo id, cantidad y
// toppings. El precio lo pone el servidor. Devuelve { items, valido }.
export function normalizarItems(productos) {
  if (!Array.isArray(productos) || productos.length === 0) {
    return { items: [], valido: false, motivo: 'SIN_PRODUCTOS' }
  }
  const items = productos.map((p) => ({
    id_producto: Number(p.id ?? p.id_producto),
    cantidad:    Number(p.cantidad),
    toppings:    Array.isArray(p.toppings)
      ? p.toppings.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [],
  }))
  const valido = items.every((i) =>
    Number.isInteger(i.id_producto) && i.id_producto > 0 &&
    Number.isInteger(i.cantidad)    && i.cantidad > 0)
  return { items, valido, motivo: valido ? null : 'ITEM_INVALIDO' }
}

// Cálculos puros del punto de venta. Espejo de la lógica del servidor
// (que es la fuente de verdad al cobrar); aquí sólo para la vista.

// Precio de una línea = base + toppings, redondeado (igual que registrar_venta).
export function precioConToppings(precioBase, preciosToppings = []) {
  const extra = preciosToppings.reduce((s, p) => s + (Number(p) || 0), 0)
  return Math.round((Number(precioBase) || 0) + extra)
}

// Total del pedido a partir de los subtotales de línea ya calculados.
export function totalPedido(items = []) {
  return items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
}

// Cambio a devolver (nunca negativo).
export function calcularCambio(pago, total) {
  return Math.max((Number(pago) || 0) - (Number(total) || 0), 0)
}

// Billetes/atajos que tiene sentido ofrecer para un total dado.
export function billetesSugeridos(total, denominaciones) {
  const minimo = Math.min(Number(total) || 0, 1000)
  return denominaciones.filter((b) => b >= minimo)
}

// ¿Se puede cobrar ya?
export function puedeCobrar({ items, metodoPago, pago, total }) {
  return items.length > 0 && !!metodoPago && (Number(pago) || 0) >= (Number(total) || 0)
}

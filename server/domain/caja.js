// Reglas puras de cierre de caja. Sin I/O.

// Calcula el resultado de un cierre de caja compartida.
//   montoApertura   dinero inicial registrado en la apertura
//   ventasEfectivo  total de pagos en efectivo del día (facturas no anuladas)
//   montoContado    efectivo físico contado al cerrar
export function calcularCierre({
  montoApertura,
  ventasEfectivo,
  montoContado,
}) {
  const apertura = Number(montoApertura) || 0;
  const ventas = Number(ventasEfectivo) || 0;
  const contado = Number(montoContado) || 0;
  const esperado = apertura + ventas;
  const diferencia = contado - esperado;
  return {
    monto_apertura: apertura,
    total_ventas_efectivo: ventas,
    monto_esperado: esperado,
    monto_cierre: contado,
    diferencia,
    estado:
      diferencia === 0 ? "exacto" : diferencia > 0 ? "sobrante" : "faltante",
  };
}

// Suma los pagos en efectivo de una lista de facturas (con sus pagos embebidos).
export function totalEfectivo(facturas = []) {
  let total = 0;
  for (const f of facturas) {
    if (f.anulada) continue;
    for (const p of f.facturas_pagos ?? []) {
      if (p.metodos_pago?.nombre_metodo?.toLowerCase() === "efectivo") {
        total += Number(p.monto_pagado) || 0;
      }
    }
  }
  return total;
}

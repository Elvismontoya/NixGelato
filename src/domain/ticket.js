// Desglose fiscal del recibo (documento equivalente, régimen responsable de IVA).
export const IVA_PORCENTAJE = 19; // tarifa general Colombia

// El total YA incluye IVA. Devuelve la base gravable y el valor del IVA.
export function desglosarIVA(total, tarifa = IVA_PORCENTAJE) {
  const t = Number(total) || 0;
  const base = t / (1 + tarifa / 100);
  return { base, iva: t - base };
}

// Desglose fiscal de una venta. Usa los valores YA calculados por la BD
// (`total_iva` / `total_base`, con IVA por producto) cuando son coherentes con
// el total; si no (facturas anteriores a v10, ticket sin datos), cae al cálculo
// global con una única tarifa.
export function desglosarVenta(venta, tarifaGlobal = IVA_PORCENTAJE) {
  const total = Number(venta?.total ?? venta?.total_neto) || 0;
  const iva = Number(venta?.total_iva) || 0;
  const base = Number(venta?.total_base) || 0;
  // Autoritativo si base+iva reconstruye el total (incluye ventas 100% exentas,
  // donde iva = 0 pero base = total). base === 0 delata una factura pre-v10.
  if (base > 0 && Math.abs(base + iva - total) <= 1) {
    return { base, iva, tarifa: null }; // tarifa null => puede haber varias
  }
  const d = desglosarIVA(total, tarifaGlobal);
  return { base: d.base, iva: d.iva, tarifa: tarifaGlobal };
}

// Formato monetario colombiano. Antes estaba duplicado en ~7 archivos.
// `Number(n) || 0` (no `Number(n || 0)`) para que un valor no numérico → 0.
export function money(n) {
  return (Number(n) || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
  });
}

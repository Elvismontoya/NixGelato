// Formato monetario colombiano para descripciones de auditoría y mensajes.
export function formatoCOP(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

// Toppings: sólo lectura, sin reglas. Factory por consistencia con el resto.
export function crearToppingsService({ toppingsRepo }) {
  return {
    listar: () => toppingsRepo.listActive(),
  }
}

// Puerto de tiempo. En producción usa el reloj real; en test se puede
// sustituir por uno fijo para hacer deterministas los cálculos que
// dependen de "hoy" (cierre de caja, ingresos del día).
import { fechaHoyCol } from '../lib/fecha.js'

export const clock = {
  hoyColombia: () => fechaHoyCol(),
  ahoraISO:    () => new Date().toISOString(),
}

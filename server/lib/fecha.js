const COL_TZ = 'America/Bogota'

// Fecha de hoy (YYYY-MM-DD) en la zona horaria de Colombia.
export function fechaHoyCol() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

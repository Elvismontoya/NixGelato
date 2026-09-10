// Envuelve un handler async para que cualquier rechazo llegue al
// errorHandler global vía next(err), sin try/catch en cada ruta.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

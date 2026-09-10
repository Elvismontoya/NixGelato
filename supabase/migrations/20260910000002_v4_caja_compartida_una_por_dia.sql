-- ============================================================
-- MIGRACIÓN v4: Modelo definitivo de caja = CAJA COMPARTIDA
-- (una sola caja abierta por día; coincide con backend, UI y README).
-- Reemplaza el índice por-empleado introducido en la v2.
-- El índice parcial conserva filas históricas duplicadas ya cerradas.
-- ============================================================

DROP INDEX IF EXISTS public.idx_apertura_unica_por_empleado_dia;

CREATE UNIQUE INDEX IF NOT EXISTS idx_apertura_abierta_unica_por_dia
  ON public.aperturas_caja (fecha)
  WHERE estado = 'abierta';

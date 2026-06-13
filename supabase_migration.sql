-- ============================================================
-- MIGRACIÓN v2: Anulación de ventas + Multi-caja
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ── 1) ANULAR VENTAS ────────────────────────────────────────
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
  ADD COLUMN IF NOT EXISTS id_empleado_anula INTEGER REFERENCES public.empleados(id_empleado);

CREATE INDEX IF NOT EXISTS idx_facturas_anulada ON public.facturas (anulada);

-- Función para revertir stock al anular una venta
CREATE OR REPLACE FUNCTION revertir_stock(id_prod INTEGER, cantidad_devuelta INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventario
  SET stock_actual = stock_actual + cantidad_devuelta,
      ultima_actualizacion = NOW()
  WHERE id_producto = id_prod;
END;
$$;

-- ── 2) MULTI-CAJA ────────────────────────────────────────────
-- Quitar restricción de una sola apertura por día (global)
ALTER TABLE public.aperturas_caja
  DROP CONSTRAINT IF EXISTS aperturas_caja_fecha_estado_key;

-- Nueva restricción: un empleado solo puede tener UNA caja abierta por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_apertura_unica_por_empleado_dia
  ON public.aperturas_caja (fecha, id_empleado)
  WHERE estado = 'abierta';

-- Actualizar función existe_apertura_hoy para filtrar por empleado
CREATE OR REPLACE FUNCTION existe_apertura_hoy(p_id_empleado INTEGER DEFAULT NULL)
RETURNS TABLE(id_apertura INT, monto_apertura NUMERIC, fecha_hora_apertura TIMESTAMP, id_empleado INT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id_apertura, monto_apertura, fecha_hora_apertura, id_empleado
  FROM public.aperturas_caja
  WHERE fecha = (NOW() AT TIME ZONE 'America/Bogota')::DATE
    AND estado = 'abierta'
    AND (p_id_empleado IS NULL OR id_empleado = p_id_empleado)
  LIMIT 1;
$$;
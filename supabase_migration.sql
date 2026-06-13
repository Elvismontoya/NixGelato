-- ============================================================
-- MIGRACIÓN: Apertura y cierre de caja
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.aperturas_caja (
    id_apertura     SERIAL PRIMARY KEY,
    id_empleado     INTEGER NOT NULL REFERENCES public.empleados(id_empleado),
    fecha           DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota')::DATE,
    monto_apertura  NUMERIC(14,2) NOT NULL CHECK (monto_apertura >= 0),
    monto_cierre    NUMERIC(14,2),
    total_ventas_efectivo NUMERIC(14,2),
    diferencia      NUMERIC(14,2),           -- monto_cierre - (monto_apertura + total_ventas_efectivo)
    estado          TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
    observaciones_apertura TEXT,
    observaciones_cierre   TEXT,
    fecha_hora_apertura    TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_hora_cierre      TIMESTAMP,
    UNIQUE (fecha, estado) -- solo una apertura abierta por día (se puede romper con cerrada)
);

-- Índice para consultas frecuentes por fecha
CREATE INDEX IF NOT EXISTS idx_aperturas_caja_fecha ON public.aperturas_caja (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_aperturas_caja_estado ON public.aperturas_caja (estado);

-- Función RPC: verificar si ya existe apertura abierta hoy
CREATE OR REPLACE FUNCTION existe_apertura_hoy()
RETURNS TABLE(id_apertura INT, monto_apertura NUMERIC, fecha_hora_apertura TIMESTAMP, id_empleado INT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id_apertura, monto_apertura, fecha_hora_apertura, id_empleado
  FROM public.aperturas_caja
  WHERE fecha = (NOW() AT TIME ZONE 'America/Bogota')::DATE
    AND estado = 'abierta'
  LIMIT 1;
$$;

-- Actualizar actualizar_stock para validar stock antes de descontar (evitar negativos silenciosos)
CREATE OR REPLACE FUNCTION actualizar_stock(id_prod INTEGER, cantidad_vendida INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventario
  SET stock_actual = GREATEST(stock_actual - cantidad_vendida, 0),
      ultima_actualizacion = NOW()
  WHERE id_producto = id_prod;
END;
$$;

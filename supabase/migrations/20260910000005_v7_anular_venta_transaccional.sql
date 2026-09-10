-- ============================================================
-- MIGRACIÓN v7: Anulación de venta ATÓMICA (frontera transaccional)
-- Reemplaza el bucle no atómico de revertir_stock + update en el backend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.anular_venta(
  p_id_factura  integer,
  p_motivo      text,
  p_id_empleado integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factura facturas%ROWTYPE;
  v_linea   RECORD;
  v_motivo  text := btrim(p_motivo);
BEGIN
  IF v_motivo IS NULL OR v_motivo = '' THEN
    RAISE EXCEPTION 'MOTIVO_REQUERIDO' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_factura FROM facturas WHERE id_factura = p_id_factura FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FACTURA_NO_EXISTE' USING ERRCODE = 'P0001';
  END IF;
  IF v_factura.anulada THEN
    RAISE EXCEPTION 'YA_ANULADA' USING ERRCODE = 'P0001';
  END IF;

  FOR v_linea IN
    SELECT id_producto, cantidad FROM productos_facturas WHERE id_factura = p_id_factura
  LOOP
    UPDATE inventario
    SET stock_actual = stock_actual + v_linea.cantidad,
        ultima_actualizacion = now()
    WHERE id_producto = v_linea.id_producto;
  END LOOP;

  UPDATE facturas
  SET anulada = true, fecha_anulacion = now(),
      motivo_anulacion = v_motivo, id_empleado_anula = p_id_empleado
  WHERE id_factura = p_id_factura;

  RETURN jsonb_build_object('total_neto', v_factura.total_neto);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_venta(integer, text, integer) FROM PUBLIC, anon, authenticated;

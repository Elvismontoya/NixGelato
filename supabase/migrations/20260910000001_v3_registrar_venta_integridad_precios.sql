-- ============================================================
-- MIGRACIÓN v3: Venta transaccional + integridad de precios
-- ============================================================

-- Snapshot de toppings aplicados por línea de venta
ALTER TABLE public.productos_facturas
  ADD COLUMN IF NOT EXISTS toppings JSONB;

-- registrar_venta: registra una venta completa de forma ATÓMICA.
-- - Recalcula precios desde la BD (no confía en el cliente).
-- - Valida producto y toppings activos.
-- - Descuenta stock con bloqueo de fila (evita sobreventa concurrente).
-- - Inserta factura + detalle + pago en una sola transacción.
-- Devuelve: { id_factura, total }
CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_id_empleado integer,
  p_cliente     text,
  p_metodo_pago text,
  p_items       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item             jsonb;
  v_id_producto      integer;
  v_cantidad         integer;
  v_topping_ids      integer[];
  v_precio_producto  numeric;
  v_nombre_producto  text;
  v_precio_toppings  numeric;
  v_toppings_json    jsonb;
  v_precio_unitario  numeric;
  v_subtotal_linea   numeric;
  v_total            numeric := 0;
  v_id_factura       integer;
  v_id_metodo        integer;
  v_stock            integer;
  v_cliente          text := NULLIF(btrim(p_cliente), '');
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'SIN_PRODUCTOS' USING ERRCODE = 'P0001';
  END IF;

  SELECT id_metodo INTO v_id_metodo
  FROM metodos_pago
  WHERE lower(nombre_metodo) = lower(p_metodo_pago) AND activo = true;
  IF v_id_metodo IS NULL THEN
    RAISE EXCEPTION 'METODO_PAGO_INVALIDO:%', p_metodo_pago USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO facturas (fecha_hora, id_empleado, total_bruto, descuento_total, total_neto, cliente, observaciones)
  VALUES (now(), p_id_empleado, 0, 0, 0, v_cliente, v_cliente)
  RETURNING id_factura INTO v_id_factura;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_id_producto := NULLIF(v_item->>'id_producto', '')::integer;
    v_cantidad    := NULLIF(v_item->>'cantidad', '')::integer;

    IF v_id_producto IS NULL OR v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'ITEM_INVALIDO' USING ERRCODE = 'P0001';
    END IF;

    SELECT precio_venta_unitario, nombre_producto
      INTO v_precio_producto, v_nombre_producto
    FROM productos
    WHERE id_producto = v_id_producto AND activo = true;
    IF v_precio_producto IS NULL THEN
      RAISE EXCEPTION 'PRODUCTO_NO_DISPONIBLE:%', v_id_producto USING ERRCODE = 'P0001';
    END IF;

    v_topping_ids := COALESCE((
      SELECT array_agg(t::integer)
      FROM jsonb_array_elements_text(COALESCE(v_item->'toppings', '[]'::jsonb)) AS t
    ), '{}');

    v_precio_toppings := 0;
    v_toppings_json   := '[]'::jsonb;
    IF array_length(v_topping_ids, 1) IS NOT NULL THEN
      SELECT COALESCE(sum(precio), 0),
             COALESCE(jsonb_agg(jsonb_build_object(
               'id_topping', id_topping, 'nombre', nombre_topping, 'precio', precio)), '[]'::jsonb)
        INTO v_precio_toppings, v_toppings_json
      FROM toppings
      WHERE id_topping = ANY(v_topping_ids) AND activo = true;
    END IF;

    v_precio_unitario := round(v_precio_producto + v_precio_toppings);
    v_subtotal_linea  := v_precio_unitario * v_cantidad;
    v_total           := v_total + v_subtotal_linea;

    SELECT stock_actual INTO v_stock
    FROM inventario
    WHERE id_producto = v_id_producto
    FOR UPDATE;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'SIN_INVENTARIO:%', v_id_producto USING ERRCODE = 'P0001';
    END IF;
    IF v_stock < v_cantidad THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE:% disp % pedido %', v_nombre_producto, v_stock, v_cantidad USING ERRCODE = 'P0001';
    END IF;

    UPDATE inventario
    SET stock_actual = stock_actual - v_cantidad,
        ultima_actualizacion = now()
    WHERE id_producto = v_id_producto;

    INSERT INTO productos_facturas
      (id_factura, id_producto, cantidad, precio_unitario_venta, subtotal_linea, toppings)
    VALUES
      (v_id_factura, v_id_producto, v_cantidad, v_precio_unitario, v_subtotal_linea,
       CASE WHEN v_toppings_json = '[]'::jsonb THEN NULL ELSE v_toppings_json END);
  END LOOP;

  UPDATE facturas
  SET total_bruto = v_total, total_neto = v_total
  WHERE id_factura = v_id_factura;

  INSERT INTO facturas_pagos (id_factura, id_metodo, monto_pagado)
  VALUES (v_id_factura, v_id_metodo, v_total);

  RETURN jsonb_build_object('id_factura', v_id_factura, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_venta(integer, text, text, jsonb) FROM anon, authenticated;

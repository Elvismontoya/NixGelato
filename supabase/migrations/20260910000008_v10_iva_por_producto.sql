-- ============================================================
-- MIGRACIÓN v10: IVA configurable por producto
-- Antes el IVA era un único 19% global deducido en el ticket con total/1.19.
-- Ahora cada producto lleva su `tarifa_iva` (0 = exento) y el desglose
-- (base / IVA) se guarda por línea y por factura, no se recalcula.
-- ============================================================

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS tarifa_iva numeric NOT NULL DEFAULT 19
  CHECK (tarifa_iva >= 0 AND tarifa_iva <= 100);

ALTER TABLE public.productos_facturas
  ADD COLUMN IF NOT EXISTS tarifa_iva  numeric NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS iva_linea   numeric NOT NULL DEFAULT 0;

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS total_iva  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_base numeric NOT NULL DEFAULT 0;

-- registrar_venta v2: calcula el IVA de cada línea a partir de productos.tarifa_iva
-- (el subtotal de línea YA incluye IVA) y acumula base/IVA en la factura.
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
  v_tarifa_iva       numeric;
  v_precio_toppings  numeric;
  v_toppings_json    jsonb;
  v_precio_unitario  numeric;
  v_subtotal_linea   numeric;
  v_iva_linea        numeric;
  v_total            numeric := 0;
  v_total_iva        numeric := 0;
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

    SELECT precio_venta_unitario, nombre_producto, tarifa_iva
      INTO v_precio_producto, v_nombre_producto, v_tarifa_iva
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
    -- el subtotal incluye IVA: iva = subtotal - subtotal/(1+tarifa/100)
    v_iva_linea       := round((v_subtotal_linea - v_subtotal_linea / (1 + v_tarifa_iva / 100))::numeric, 2);
    v_total           := v_total + v_subtotal_linea;
    v_total_iva       := v_total_iva + v_iva_linea;

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
      (id_factura, id_producto, cantidad, precio_unitario_venta, subtotal_linea, toppings, tarifa_iva, iva_linea)
    VALUES
      (v_id_factura, v_id_producto, v_cantidad, v_precio_unitario, v_subtotal_linea,
       CASE WHEN v_toppings_json = '[]'::jsonb THEN NULL ELSE v_toppings_json END,
       v_tarifa_iva, v_iva_linea);
  END LOOP;

  UPDATE facturas
  SET total_bruto = v_total,
      total_neto  = v_total,
      total_iva   = v_total_iva,
      total_base  = v_total - v_total_iva
  WHERE id_factura = v_id_factura;

  INSERT INTO facturas_pagos (id_factura, id_metodo, monto_pagado)
  VALUES (v_id_factura, v_id_metodo, v_total);

  RETURN jsonb_build_object(
    'id_factura', v_id_factura,
    'total', v_total,
    'total_iva', v_total_iva,
    'total_base', v_total - v_total_iva
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_venta(integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;

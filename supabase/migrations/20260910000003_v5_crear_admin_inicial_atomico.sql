-- ============================================================
-- MIGRACIÓN v5: Creación atómica del primer administrador
-- (sin condición de carrera: pg_advisory_xact_lock).
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_admin_inicial(
  p_nombres        text,
  p_apellidos      text,
  p_usuario        text,
  p_password_hash  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_rol_admin integer;
  v_id_empleado  integer;
  v_usuario      text := btrim(p_usuario);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('crear_admin_inicial'));

  SELECT id_rol INTO v_id_rol_admin
  FROM roles WHERE lower(nombre_rol) = 'admin' LIMIT 1;
  IF v_id_rol_admin IS NULL THEN
    RAISE EXCEPTION 'ROL_ADMIN_NO_EXISTE' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM empleados WHERE id_rol = v_id_rol_admin AND activo = true) THEN
    RAISE EXCEPTION 'ADMIN_YA_EXISTE' USING ERRCODE = 'P0001';
  END IF;

  IF v_usuario IS NULL OR v_usuario = '' THEN
    RAISE EXCEPTION 'USUARIO_REQUERIDO' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM empleados WHERE usuario_login = v_usuario) THEN
    RAISE EXCEPTION 'USUARIO_EN_USO' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO empleados (nombres, apellidos, usuario_login, password_hash, id_rol, activo)
  VALUES (btrim(p_nombres), btrim(p_apellidos), v_usuario, p_password_hash, v_id_rol_admin, true)
  RETURNING id_empleado INTO v_id_empleado;

  RETURN jsonb_build_object('id_empleado', v_id_empleado, 'usuario_login', v_usuario);
END;
$$;

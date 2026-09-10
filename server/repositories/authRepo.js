// Acceso a datos específicos de autenticación (RPC de bootstrap).
import { supabaseAdmin } from '../db/supabase.js'

// Llama a la función Postgres crear_admin_inicial (comprobación + inserción
// atómicas). Si la RPC lanza, se propaga un Error cuyo `message` es el texto
// de la RAISE EXCEPTION (ADMIN_YA_EXISTE, USUARIO_EN_USO, ...).
export async function crearAdminInicial({ nombres, apellidos, usuario, passwordHash }) {
  const { data, error } = await supabaseAdmin.rpc('crear_admin_inicial', {
    p_nombres:       nombres,
    p_apellidos:     apellidos,
    p_usuario:       usuario,
    p_password_hash: passwordHash,
  })
  if (error) throw new Error(error.message)
  return data
}

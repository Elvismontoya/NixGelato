// server/db/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
// Se aceptan ambos nombres por compatibilidad (SERVICE_ROLE / SERVICE_ROLE_KEY)
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error(
    '❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE (o SUPABASE_SERVICE_ROLE_KEY) en variables de entorno.'
  )
  process.exit(1)
}

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
)

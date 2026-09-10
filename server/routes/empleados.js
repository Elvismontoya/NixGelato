// Capa HTTP de empleados.
import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { crearEmpleadoSchema, actualizarEmpleadoSchema, cambiarPasswordSchema } from '../schemas/index.js'
import { empleadosService } from '../container.js'

const router = express.Router()

router.use(verifyToken, requireAdmin)

// ── GET /api/empleados/roles/lista ────────────────────────
// (antes que /:id para que la ruta no colisione)
router.get('/roles/lista', asyncHandler(async (_req, res) => {
  res.json(await empleadosService.listarRoles())
}))

// ── GET /api/empleados ─────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  res.json(await empleadosService.listar(req.query))
}))

// ── GET /api/empleados/:id ─────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await empleadosService.obtener(req.params.id))
}))

// ── POST /api/empleados ────────────────────────────────────
router.post('/', validate(crearEmpleadoSchema), asyncHandler(async (req, res) => {
  const { id_empleado } = await empleadosService.crear(req.body ?? {}, req.user.id_empleado)
  res.status(201).json({ message: 'Empleado creado correctamente', id_empleado })
}))

// ── PUT /api/empleados/:id ─────────────────────────────────
router.put('/:id', validate(actualizarEmpleadoSchema), asyncHandler(async (req, res) => {
  await empleadosService.actualizar(req.params.id, req.body ?? {}, req.user.id_empleado)
  res.json({ message: 'Empleado actualizado correctamente' })
}))

// ── PATCH /api/empleados/:id/password ─────────────────────
router.patch('/:id/password', validate(cambiarPasswordSchema), asyncHandler(async (req, res) => {
  await empleadosService.cambiarPassword(req.params.id, req.body?.password, req.user.id_empleado)
  res.json({ message: 'Contraseña actualizada correctamente' })
}))

// ── DELETE /api/empleados/:id  (soft delete) ──────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  await empleadosService.desactivar(req.params.id, req.user.id_empleado)
  res.json({ message: 'Empleado desactivado correctamente' })
}))

export default router

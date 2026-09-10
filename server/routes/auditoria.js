// Capa HTTP de auditoría.
import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { registrarAuditoriaSchema } from '../schemas/index.js'
import { auditoriaService } from '../container.js'

const router = express.Router()

// ── GET /api/auditoria ─────────────────────────────────────
router.get('/', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await auditoriaService.listar(req.query.limit))
}))

// ── POST /api/auditoria ────────────────────────────────────
router.post('/', verifyToken, validate(registrarAuditoriaSchema), asyncHandler(async (req, res) => {
  const data = await auditoriaService.registrar(req.body ?? {}, req.user.id_empleado)
  res.status(201).json({ message: 'Registro creado', data })
}))

// ── GET /api/auditoria/ingresos-hoy ───────────────────────
router.get('/ingresos-hoy', verifyToken, requireAdmin, asyncHandler(async (_req, res) => {
  res.json(await auditoriaService.ingresosHoy())
}))

export default router

// Capa HTTP de inventario.
import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ajustarStockSchema } from '../schemas/index.js'
import { inventarioService } from '../container.js'

const router = express.Router()

// GET /api/inventario
router.get('/', verifyToken, asyncHandler(async (_req, res) => {
  res.json(await inventarioService.listar())
}))

// GET /api/inventario/alertas
router.get('/alertas', verifyToken, asyncHandler(async (_req, res) => {
  res.json(await inventarioService.alertas())
}))

// GET /api/inventario/bajos
router.get('/bajos', verifyToken, asyncHandler(async (_req, res) => {
  res.json(await inventarioService.bajos())
}))

// GET /api/inventario/agotados
router.get('/agotados', verifyToken, asyncHandler(async (_req, res) => {
  res.json(await inventarioService.agotados())
}))

// PUT /api/inventario/:id — ajustar (o crear) stock
router.put('/:id', verifyToken, requireAdmin, validate(ajustarStockSchema), asyncHandler(async (req, res) => {
  const inventario = await inventarioService.ajustarStock(req.params.id, req.body ?? {}, req.user.id_empleado)
  res.json({ message: 'Inventario actualizado correctamente', inventario })
}))

export default router

// Capa HTTP de toppings.
import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { verifyToken } from '../middleware/auth.js'
import { toppingsService } from '../container.js'

const router = express.Router()

// GET /api/toppings — listar toppings activos ordenados por nombre
router.get('/', verifyToken, asyncHandler(async (_req, res) => {
  res.json(await toppingsService.listar())
}))

export default router

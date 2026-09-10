// Capa HTTP de la configuración del negocio.
import express from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { configNegocioSchema } from "../schemas/index.js";
import { configService } from "../container.js";

const router = express.Router();

// GET /api/config — cualquier usuario autenticado (lo usa el ticket).
router.get(
  "/",
  verifyToken,
  asyncHandler(async (_req, res) => {
    // Cambia poco durante una jornada; el ticket la pide en cada venta.
    res.set("Cache-Control", "private, max-age=60");
    res.json(await configService.obtener());
  }),
);

// PUT /api/config — sólo admin.
router.put(
  "/",
  verifyToken,
  requireAdmin,
  validate(configNegocioSchema),
  asyncHandler(async (req, res) => {
    const cfg = await configService.actualizar(
      req.body ?? {},
      req.user.id_empleado,
    );
    res.json({ message: "Configuración actualizada", config: cfg });
  }),
);

export default router;

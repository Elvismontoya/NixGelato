// Capa HTTP de caja.
import express from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken, requireAdmin, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { aperturaCajaSchema, cierreCajaSchema } from "../schemas/index.js";
import { cajaService } from "../container.js";

const router = express.Router();

// ── GET /api/caja/estado ───────────────────────────────────
router.get(
  "/estado",
  verifyToken,
  requireRoles("admin", "cajero"),
  asyncHandler(async (_req, res) => {
    res.json(await cajaService.estado());
  }),
);

// ── GET /api/caja/estado-todas ─────────────────────────────
router.get(
  "/estado-todas",
  verifyToken,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await cajaService.estadoTodas());
  }),
);

// ── GET /api/caja/historial ────────────────────────────────
router.get(
  "/historial",
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await cajaService.historial(req.query.limit));
  }),
);

// ── POST /api/caja/apertura ────────────────────────────────
router.post(
  "/apertura",
  verifyToken,
  requireRoles("admin", "cajero"),
  validate(aperturaCajaSchema),
  asyncHandler(async (req, res) => {
    const apertura = await cajaService.abrir(
      req.body ?? {},
      req.user.id_empleado,
    );
    res.status(201).json({ message: "Caja abierta correctamente", apertura });
  }),
);

// ── POST /api/caja/cierre ──────────────────────────────────
router.post(
  "/cierre",
  verifyToken,
  requireAdmin,
  validate(cierreCajaSchema),
  asyncHandler(async (req, res) => {
    const { resumen, cierre } = await cajaService.cerrar(
      req.body ?? {},
      req.user.id_empleado,
    );
    res.json({ message: "Caja cerrada correctamente", resumen, cierre });
  }),
);

export default router;

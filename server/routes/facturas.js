// Capa HTTP de facturas / ventas.
import express from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registrarVentaSchema, anularVentaSchema } from "../schemas/index.js";
import { facturasService } from "../container.js";

const router = express.Router();

// ── POST /api/facturas ─────────────────────────────────────
router.post(
  "/",
  verifyToken,
  validate(registrarVentaSchema),
  asyncHandler(async (req, res) => {
    const result = await facturasService.registrarVenta(
      req.body ?? {},
      req.user.id_empleado,
    );
    res
      .status(201)
      .json({ message: "Factura registrada con éxito.", ...result });
  }),
);

// ── GET /api/facturas/ingresos-por-dia ────────────────────
router.get(
  "/ingresos-por-dia",
  verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await facturasService.ingresosPorDia(req.query));
  }),
);

// ── GET /api/facturas ──────────────────────────────────────
router.get(
  "/",
  verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await facturasService.listar(req.query));
  }),
);

// ── GET /api/facturas/:id/detalle ─────────────────────────
router.get(
  "/:id/detalle",
  verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await facturasService.detalle(req.params.id));
  }),
);

// ── GET /api/facturas/metodos-pago ────────────────────────
router.get(
  "/metodos-pago",
  verifyToken,
  asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "private, max-age=300");
    res.json(await facturasService.metodosPago());
  }),
);

// ── POST /api/facturas/:id/anular ─────────────────────────
router.post(
  "/:id/anular",
  verifyToken,
  requireAdmin,
  validate(anularVentaSchema),
  asyncHandler(async (req, res) => {
    await facturasService.anular(
      req.params.id,
      req.body?.motivo,
      req.user.id_empleado,
    );
    res.json({
      message: "Venta anulada correctamente. El stock fue restaurado.",
    });
  }),
);

export default router;

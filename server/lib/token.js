import jwt from "jsonwebtoken";
import { JWT_ISSUER, JWT_AUDIENCE } from "../middleware/auth.js";

// Firma el JWT de sesión. Sólo se incluyen los claims necesarios.
export function signAuthToken({ id_empleado, usuario_login, rol }) {
  return jwt.sign({ id_empleado, usuario_login, rol }, process.env.JWT_SECRET, {
    expiresIn: "8h",
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

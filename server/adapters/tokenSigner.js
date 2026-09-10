// Puerto de firma de tokens de sesión.
import { signAuthToken } from "../lib/token.js";

export const tokenSigner = {
  sign: ({ id_empleado, usuario_login, rol }) =>
    signAuthToken({ id_empleado, usuario_login, rol }),
};

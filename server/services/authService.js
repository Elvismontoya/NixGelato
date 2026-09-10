// Reglas de negocio de autenticación. Factory: recibe repos y puertos
// (hasher, tokenSigner) por inyección → testeable con dobles, sin Supabase.
import { ApiError } from "../lib/ApiError.js";
import { validarPassword } from "../domain/password.js";

export function crearAuthService({
  empleadosRepo,
  rolesRepo,
  authRepo,
  hasher,
  tokenSigner,
}) {
  async function needsInitialAdmin() {
    const empleados = await empleadosRepo.listActiveWithRole();
    const hayAdmin = empleados.some(
      (e) => e.roles?.nombre_rol?.toLowerCase() === "admin",
    );
    return !hayAdmin;
  }

  async function login({ usuario, password }) {
    if (!usuario?.trim() || !password?.trim()) {
      throw ApiError.badRequest("Faltan credenciales");
    }

    const emp = await empleadosRepo.findByLogin(usuario.trim());
    if (!emp) throw ApiError.unauthorized("Usuario o contraseña inválidos");
    if (!emp.activo) throw ApiError.forbidden("Usuario inactivo");

    const ok = await hasher.compare(password, emp.password_hash);
    if (!ok) throw ApiError.unauthorized("Usuario o contraseña inválidos");

    const rol =
      (await rolesRepo.findNameById(emp.id_rol))?.toLowerCase() || "cajero";
    return {
      token: tokenSigner.sign({
        id_empleado: emp.id_empleado,
        usuario_login: emp.usuario_login,
        rol,
      }),
      rol,
    };
  }

  async function registerAdmin({ nombres, apellidos, usuario, password }) {
    if (
      !nombres?.trim() ||
      !apellidos?.trim() ||
      !usuario?.trim() ||
      !password?.trim()
    ) {
      throw ApiError.badRequest("Campos incompletos");
    }
    const errPass = validarPassword(password);
    if (errPass) throw ApiError.badRequest(errPass);

    const hashed = await hasher.hash(password);

    let data;
    try {
      data = await authRepo.crearAdminInicial({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        usuario: usuario.trim(),
        passwordHash: hashed,
      });
    } catch (err) {
      const msg = err.message || "";
      if (msg.startsWith("ADMIN_YA_EXISTE"))
        throw ApiError.forbidden("Ya existe un administrador registrado.");
      if (msg.startsWith("USUARIO_EN_USO"))
        throw ApiError.badRequest("El nombre de usuario ya está en uso.");
      if (msg.startsWith("USUARIO_REQUERIDO"))
        throw ApiError.badRequest("El usuario es obligatorio.");
      throw err;
    }

    return {
      token: tokenSigner.sign({
        id_empleado: data.id_empleado,
        usuario_login: data.usuario_login,
        rol: "admin",
      }),
      rol: "admin",
    };
  }

  async function getProfile(idEmpleado, fallbackRol) {
    const emp = await empleadosRepo.findByIdWithRole(idEmpleado);
    if (!emp) throw ApiError.notFound("Empleado no encontrado");
    return {
      id_empleado: emp.id_empleado,
      nombres: emp.nombres,
      apellidos: emp.apellidos,
      usuario_login: emp.usuario_login,
      rol: emp.roles?.nombre_rol || fallbackRol,
    };
  }

  return { needsInitialAdmin, login, registerAdmin, getProfile };
}

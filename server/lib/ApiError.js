// Error de negocio con código HTTP. Lo lanzan los servicios; el errorHandler
// global lo traduce a la respuesta JSON correspondiente.
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (code) this.code = code;
  }

  static badRequest(message, code) {
    return new ApiError(400, message, code);
  }
  static unauthorized(message, code) {
    return new ApiError(401, message, code);
  }
  static forbidden(message, code) {
    return new ApiError(403, message, code);
  }
  static notFound(message, code) {
    return new ApiError(404, message, code);
  }
  static conflict(message, code) {
    return new ApiError(409, message, code);
  }
}

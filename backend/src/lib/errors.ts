/**
 * Erro de aplicação com código estável e mensagem segura para o utilizador.
 * Erros técnicos internos nunca são expostos diretamente ao frontend.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message = "Pedido inválido. Verifique os dados enviados.", details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Sessão necessária. Inicie sessão para continuar.") {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Não tem permissão para esta ação.") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Recurso não encontrado.") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string) {
    return new AppError(409, "CONFLICT", message);
  }

  static tooMany(message = "Demasiados pedidos. Aguarde um momento antes de tentar novamente.") {
    return new AppError(429, "RATE_LIMITED", message);
  }

  /** Usado quando uma integração externa não está configurada ou falhou. */
  static unavailable(message: string, details?: unknown) {
    return new AppError(503, "SERVICE_UNAVAILABLE", message, details);
  }

  static internal(message = "Ocorreu um erro inesperado. Tente novamente em instantes.") {
    return new AppError(500, "INTERNAL_ERROR", message);
  }
}

/** Mensagens amigáveis para falhas de fontes académicas (§47). */
export const providerFailMessage =
  "Não foi possível consultar uma das fontes académicas. A pesquisa continuará usando outras fontes.";

/** Erro de negócio com status HTTP — tratado pelo errorHandler. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = 'APP_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Faça login para continuar.') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Você não tem permissão para esta ação.') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Recurso não encontrado.') {
    return new AppError(404, message, 'NOT_FOUND');
  }
  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT');
  }
}

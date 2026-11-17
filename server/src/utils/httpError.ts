/** Error HTTP controlado. El middleware `errorHandler` lo traduce a JSON. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (entity: string) => new HttpError(404, `${entity} no encontrado(a)`);
export const badRequest = (message: string) => new HttpError(400, message);

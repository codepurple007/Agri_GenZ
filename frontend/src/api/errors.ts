export type ApiErrorBody = { error?: string; message?: string };

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, message: string, body: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

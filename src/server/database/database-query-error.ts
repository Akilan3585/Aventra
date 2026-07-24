export class DatabaseQueryError extends Error {
  constructor(operation: string, cause: string) {
    super(`Database operation failed (${operation}): ${cause}`);
    this.name = "DatabaseQueryError";
  }
}

export type Result<TValue, TError> =
  | { ok: true; value: TValue }
  | { error: TError; ok: false };

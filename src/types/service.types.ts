export type ServiceResponse<T> = 
  | { ok: true; data: T; error?: never }
  | { ok: false; data?: never; error: string };

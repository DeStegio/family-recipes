import { ZodError } from "zod";

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export function failure(error: unknown) {
  if (error instanceof RequestError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: "Έλεγξε τα πεδία της καταχώρισης." }, 400);
  if (error instanceof SyntaxError) return json({ error: "Η καταχώριση δεν έχει έγκυρη μορφή." }, 400);
  console.error(error);
  return json({ error: "Η υπηρεσία δεν είναι διαθέσιμη. Δοκίμασε ξανά." }, 500);
}

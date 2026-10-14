import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "./errors";

// ----------------------------------------------------------------------------
//  Consistent API envelope: every route returns `{ data, error, meta? }`.
// ----------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiMeta {
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: ApiMeta;
}

/** Success envelope. */
export function apiSuccess<T>(
  data: T,
  meta?: ApiMeta,
  status = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    meta ? { data, error: null, meta } : { data, error: null },
    { status },
  );
}

/** Error envelope. */
export function apiError(
  error: string,
  status = 400,
  meta?: ApiMeta,
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    meta ? { data: null, error, meta } : { data: null, error },
    { status },
  );
}

/** Build pagination metadata from a total count and the current page window. */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Central error translator for API route `catch` blocks. Maps typed HTTP
 * errors, Zod validation failures and known Prisma errors to a clean response;
 * everything else becomes a logged 500.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<null>> {
  if (error instanceof HttpError) {
    return apiError(error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    return apiError("Datele trimise sunt invalide", 422, {
      issues: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return apiError(
          "Există deja o resursă cu aceste date (constrângere unică încălcată)",
          409,
        );
      case "P2003":
        return apiError("Referință invalidă către o resursă inexistentă", 400);
      case "P2025":
        return apiError("Resursa nu a fost găsită", 404);
      default:
        return apiError("Eroare la nivelul bazei de date", 400);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError("Interogare invalidă către baza de date", 400);
  }

  console.error("[API] Unhandled error:", error);
  return apiError("Eroare internă de server", 500);
}

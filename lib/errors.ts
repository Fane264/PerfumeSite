// Typed HTTP errors used across API routes and lib helpers. Throwing one of
// these anywhere in a request handler lets the central `handleApiError`
// translate it into a consistent `{ data: null, error }` response with the
// right status code.

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Cerere invalidă") {
    super(400, message);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Autentificare necesară") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Nu ai permisiunea de a accesa această resursă") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resursa nu a fost găsită") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict cu starea curentă a resursei") {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message = "Datele trimise nu au putut fi procesate") {
    super(422, message);
    this.name = "UnprocessableEntityError";
  }
}

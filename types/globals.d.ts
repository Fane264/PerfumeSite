// Global ambient type declarations.
//
// Augments Clerk's session claims so that `auth().sessionClaims?.metadata.role`
// is strongly typed across the app and middleware. The `role` is mirrored into
// Clerk public metadata (and the JWT) whenever a user's DB role changes so it
// can be checked at the edge without a database round-trip.

export type UserRole = "CUSTOMER" | "ADMIN";

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: UserRole;
    };
  }
}

export {};

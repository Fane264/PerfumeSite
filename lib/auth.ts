import { auth, currentUser } from "@clerk/nextjs/server";
import { UserRole, type User } from "@prisma/client";
import { db } from "./db";
import { UnauthorizedError, ForbiddenError } from "./errors";

/**
 * Resolve the Clerk `public_metadata.role` into our DB enum, defaulting to
 * CUSTOMER for anything unrecognized.
 */
function resolveRole(metadata: unknown): UserRole {
  const role = (metadata as { role?: unknown } | null | undefined)?.role;
  return role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;
}

/**
 * Lazily provision a DB user from the live Clerk identity. Covers the window
 * between sign-up and the `user.created` webhook landing, so authenticated
 * flows (cart, checkout) never 500 because the row doesn't exist yet.
 */
async function provisionUserFromClerk(userId: string): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return db.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
      role: resolveRole(clerkUser.publicMetadata),
    },
  });
}

/** The current DB user, or `null` if the request is unauthenticated. */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  return provisionUserFromClerk(userId);
}

/** The authenticated Clerk user id, or `null`. Cheap (no DB hit). */
export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/** Require an authenticated user; throws 401 otherwise. */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/** Require an authenticated ADMIN user; throws 401/403 otherwise. */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenError("Acces permis doar administratorilor");
  }
  return user;
}

import createIntlMiddleware from "next-intl/middleware";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

// ----------------------------------------------------------------------------
//  Route-protection middleware.
//
//  Role is read from the Clerk session token's `metadata.role` claim. For this
//  to be present at the edge you MUST add the following to the Clerk Dashboard
//  → Sessions → Customize session token:
//
//      { "metadata": "{{user.public_metadata}}" }
//
//  Server components / API handlers additionally re-check the role against the
//  database (`requireAdmin`), so this is the first of two layers, never the
//  only one.
// ----------------------------------------------------------------------------

const isAdminPage = createRouteMatcher(["/admin(.*)"]);
const isAdminApi = createRouteMatcher(["/api/admin(.*)"]);
// Account pages in both locales — RO (no prefix) and EN (/en/cont/*)
const isAccountPage = createRouteMatcher(["/cont(.*)", "/en/cont(.*)"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ data: null, error: message }, { status });
}

function redirectToSignIn(req: Request, pathname: string) {
  const url = new URL("/sign-in", req.url);
  url.searchParams.set("redirect_url", pathname);
  return NextResponse.redirect(url);
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;

  // Admin API — respond with JSON status codes, never a redirect.
  if (isAdminApi(req)) {
    if (!userId) return jsonError("Autentificare necesară", 401);
    if (role !== "ADMIN") return jsonError("Acces interzis", 403);
    return NextResponse.next();
  }

  // Admin pages — must be an authenticated admin (not locale-prefixed).
  if (isAdminPage(req)) {
    if (!userId) return redirectToSignIn(req, req.nextUrl.pathname);
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Account pages — must be authenticated; then fall through to intl routing.
  if (isAccountPage(req) && !userId) {
    return redirectToSignIn(req, req.nextUrl.pathname);
  }

  // Run next-intl locale routing for all shop/public routes.
  const intlRes = handleI18nRouting(req);

  // Affiliate attribution: capture `?aff=AFF-XXXX` into a 30-day cookie on first
  // touch. Never overwrite an existing code — the first affiliate wins.
  const affCode = req.nextUrl.searchParams.get("aff");
  if (
    affCode &&
    /^AFF-[A-Z0-9-]{3,24}$/i.test(affCode) &&
    !req.cookies.has("affiliate_code")
  ) {
    intlRes.cookies.set("affiliate_code", affCode.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      path: "/",
    });
  }

  return intlRes;
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets…
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|avif|woff2?|ttf|otf|map)).*)",
    // …and always run on API/TRPC routes.
    "/(api|trpc)(.*)",
  ],
};

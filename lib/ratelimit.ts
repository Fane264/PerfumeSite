import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "./env";
import { apiError } from "./api-response";

// ----------------------------------------------------------------------------
//  IP-based rate limiting backed by Upstash Redis.
//
//  Graceful degradation: when Upstash credentials are absent the limiters are
//  `null` and `enforceRateLimit` becomes a no-op, so local development and
//  preview environments run without a Redis instance.
// ----------------------------------------------------------------------------

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** General-purpose limiter: 20 requests / 10s per IP. */
export const ratelimit: Ratelimit | null = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: true,
      prefix: "ratelimit",
    })
  : null;

/** Strict limiter for abuse-prone, write-heavy endpoints: 5 requests / 60s. */
export const strictRatelimit: Ratelimit | null = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "ratelimit:strict",
    })
  : null;

/** Limiter for the (cost-bearing) AI assistant: 3 requests / 60s per IP. */
export const aiRatelimit: Ratelimit | null = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      analytics: true,
      prefix: "ratelimit:ai",
    })
  : null;

const RATE_LIMITED_MESSAGE =
  "Prea multe cereri. Încearcă din nou în câteva secunde.";

/** Best-effort client IP from the standard proxy headers. */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

/**
 * Enforce a limiter for the request's client IP. Returns a 429 `NextResponse`
 * when the caller is over budget, or `null` to let the handler proceed
 * (including when rate limiting is disabled). Never throws — a Redis hiccup
 * fails open so a transient outage can't take checkout down.
 */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  req: NextRequest,
): Promise<NextResponse | null> {
  if (!limiter) return null;
  try {
    const { success } = await limiter.limit(getClientIp(req));
    return success ? null : apiError(RATE_LIMITED_MESSAGE, 429);
  } catch (err) {
    console.error("[ratelimit] limiter failed (failing open):", err);
    return null;
  }
}

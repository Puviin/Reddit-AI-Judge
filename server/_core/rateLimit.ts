import { TRPCError } from "@trpc/server";
import type { Request } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(req: Request | undefined, scope: string): string {
  const forwarded = req?.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0];
  const ip = (forwardedIp ?? req?.ip ?? req?.socket?.remoteAddress ?? "unknown").trim();
  return `${scope}:${ip}`;
}

export type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
};

/**
 * Fixed-window in-memory rate limiter. Guards endpoints that spend money on
 * third-party AI providers against anonymous abuse. Per-process only; replace
 * with a shared store when the server runs on more than one instance.
 */
export function consumeRateLimit(
  req: Request | undefined,
  options: RateLimitOptions
): void {
  const key = clientKey(req, options.scope);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (bucket.count >= options.limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${retryAfterSec}s.`,
    });
  }

  bucket.count++;
}

// Drop expired buckets so the map cannot grow without bound.
const sweeper = setInterval(() => {
  const now = Date.now();
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}, 60_000);
sweeper.unref?.();

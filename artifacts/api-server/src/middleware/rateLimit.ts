import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Request, Response, NextFunction } from "express";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// General API rate limit: 100 requests per 10 seconds per IP
export const generalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "grailbabe:general",
});

// AI insights rate limit: 10 requests per minute per user
export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "grailbabe:ai",
});

export function rateLimitMiddleware(
  limiter: Ratelimit,
  keyFn?: (req: Request) => string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn
      ? keyFn(req)
      : (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "anonymous";
    try {
      const { success, limit, reset, remaining } = await limiter.limit(key);
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", reset);
      if (!success) {
        res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
        return;
      }
      next();
    } catch (error) {
      // Fail open — don't block requests if Redis is unavailable
      console.error("Rate limit check failed:", error);
      next();
    }
  };
}

import type { RequestHandler } from "express";
import { jwtVerify } from "jose";
import {
  ENTRA_AUDIENCES,
  ENTRA_ISSUER,
  ENTRA_TENANT_ID,
  entraJWKS,
  type EntraClaims,
} from "../lib/entraConfig";

/**
 * Soft authentication middleware. Validates the bearer token if present and
 * attaches `req.userId`, `req.userEmail`, `req.userName` on success. Never
 * rejects a request on its own — `requireAuth` enforces presence on protected
 * routes. Routes without `requireAuth` continue to work for unauthenticated
 * users (used by demo-data fallback).
 */
export function entraAuthMiddleware(): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      return next();
    }
    const token = header.slice(7).trim();
    if (!token) return next();

    try {
      const { payload } = await jwtVerify(token, entraJWKS, {
        issuer: ENTRA_ISSUER,
        audience: ENTRA_AUDIENCES,
      });
      const claims = payload as EntraClaims;

      if (claims.tid && claims.tid !== ENTRA_TENANT_ID) {
        req.log?.warn(
          { tid: claims.tid },
          "Entra token tenant id mismatch — ignoring",
        );
        return next();
      }

      const userId = claims.oid ?? claims.sub;
      if (!userId) return next();

      req.userId = userId;
      req.userEmail =
        claims.email ?? claims.emails?.[0] ?? claims.preferred_username;
      req.userName = claims.name;
    } catch (err) {
      req.log?.warn({ err }, "Entra token validation failed");
    }

    next();
  };
}

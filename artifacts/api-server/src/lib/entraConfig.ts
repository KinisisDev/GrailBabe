import { createRemoteJWKSet, type JWTPayload } from "jose";

const tenantId = process.env.ENTRA_TENANT_ID;
const clientId = process.env.ENTRA_CLIENT_ID;
const tenantSubdomain = process.env.ENTRA_TENANT_SUBDOMAIN;

if (!tenantId || !clientId || !tenantSubdomain) {
  throw new Error(
    "Missing Entra config: ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_TENANT_SUBDOMAIN must all be set",
  );
}

export const ENTRA_TENANT_ID = tenantId;
export const ENTRA_CLIENT_ID = clientId;
export const ENTRA_TENANT_SUBDOMAIN = tenantSubdomain;

export const ENTRA_AUTHORITY = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/v2.0`;
export const ENTRA_ISSUER = ENTRA_AUTHORITY;
export const ENTRA_JWKS_URI = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`;

export const ENTRA_AUDIENCES = [clientId, `api://${clientId}`];

export const entraJWKS = createRemoteJWKSet(new URL(ENTRA_JWKS_URI), {
  cacheMaxAge: 24 * 60 * 60 * 1000,
  cooldownDuration: 30 * 1000,
});

export interface EntraClaims extends JWTPayload {
  oid?: string;
  sub?: string;
  tid?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  emails?: string[];
}

import {
  PublicClientApplication,
  type Configuration,
  LogLevel,
} from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const tenantSubdomain = import.meta.env.VITE_ENTRA_TENANT_SUBDOMAIN as
  | string
  | undefined;
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE as string | undefined;

if (!tenantId || !clientId || !tenantSubdomain || !apiScope) {
  throw new Error(
    "Missing Entra config: VITE_ENTRA_TENANT_ID, VITE_ENTRA_CLIENT_ID, VITE_ENTRA_TENANT_SUBDOMAIN, VITE_ENTRA_API_SCOPE must all be set",
  );
}

export const ENTRA_API_SCOPE = apiScope;
export const ENTRA_LOGIN_SCOPES = ["openid", "profile", "email", apiScope];

const authority = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}`;

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    knownAuthorities: [`${tenantSubdomain}.ciamlogin.com`],
    redirectUri: window.location.origin + import.meta.env.BASE_URL,
    postLogoutRedirectUri: window.location.origin + import.meta.env.BASE_URL,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) {
          // eslint-disable-next-line no-console
          console.error(`[msal] ${message}`);
        } else if (level === LogLevel.Warning) {
          // eslint-disable-next-line no-console
          console.warn(`[msal] ${message}`);
        }
      },
    },
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

import { useCallback, useMemo } from "react";
import {
  useMsal,
  useIsAuthenticated,
  useAccount,
} from "@azure/msal-react";
import {
  InteractionRequiredAuthError,
  type AccountInfo,
} from "@azure/msal-browser";
import { ENTRA_API_SCOPE, ENTRA_LOGIN_SCOPES } from "./msalConfig";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string;
}

function accountToUser(account: AccountInfo | null): AuthUser | null {
  if (!account) return null;
  const claims = (account.idTokenClaims ?? {}) as Record<string, unknown>;
  const email =
    (typeof claims.email === "string" && claims.email) ||
    (Array.isArray(claims.emails) && typeof claims.emails[0] === "string"
      ? (claims.emails[0] as string)
      : null) ||
    account.username ||
    null;
  const displayName =
    (typeof claims.name === "string" && claims.name) ||
    account.name ||
    email?.split("@")[0] ||
    "Collector";
  const id =
    (typeof claims.oid === "string" && claims.oid) ||
    (typeof claims.sub === "string" && claims.sub) ||
    account.localAccountId ||
    account.homeAccountId;
  return { id, email, displayName };
}

export interface UseAuthResult {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export function useAuth(): UseAuthResult {
  const { instance, inProgress } = useMsal();
  const isSignedIn = useIsAuthenticated();
  const account = useAccount() ?? instance.getActiveAccount();

  const user = useMemo(() => accountToUser(account), [account]);

  const signIn = useCallback(async () => {
    await instance.loginRedirect({ scopes: ENTRA_LOGIN_SCOPES });
  }, [instance]);

  const signOut = useCallback(async () => {
    await instance.logoutRedirect({
      postLogoutRedirectUri:
        window.location.origin + import.meta.env.BASE_URL,
    });
  }, [instance]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const active = instance.getActiveAccount() ?? account;
    if (!active) return null;
    try {
      const result = await instance.acquireTokenSilent({
        account: active,
        scopes: [ENTRA_API_SCOPE],
      });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({ scopes: [ENTRA_API_SCOPE] });
      }
      return null;
    }
  }, [instance, account]);

  return {
    isLoaded: inProgress === "none",
    isSignedIn,
    user,
    signIn,
    signOut,
    getAccessToken,
  };
}

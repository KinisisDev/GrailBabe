import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const tenantId = process.env.EXPO_PUBLIC_ENTRA_TENANT_ID;
const clientId = process.env.EXPO_PUBLIC_ENTRA_CLIENT_ID;
const tenantSubdomain = process.env.EXPO_PUBLIC_ENTRA_TENANT_SUBDOMAIN;
const apiScope = process.env.EXPO_PUBLIC_ENTRA_API_SCOPE;

if (!tenantId || !clientId || !tenantSubdomain || !apiScope) {
  // eslint-disable-next-line no-console
  console.warn(
    "[entra] Missing EXPO_PUBLIC_ENTRA_* env vars; auth will not work.",
  );
}

const ISSUER = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/v2.0`;
const DISCOVERY_URL = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/v2.0/.well-known/openid-configuration`;
const SCOPES = ["openid", "profile", "email", "offline_access", apiScope ?? ""];

const TOKEN_KEY = "gb_entra_tokens_v1";

type StoredTokens = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number; // epoch ms
};

type Claims = Record<string, unknown>;

type ContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  signIn: (opts?: { prompt?: "create" | "login" }) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<ContextValue | null>(null);

// ---- Storage (SecureStore native / localStorage web) ----
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* noop */
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* noop */
    }
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* noop */
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* noop */
    }
  },
};

// ---- JWT claim decoding (no signature verification — server validates) ----
function decodeClaims(jwt: string | null): Claims {
  if (!jwt) return {};
  const parts = jwt.split(".");
  if (parts.length < 2) return {};
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).Buffer?.from(padded, "base64").toString("binary");
    if (!decoded) return {};
    const utf8 = decodeURIComponent(
      decoded
        .split("")
        .map((c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(utf8) as Claims;
  } catch {
    return {};
  }
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function pickIdentity(claims: Claims): {
  userId: string | null;
  email: string | null;
  displayName: string | null;
} {
  const userId = asString(claims.oid) ?? asString(claims.sub);
  const email =
    asString(claims.email) ??
    (Array.isArray(claims.emails) && typeof claims.emails[0] === "string"
      ? (claims.emails[0] as string)
      : null) ??
    asString(claims.preferred_username);
  const displayName =
    asString(claims.name) ?? (email ? email.split("@")[0] : null);
  return { userId, email, displayName };
}

// ---- Provider ----
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const refreshingRef = useRef<Promise<StoredTokens | null> | null>(null);

  const discovery = AuthSession.useAutoDiscovery(ISSUER);

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "grailbabe",
        path: "auth/callback",
      }),
    [],
  );

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? "",
      scopes: SCOPES,
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery,
  );

  // Hydrate tokens from storage on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await storage.get(TOKEN_KEY);
      if (cancelled) return;
      if (raw) {
        try {
          setTokens(JSON.parse(raw) as StoredTokens);
        } catch {
          /* noop */
        }
      }
      setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: StoredTokens | null) => {
    setTokens(next);
    if (next) {
      await storage.set(TOKEN_KEY, JSON.stringify(next));
    } else {
      await storage.del(TOKEN_KEY);
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<StoredTokens | null> => {
    if (refreshingRef.current) return refreshingRef.current;
    if (!discovery || !tokens?.refreshToken || !clientId) return null;
    const promise = (async () => {
      try {
        const result = await AuthSession.refreshAsync(
          {
            clientId,
            refreshToken: tokens.refreshToken!,
            scopes: SCOPES,
          },
          discovery,
        );
        const next: StoredTokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken ?? tokens.refreshToken,
          idToken: result.idToken ?? tokens.idToken,
          expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
        };
        await persist(next);
        return next;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[entra] refresh failed", err);
        await persist(null);
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();
    refreshingRef.current = promise;
    return promise;
  }, [discovery, tokens, persist]);

  const signIn = useCallback(
    async (opts?: { prompt?: "create" | "login" }) => {
      if (!discovery || !clientId) {
        throw new Error("Auth discovery not ready");
      }
      const extraParams: Record<string, string> = {};
      if (opts?.prompt === "create") {
        extraParams.prompt = "create";
      }
      if (!request) {
        throw new Error("Auth request not initialized");
      }
      const result = await promptAsync({
        // @ts-expect-error -- extraParams accepted at runtime
        extraParams,
      });
      if (result.type !== "success" || !result.params.code) {
        if (result.type === "error") {
          throw new Error(
            result.error?.message ?? result.params.error_description ?? "Sign in failed",
          );
        }
        return;
      }
      const codeVerifier = request.codeVerifier;
      const exchanged = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: codeVerifier ? { code_verifier: codeVerifier } : undefined,
          scopes: SCOPES,
        },
        discovery,
      );
      const next: StoredTokens = {
        accessToken: exchanged.accessToken,
        refreshToken: exchanged.refreshToken ?? null,
        idToken: exchanged.idToken ?? null,
        expiresAt: Date.now() + (exchanged.expiresIn ?? 3600) * 1000,
      };
      await persist(next);
    },
    [discovery, promptAsync, redirectUri, persist, request],
  );

  const signOut = useCallback(async () => {
    const endSessionEndpoint = discovery?.endSessionEndpoint;
    await persist(null);
    if (endSessionEndpoint && Platform.OS !== "web") {
      try {
        const url = new URL(endSessionEndpoint);
        url.searchParams.set("client_id", clientId ?? "");
        url.searchParams.set("post_logout_redirect_uri", redirectUri);
        await WebBrowser.openAuthSessionAsync(url.toString(), redirectUri);
      } catch {
        /* noop */
      }
    }
  }, [discovery, redirectUri, persist]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    // Refresh 60s before expiry
    if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
    const refreshed = await refreshTokens();
    return refreshed?.accessToken ?? null;
  }, [tokens, refreshTokens]);

  const claims = useMemo(() => decodeClaims(tokens?.idToken ?? null), [tokens?.idToken]);
  const identity = useMemo(() => pickIdentity(claims), [claims]);

  const value: ContextValue = useMemo(
    () => ({
      isLoaded,
      isSignedIn: !!tokens,
      userId: identity.userId,
      email: identity.email,
      displayName: identity.displayName,
      signIn,
      signOut,
      getToken,
    }),
    [isLoaded, tokens, identity, signIn, signOut, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): ContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

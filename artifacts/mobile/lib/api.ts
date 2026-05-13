import { Platform } from "react-native";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

let configured = false;

export function getApiBaseUrl(): string | null {
  if (Platform.OS === "web") return null;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return null;
  return `https://${domain}`;
}

// React Query v5 strict types require `queryKey` in options. Orval fills it
// in at runtime, so we cast the partial options object to satisfy TS.
// Use as: `useGetMe(qopt(isSignedIn))`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const qopt = (enabled: boolean, extra: Record<string, unknown> = {}): any => ({
  query: { enabled, ...extra },
});

export function configureApi(getToken: () => Promise<string | null>) {
  if (configured) {
    setAuthTokenGetter(getToken);
    return;
  }
  configured = true;
  setBaseUrl(getApiBaseUrl());
  setAuthTokenGetter(getToken);
}
